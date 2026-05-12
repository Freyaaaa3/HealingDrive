/**
 * 连续对话管理器（语音交互核心协调器）
 * 
 * 协调 ASR → 指令解析 → 大模型(模拟) → TTS 的完整对话流程
 * 管理30秒免唤醒连续对话、上下文记忆、自动退出联动
 */
import {
  ASRStatus, TTSStatus, ConversationPhase,
  VoiceCommandType, DialogueMessage, ConversationSession,
  ASRResult,
  // M4 新增
  EmotionResult,
} from '@/types'
import { ASREngine } from './ASREngine'
import { TTSEngine } from './TTSEngine'
import { VoiceCommandHandler } from './VoiceCommandHandler'
import { AUTO_EXIT_TIMEOUT } from '@/config/constants'
import { EmotionRecognitionEngine } from './EmotionRecognition'
import { HealingService } from './HealingService'
import { useAppStore } from '@/stores/appStore'
import { ErrorSeverity, ErrorSource } from '@/types'

/** 对话事件回调集合 */
export interface VoiceInteractionCallbacks {
  /** 用户开始说话 */
  onUserSpeaking?: () => void
  /** Agent开始回复 */
  onAgentResponding?: (text: string) => void
  /** 回复播报完成，回到倾听 */
  onResponseComplete?: () => void
  /** 指令被触发 */
  onCommandTriggered?: (command: VoiceCommandType, text: string) => boolean  // 返回true=已处理
  /** 对话阶段变更 */
  onPhaseChange?: (phase: ConversationPhase) => void
  /** ASR状态变更 */
  onAsrStatusChange?: (status: ASRStatus) => void
  /** TTS状态变更 */
  onTtsStatusChange?: (status: TTSStatus) => void
  /** 中间识别结果更新 */
  onInterimResult?: (text: string) => void
  /** 需要退出疗愈模式 */
  onRequestExit?: () => void
  // ===== M4 新增：情绪识别回调 =====
  /** 情绪识别完成（首次倾诉触发） */
  onEmotionResult?: (result: EmotionResult) => void
  // ===== M7 新增：会话结束回调 =====
  /** 会话结束（用于触发数据持久化） */
  onSessionEnd?: (session: ConversationSession, emotionResult: EmotionResult | null) => void
}

/** 大模型回复接口（后续Module接入） */
type LLMResponseGenerator = (userMessage: string, context: ConversationSession) => Promise<string>

export class VoiceInteractionManager {
  private asrEngine: ASREngine
  private ttsEngine: TTSEngine
  private commandHandler: VoiceCommandHandler
  // M4: 情绪识别引擎（可选注入）
  private emotionEngine: EmotionRecognitionEngine | null
  // M5: 核心疗愈服务（可选注入）
  private healingService: HealingService | null
  // M5: 当前情绪/画像上下文（供EmpatheticResponder使用）
  private currentEmotionResult: EmotionResult | null = null

  /** 当前对话阶段 */
  private phase: ConversationPhase = ConversationPhase.IDLE
  
  /** 当前会话 */
  private currentSession: ConversationSession | null = null

  /** 是否正在运行 */
  private isRunning: boolean = false

  /** 回调集合 */
  private callbacks: VoiceInteractionCallbacks = {}

  // ==================== Demo大模型回复（后续替换为真实LLM接入）====================

  /**
   * 默认回复生成器（Demo版：规则匹配+温柔话术）
   * 后续Module 4/5会替换为真实大模型调用
   */
  private static readonly DEMO_RESPONSES: Record<string, string[]> = {
    anger: [
      '我能感受到你现在的情绪，开车时遇到不顺心的事情确实很容易让人烦躁。',
      '深呼吸一下，我陪着你。你已经做得很好了，安全到达目的地就是最大的胜利。',
      '前面的路还很长，但我会一直在这里陪你聊聊天，让你心情好起来。',
      '没关系，想说什么都可以告诉我，我在听呢。',
    ],
    anxiety: [
      '听起来你现在有些紧张和不安，这完全是可以理解的。',
      '慢慢来，不用着急。我们可以一起做几个深呼吸来放松一下。',
      '你的感受很重要，愿意和我多说说吗？',
    ],
    tired: [
      '辛苦了，开这么久的车一定很累吧？',
      '如果觉得累了，不妨找个安全的地方休息一会儿。',
      '记得照顾好自己，安全永远是最重要的。',
    ],
    greeting: [
      '你好呀！我是小疗，很高兴能陪伴你这段旅程。有什么想聊的吗？',
      '嗨～今天路上怎么样？有什么我可以帮你的吗？',
    ],
    default: [
      '嗯嗯，我明白你的意思。还有别的事想聊聊吗？',
      '谢谢你愿意告诉我这些，我一直在这里听着呢。',
      '你说得对，我们继续聊吧～',
      '好的，我在认真听哦，请继续说。',
    ],
    exit: [
      '好的，那我就不打扰你了。需要的时候随时叫我「小疗同学」哦。',
      '好的，祝你一路平安！有需要随时唤醒我。',
    ],
    music: [
      '好的，为你播放一首舒缓的音乐，希望能让你放松一些。',
      '来了，这首音乐应该能帮你平复一下心情。',
    ],
    stop_music: [
      '好的，音乐已经停了。还有什么需要的吗？',
      '已为你停止播放。还想聊聊别的吗？',
    ],
    parking: [
      '好的，让我帮你看一下附近的停车点信息...',
      '正在查找附近停车场，稍等片刻～',  // 后续接地图服务
    ],
    breath: [
      '好呀，让我们一起做几次深呼吸放松一下吧。',
      '吸气——慢慢呼出来——再来一次——很好，感觉是不是平静了一些？',
      '跟着我的节奏：深吸4秒——屏住2秒——缓慢呼出6秒——再来一次。',
    ],
  }

  constructor(
    asrEngine: ASREngine,
    ttsEngine: TTSEngine,
    commandHandler: VoiceCommandHandler,
    emotionEngine?: EmotionRecognitionEngine,
  ) {
    this.asrEngine = asrEngine
    this.ttsEngine = ttsEngine
    this.commandHandler = commandHandler
    this.emotionEngine = emotionEngine || null
    this.healingService = null
  }

  /** 注入核心疗愈服务 (M5) */
  setHealingService(service: HealingService | null): void {
    this.healingService = service
  }

  /**
   * 启动对话系统（唤醒成功后调用）
   */
  start(callbacks?: VoiceInteractionCallbacks): boolean {
    if (this.isRunning) return true

    // M9: 检查音频通道是否被高优先级源占用
    const audioMgr = (window as any).__HEALING_AGENT__?.audioPriorityMgr
    if (audioMgr && !audioMgr.canListen()) {
      console.warn('[VoiceInteraction] 音频通道被占用，拦截对话启动')
      return false
    }

    this.callbacks = { ...this.callbacks, ...callbacks }
    this.isRunning = true

    // 初始化新会话
    this.currentSession = this.createNewSession()
    
    // M4: 重置情绪识别状态
    this.emotionEngine?.resetForNewSession()
    // M5: 重置情绪上下文
    this.currentEmotionResult = null
    
    this.setPhase(ConversationPhase.AWAITING_INPUT)
    
    console.log('[VoiceInteraction] ✓ 对话系统已启动')
    
    // 启动ASR监听用户输入
    return this.startListeningForInput()
  }

  /**
   * 停止对话系统（超时或手动退出）
   */
  stop(): void {
    if (!this.isRunning) return

    // M7: 会话结束 → 触发数据持久化
    const endedSession = this.currentSession
    const endedEmotion = this.currentEmotionResult
    if (endedSession) {
      this.callbacks.onSessionEnd?.(endedSession, endedEmotion)
    }

    this.isRunning = false
    this.asrEngine.stopListening()
    this.ttsEngine.stop()
    this.healingService?.stopAll()  // M5: 停止所有疗愈服务

    this.setPhase(ConversationPhase.IDLE)
    this.currentSession = null
    
    console.log('[VoiceInteraction] 对话系统已停止')
  }

  /**
   * 开始监听用户语音输入
   */
  startListeningForInput(): boolean {
    if (!this.isRunning) return false

    this.setPhase(ConversationPhase.AWAITING_INPUT)

    return this.asrEngine.startListening(
      // 最终结果回调
      (result: ASRResult) => this.handleUserInput(result),
      
      // 中间结果回调（实时显示）
      (interimText: string) => this.callbacks.onInterimResult?.(interimText),
      
      // 错误回调
      (error: string) => {
        console.warn(`[VoiceInteraction] ASR错误: ${error}`)
        // 错误后自动恢复倾听
        setTimeout(() => {
          if (this.isRunning && this.phase === ConversationPhase.AWAITING_INPUT) {
            this.setPhase(ConversationPhase.AWAITING_INPUT)
          }
        }, 500)
      },
      
      // 状态变更回调（透传）
      (status) => this.callbacks.onAsrStatusChange?.(status),
    )
  }

  /**
   * 处理用户输入（ASR最终结果）
   */
  private async handleUserInput(result: ASRResult): Promise<void> {
    const text = result.text.trim()
    if (!text) {
      // 空结果，恢复监听
      this.resumeListeningAfterResponse()
      return
    }

    console.log(`[VoiceInteraction] 收到用户输入: "${text}"`)

    // 1. 添加到对话历史
    this.addMessage('user', text)

    // 2. 通知UI用户在说话
    this.callbacks.onUserSpeaking?.()

    // M4: 首次倾诉触发情绪识别（仅一次/会话，不阻塞对话流程）
    this.tryEmotionRecognition(text)

    // M5: 检查是否是停止呼吸引导指令
    if (this.healingService?.isStopBreathCommand(text)) {
      this.healingService.stopBreathGuide()
      setTimeout(() => this.resumeListeningAfterResponse(), 1000)
      return
    }

    // 3. 解析语音指令
    const { command, matchedKeyword } = this.commandHandler.parse(text)

    // 4. M5: 疗愈类指令优先交给 HealingService 处理
    if (this.healingService && this.healingService.handleCommand(command, text)) {
      // HealingService 已处理（内部会通过 onSpeak 回调播报）
      // 呼吸引导类由 BreathGuide 内部 TTS 处理，不走常规回复
      if (command === VoiceCommandType.DEEP_BREATH) {
        // 呼吸引导期间暂停 ASR，引导完成或手动停止后恢复
        this.asrEngine.stopListening()
        return
      }
      setTimeout(() => this.resumeListeningAfterResponse(), 1000)
      return
    }

    // 4. 如果是指令且外部已处理 → 跳过常规回复流程
    if (command !== VoiceCommandType.UNKNOWN) {
      const handled = this.callbacks.onCommandTriggered?.(command, text)
      if (handled === true) {
        // 外部已处理（如退出、播放音乐），根据指令决定是否继续对话
        if (command === VoiceCommandType.EXIT_HEALING) {
          this.callbacks.onRequestExit?.()
          return
        }
        // 其他指令处理后恢复监听
        setTimeout(() => this.resumeListeningAfterResponse(), 1000)
        return
      }
    }

    // 5. 常规对话流程：生成回复 → TTS播报 → 恢复监听
    await this.generateAndSpeakResponse(text, command)
  }

  // ==================== M4: 情绪识别集成 ====================

  /**
   * 尝试执行情绪识别（仅首次倾诉触发，不阻塞对话）
   */
  private tryEmotionRecognition(userText: string): void {
    if (!this.emotionEngine) return
    if (this.emotionEngine.isSessionAnalyzed()) return

    console.log('[VoiceInteraction] 🧠 首次倾诉 → 触发情绪识别...')

    // 标记已分析（防止重复触发）
    this.emotionEngine.markSessionAnalyzed(true)

    // 异步执行情绪识别（不阻塞对话回复流程）
    this.emotionEngine.recognize(userText, {
      onStart: () => {
        console.log('[VoiceInteraction] 情绪识别开始...')
      },
      onComplete: (result) => {
        console.log(
          `[VoiceInteraction] 情绪结果: ${result.emotion}(${result.intensity}), ` +
          `耗时=${result.processingTimeMs}ms`
        )
        // M5: 缓存情绪结果供回复生成使用
        this.currentEmotionResult = result
        this.callbacks.onEmotionResult?.(result)
      },
      onError: (error) => {
        console.warn(`[VoiceInteraction] 情绪识别异常: ${error}`)
      },
    }).catch((err) => {
      console.warn('[VoiceInteraction] 情绪识别失败:', err)
    })
  }

  /** 注入/替换情绪引擎 */
  setEmotionEngine(engine: EmotionRecognitionEngine | null): void {
    this.emotionEngine = engine
  }

  /**
   * 生成回复并播报
   */
  private async generateAndSpeakResponse(userText: string, command: VoiceCommandType): Promise<void> {
    this.setPhase(ConversationPhase.PROCESSING)

    try {
      // 生成回复文本
      // M5: 优先使用 EmpatheticResponder（情绪感知），否则降级到原始Demo回复
      let responseText: string
      if (this.healingService) {
        responseText = this.generateEmpatheticResponse(userText, command)
      } else {
        responseText = this.generateDemoResponse(userText, command)
      }
      
      // 添加Agent回复到历史
      this.addMessage('agent', responseText)

      // 进入回复阶段
      this.setPhase(ConversationPhase.RESPONDING)
      
      // 通知UI
      this.callbacks.onAgentResponding?.(responseText)

      // TTS播报
      const speakSuccess = this.ttsEngine.speak(
        responseText,
        undefined,
        () => {
          // 播报完成 → 恢复监听
          this.callbacks.onResponseComplete?.()
          
          // 延迟一点再恢复倾听，让用户感知到"轮到自己说"
          setTimeout(() => {
            if (this.isRunning) {
              this.resumeListeningAfterResponse()
            }
          }, 300)
        },
        (status) => this.callbacks.onTtsStatusChange?.(status),
      )

      if (!speakSuccess) {
        // TTS失败，直接恢复监听
        this.callbacks.onResponseComplete?.()
        this.resumeListeningAfterResponse()
      }
    } catch (error) {
      console.error('[VoiceInteraction] 生成回复失败:', error)
      // M9: 报告到全局异常处理器
      const eh = (window as any).__HEALING_AGENT__?.globalErrorHandler
      if (eh) {
        eh.handleError('interaction', String(error), ErrorSeverity.MEDIUM, '对话管理异常，恢复倾听')
      }
      // 兜底：恢复监听
      this.resumeListeningAfterResponse()
    }
  }

  /**
   * Demo版回复生成器
   * 根据关键词匹配选择合适的温柔治愈回复
   */
  private generateDemoResponse(userText: string, command: VoiceCommandType): string {
    let category = 'default'
    const lowerText = userText.toLowerCase()

    // 根据指令类型确定回复类别
    switch (command) {
      case VoiceCommandType.EMOTION_VENT:
        if (/生气|火大|气死|愤怒|烦/.test(lowerText)) category = 'anger'
        else if (/累|疲惫|累死/.test(lowerText)) category = 'tired'
        else if (/紧张|焦虑|担心|怕/.test(lowerText)) category = 'anxiety'
        else category = 'anger'  // 默认情绪类归入anger
        break
      
      case VoiceCommandType.EXIT_HEALING:
        category = 'exit'
        break
      
      case VoiceCommandType.PLAY_MUSIC:
        category = 'music'
        break
      
      case VoiceCommandType.STOP_MUSIC:
        category = 'stop_music'
        break
      
      case VoiceCommandType.FIND_PARKING:
        category = 'parking'
        break
      
      case VoiceCommandType.DEEP_BREATH:
        category = 'breath'
        break
      
      case VoiceCommandType.UNKNOWN:
        // 闲聊判断
        if (/你好|嗨|hello|hi|在吗/.test(lowerText)) category = 'greeting'
        else category = 'default'
        break
    }

    const responses = VoiceInteractionManager.DEMO_RESPONSES[category]
                      || VoiceInteractionManager.DEMO_RESPONSES.default
    
    // 随机选一条回复（避免重复感）
    return responses[Math.floor(Math.random() * responses.length)]
  }

  /**
   * M5: 情绪感知共情回复生成器
   * 基于 M4 情绪结果 + 司机画像，通过 EmpatheticResponder 生成
   */
  private generateEmpatheticResponse(userText: string, command: VoiceCommandType): string {
    // 指令类回复走 EmpatheticResponder 的指令确认
    if (command !== VoiceCommandType.UNKNOWN && command !== VoiceCommandType.EMOTION_VENT) {
      const cmdMap: Record<string, string> = {
        [VoiceCommandType.EXIT_HEALING]: 'exit',
        [VoiceCommandType.PLAY_MUSIC]: 'music',
        [VoiceCommandType.STOP_MUSIC]: 'stop_music',
        [VoiceCommandType.FIND_PARKING]: 'parking',
        [VoiceCommandType.DEEP_BREATH]: 'breath_start',
      }
      const cmdKey = cmdMap[command]
      if (cmdKey) {
        return this.healingService!.responder.generateCommandResponse(cmdKey)
      }
    }

    // 使用 EmpatheticResponder 的情绪感知回复
    const store = useAppStore()
    return this.healingService!.responder.generate(userText, {
      emotion: this.currentEmotionResult,
      profile: store.driverProfile,
      enhancedProfile: store.enhancedProfile,
      style: store.personalizedStyle,
      oemStyle: store.oemConfigState.isLoaded ? store.oemConfigState.config.healingStyle : undefined,
    })
  }

  /**
   * 恢复监听用户输入
   */
  private resumeListeningAfterResponse(): void {
    if (!this.isRunning) return

    // 先确保TTS已停止（防止残留状态）
    if (this.ttsEngine.isCurrentlySpeaking()) {
      return
    }

    // 重启ASR监听
    if (!this.asrEngine.isActive()) {
      this.startListeningForInput()
    } else {
      this.setPhase(ConversationPhase.AWAITING_INPUT)
    }
  }

  /**
   * 打断当前Agent回复（用户说话时）
   */
  interruptSpeaking(): void {
    this.ttsEngine.stop()
    this.callbacks.onResponseComplete?.()
    console.log('[VoiceInteraction] 已打断当前回复')
  }

  // ==================== 会话管理 ====================

  /**
   * 创建新会话
   */
  private createNewSession(): ConversationSession {
    return {
      id: `session_${Date.now()}`,
      messages: [],
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      turnCount: 0,
    }
  }

  /**
   * 添加消息到当前会话
   */
  private addMessage(role: 'user' | 'agent' | 'system', content: string): void {
    if (!this.currentSession) return

    const message: DialogueMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      role,
      content,
      timestamp: Date.now(),
    }

    this.currentSession.messages.push(message)
    this.currentSession.lastActivityAt = Date.now()
    if (role === 'user') this.currentSession.turnCount++

    console.log(`[VoiceInteraction] [${role.toUpperCase()}] ${content.substring(0, 50)}...`)
  }

  /**
   * 获取当前会话
   */
  getSession(): ConversationSession | null {
    return this.currentSession
  }

  /**
   * 获取对话阶段
   */
  getPhase(): ConversationPhase {
    return this.phase
  }

  /**
   * 是否正在运行
   */
  isActive(): boolean {
    return this.isRunning
  }

  // ==================== 内部方法 ====================

  private setPhase(phase: ConversationPhase): void {
    const prev = this.phase
    this.phase = phase
    if (prev !== phase) {
      this.callbacks.onPhaseChange?.(phase)
    }
  }

  // ==================== 清理 ====================

  destroy(): void {
    this.stop()
    this.callbacks = {}
    console.log('[VoiceInteraction] 资源已释放')
  }
}
