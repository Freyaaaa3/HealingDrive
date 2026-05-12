<template>
  <div id="healing-drive-app" :class="['app-container', `mode-${appStore.runMode}`]">
    <!-- Demo调试面板（正式版移除） -->
    <DebugPanel v-if="showDebug" />
    <VisualizationPanel v-if="showDebug" />

    <!-- ==================== 主要内容区域（三段式：左留白 | 焦点 | 右留白）==================== -->
    <main class="main-content">
      <div class="stage-gutter stage-gutter--left" aria-hidden="true" />
      <div class="stage-core">
        <!-- ===== 未就绪时：初始化状态指示 ===== -->
        <div class="status-indicator" v-if="!appStore.isReady">
          <div class="status-icon" :class="{ active: appStore.isReady }">
            <span class="pulse"></span>
          </div>
          <p class="status-text">{{ appStore.getPhaseDescription() }}</p>
        </div>

        <!-- ===== 已就绪但未唤醒：待命提示 ===== -->
        <Transition name="fade">
          <div
            class="ready-notice"
            v-if="appStore.isReady && !appStore.isPanelVisible()"
          >
            <div class="ready-icon">
              <div class="icon-circle"></div>
            </div>
            <p class="ready-title">疗愈Agent 已就绪</p>
            <p class="wake-hint">说出 "<strong>{{ appStore.oemConfigState.config.wakeWord }}</strong>" 唤醒我</p>
            <p class="brand-tagline">{{ appStore.oemConfigState.config.brandTagline }}</p>
          </div>
        </Transition>
      </div>
      <div class="stage-gutter stage-gutter--right" aria-hidden="true" />
    </main>

    <!-- ==================== Module 2: 疗愈主面板（Teleport to body）==================== -->
    <HealingPanel
      :visibility="appStore.panelVisibility"
      :avatar-state="appStore.avatarAnimState"
      :show-status-text="appStore.showPanelStatusText"
      :status-text="appStore.panelStatusText"
      :show-hint-text="appStore.showHintText"
      :is-interacting="appStore.isInteracting"
      :agent-response="appStore.agentResponseText"
      :user-interim-text="appStore.userInterimText"
      @enter-complete="onPanelEntered"
      @leave-complete="onPanelLeft"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import { useAppStore } from '@/stores/appStore'
import { LifecycleManager } from '@/core/LifecycleManager'
import { AvatarAnimationController } from '@/core/AvatarAnimationController'
import { AutoExitManager } from '@/core/AutoExitManager'
import { ASREngine } from '@/services/ASREngine'
import { TTSEngine } from '@/services/TTSEngine'
import { VoiceCommandHandler } from '@/services/VoiceCommandHandler'
import { VoiceInteractionManager } from '@/services/VoiceInteractionManager'
import { EmotionRecognitionEngine } from '@/services/EmotionRecognition'
import { HealingService } from '@/services/HealingService'
import { ProfileEngine } from '@/services/ProfileEngine'
import { StyleAdapter } from '@/services/StyleAdapter'
import { DataStore } from '@/services/DataStore'
import { OEMConfig } from '@/services/OEMConfig'
import { GlobalErrorHandler } from '@/core/GlobalErrorHandler'
import { AudioPriorityManager } from '@/core/AudioPriorityManager'
import { WakeStatus, ConversationPhase, VoiceCommandType, EmotionType, ClearConfirmState } from '@/types'
import DebugPanel from './components/DebugPanel.vue'
import VisualizationPanel from './components/VisualizationPanel.vue'
import HealingPanel from './components/HealingPanel.vue'

const appStore = useAppStore()

// Demo配置
const showDebug = ref(import.meta.env.DEV)

// ==================== 核心服务实例 ====================

let lifecycleManager: LifecycleManager | null = null
let animController: AvatarAnimationController | null = null
let autoExitMgr: AutoExitManager | null = null

// Module 3 实例
let asrEngine: ASREngine | null = null
let ttsEngine: TTSEngine | null = null
let commandHandler: VoiceCommandHandler | null = null
let voiceInteraction: VoiceInteractionManager | null = null

// Module 4 实例
let emotionEngine: EmotionRecognitionEngine | null = null

// Module 5 实例
let healingService: HealingService | null = null

// Module 6 实例
let profileEngine: ProfileEngine | null = null
let styleAdapter: StyleAdapter | null = null

// Module 7 实例
let dataStore: DataStore | null = null

// Module 8 实例
let oemConfig: OEMConfig | null = null

// Module 9 实例
let globalErrorHandler: GlobalErrorHandler | null = null
let audioPriorityMgr: AudioPriorityManager | null = null

// ==================== 生命周期 ====================

onMounted(async () => {
  console.log('[App] 智能座舱疗愈Agent 初始化 (Module 1+2+3+4+5+6+7+8+9)...')
  
  // --- Module 8: 加载车企配置（最早执行，供后续模块使用） ---
  oemConfig = new OEMConfig()
  const oemState = oemConfig.init()
  appStore.setOEMConfigState(oemState)

  // --- Module 9: 初始化全局异常处理 + 音频优先级管理 ---
  globalErrorHandler = new GlobalErrorHandler()
  globalErrorHandler.installGlobalHandlers()

  // 错误日志同步到 store
  globalErrorHandler.onError(() => {
    appStore.setGlobalErrorState(globalErrorHandler!.getState())
  })

  audioPriorityMgr = new AudioPriorityManager()
  audioPriorityMgr.onChange((state) => {
    appStore.setAudioChannelState(state)
  })

  // --- Module 1: 基础初始化 ---
  lifecycleManager = new LifecycleManager(appStore)
  await lifecycleManager.startup()

  // --- Module 2: 初始化形象控制器 ---
  animController = new AvatarAnimationController()
  
  animController.onStateChange((from, to) => {
    appStore.setAvatarState(to)
  })

  // --- Module 2: 初始化自动退出管理器 ---
  autoExitMgr = new AutoExitManager()
  
  // M8: 应用车企超时时长
  const oemTimeout = oemConfig?.getConfig().autoExitTimeout
  if (oemTimeout && oemTimeout !== 30_000) {
    autoExitMgr.setTimeout(oemTimeout)
    console.log(`[App] M8: 车企超时时长 ${oemTimeout / 1000}s`)
  }

  autoExitMgr.onExit(() => {
    console.log('[App] 30秒无交互，自动收起面板')
    stopVoiceInteraction()
    animController?.hide()
    appStore.triggerAutoExit()
  })

  // --- Module 3: 初始化语音引擎 ---
  await initVoiceEngines()

  // 监听唤醒事件
  setupWakeHandler()

  // 全局实例挂载（调试用）
  ;(window as any).__HEALING_AGENT__ = {
    lifecycleManager,
    animController,
    autoExitMgr,
    store: appStore,
    // M3
    asrEngine,
    ttsEngine,
    voiceInteraction,
    // M4 新增
    emotionEngine,
    // M5 新增
    healingService,
    // M6 新增
    profileEngine,
    styleAdapter,
    // M7 新增
    dataStore,
    // M8 新增
    oemConfig,
    // M9 新增
    globalErrorHandler,
    audioPriorityMgr,
  }
})

onUnmounted(() => {
  lifecycleManager?.shutdown()
  animController?.removeAllListeners()
  autoExitMgr?.destroy()
  voiceInteraction?.destroy()
  asrEngine?.destroy()
  ttsEngine?.destroy()
  emotionEngine?.destroy()   // M4: 清理
  healingService?.destroy()   // M5: 清理
  profileEngine = null        // M6: 清理（数据已持久化到 localStorage）
  dataStore?.destroy()        // M7: 清理写入队列
  globalErrorHandler?.destroy()  // M9: 移除全局兜底
  audioPriorityMgr?.destroy()    // M9: 清理通道状态
})

// ==================== Module 3: 语音引擎初始化 ====================

async function initVoiceEngines(): Promise<void> {
  console.log('[App] 初始化语音引擎...')

  // 初始化ASR
  asrEngine = new ASREngine()
  const asrOk = asrEngine.init()
  if (!asrOk) {
    console.warn('[App] ASR初始化失败，将使用降级模式')
  }

  // 初始化TTS
  ttsEngine = new TTSEngine()
  const ttsOk = await ttsEngine.init()
  if (!ttsOk) {
    console.warn('[App] TTS初始化失败，将仅文字回复')
  }

  // M8: 应用车企TTS音色配置
  const ttsPref = oemConfig?.getTTSVoicePreference()
  if (ttsPref) {
    ttsEngine.updateConfig(ttsPref.ttsConfig)
  }

  // 初始化指令处理器
  commandHandler = new VoiceCommandHandler()

  // 初始化连续对话管理器
  emotionEngine = new EmotionRecognitionEngine()
  voiceInteraction = new VoiceInteractionManager(
    asrEngine!,
    ttsEngine!,
    commandHandler,
    emotionEngine,   // M4: 注入情绪识别引擎
  )

  // --- Module 6: 初始化增强画像引擎 ---
  profileEngine = new ProfileEngine()
  styleAdapter = new StyleAdapter()
  emotionEngine.setProfileEngine(profileEngine)

  // 初始化时加载已有画像到 store
  appStore.setEnhancedProfile(profileEngine.getProfile())
  appStore.setPersonalizedStyle(styleAdapter.adapt(profileEngine.getProfile()))

  // 画像更新回调
  profileEngine.setCallbacks({
    onProfileUpdate: (profile) => {
      appStore.setEnhancedProfile(profile)
      appStore.setPersonalizedStyle(styleAdapter!.adapt(profile))
    },
  })

  // --- Module 5: 初始化核心疗愈服务 ---
  healingService = new HealingService({
    speak: (text) => ttsEngine!.speak(text),
    stop: () => ttsEngine!.stop(),
  })

  // 注入到对话管理器
  voiceInteraction.setHealingService(healingService)

  // 疗愈服务状态同步到 store
  healingService.setCallbacks({
    onStateChange: (state) => {
      appStore.setHealingServiceState(state)
    },
    // 音乐/停车等指令的播报通过对话管理器走 TTS
    onSpeak: (text) => {
      appStore.startSpeaking(text)
      appStore.setAgentResponseText(text)
      ttsEngine!.speak(text, undefined, () => {
        appStore.backToIdle()
        appStore.setAgentResponseText('')
        // 播报完恢复对话（呼吸引导由BreathGuide自己管理）
        setTimeout(() => {
          voiceInteraction?.startListeningForInput?.()
        }, 500)
      })
    },
  })

  // --- Module 7: 初始化本地数据存储 ---
  dataStore = new DataStore()
  const dsState = dataStore.init()
  appStore.setDataStoreState(dsState)

  dataStore.setCallbacks({
    onStateChange: (state) => {
      appStore.setDataStoreState(state)
    },
    onClearPending: () => {
      appStore.setClearConfirmState(ClearConfirmState.PENDING)
      // 语音提示用户确认
      ttsEngine!.speak('确认要清除所有情绪记录吗？请回答"确认"或"取消"。')
      appStore.startSpeaking('确认要清除所有情绪记录吗？')
      appStore.setAgentResponseText('确认要清除所有情绪记录吗？请回答"确认"或"取消"。')
    },
    onClearComplete: (success) => {
      appStore.setClearConfirmState(ClearConfirmState.IDLE)
      if (success) {
        // 重置画像
        profileEngine?.reset()
        const ep = profileEngine?.getProfile()
        if (ep) {
          appStore.setEnhancedProfile(ep)
          appStore.setPersonalizedStyle(styleAdapter!.adapt(ep))
        }
        ttsEngine!.speak('所有记录已清除，恢复了默认设置。')
        appStore.startSpeaking('所有记录已清除')
        appStore.setAgentResponseText('所有记录已清除，恢复了默认设置。')
      } else {
        ttsEngine!.speak('好的，取消清除操作。')
        appStore.startSpeaking('已取消')
        appStore.setAgentResponseText('好的，取消清除操作。')
      }
      setTimeout(() => {
        appStore.backToIdle()
        appStore.setAgentResponseText('')
      }, 2000)
    },
  })

  console.log('[App] ✓ 语音引擎 + 情绪引擎 + 疗愈服务 + 画像引擎 + 数据存储 + 车企配置 + 全局异常处理初始化完成 (M3+M4+M5+M6+M7+M8+M9)')
}

// ==================== 唤醒处理逻辑 ====================

function setupWakeHandler() {
  watch(
    () => appStore.wakeStatus,
    (newStatus, oldStatus) => {
      if (newStatus === WakeStatus.DETECTED && oldStatus !== WakeStatus.DETECTED) {
        handleWakeDetected()
      }
    },
    { immediate: false }
  )
}

/**
 * 处理唤醒词被检测到
 * 启动完整语音交互流程
 */
function handleWakeDetected() {
  console.log('[App] 🎉 唤醒词检测成功！启动语音交互...')

  // M9: 音频通道被占用时拦截唤醒
  if (audioPriorityMgr && !audioPriorityMgr.canListen()) {
    console.log('[App] M9: 音频通道被占用，拦截唤醒')
    return
  }

  // 1. 显示面板
  appStore.showPanel()
  
  // 2. 形象进入待机态
  animController?.show()
  
  // 3. 启动30s自动退出计时
  autoExitMgr?.start()

  // 4. M8: 播报品牌问候语（首次唤醒）
  const oemGreeting = oemConfig?.getConfig().greetingPhrase
  if (oemGreeting && oemConfig?.isOEMMode()) {
    ttsEngine?.speak(oemGreeting, undefined, () => {
      appStore.setAgentResponseText('')
      appStore.backToIdle()
    })
    appStore.startSpeaking(oemGreeting)
    appStore.setAgentResponseText(oemGreeting)
  }

  // 5. 启动语音对话系统（Module 3 核心）
  startVoiceInteraction()
}

/**
 * 启动语音对话系统
 */
function startVoiceInteraction(): void {
  if (!voiceInteraction || !asrEngine || !ttsEngine) {
    console.error('[App] 语音引擎未就绪，无法启动对话')
    return
  }

  const started = voiceInteraction.start({
    // 用户开始说话 → 形象进入倾听态
    onUserSpeaking: () => {
      console.log('[App] 用户正在说话...')
      appStore.startListening()
      appStore.setUserInterimText('')
      autoExitMgr?.reset()   // 重置30s计时
    },

    // Agent开始回复 → 形象进入说话态 + 显示文本
    onAgentResponding: (text: string) => {
      console.log(`[App] Agent回复: "${text.substring(0, 40)}..."`)
      appStore.startSpeaking(text)
      appStore.setAgentResponseText(text)
      appStore.setUserInterimText('')
    },

    // 回复完成 → 回到待机态
    onResponseComplete: () => {
      console.log('[App] 回复播报完成，回到待机')
      appStore.backToIdle()
      appStore.setAgentResponseText('')
    },

    // 语音指令触发
    onCommandTriggered: (command: VoiceCommandType, text: string): boolean => {
      console.log(`[App] 指令触发: ${VoiceCommandType[command]} ("${text}")`)
      handleVoiceCommand(command, text)
      
      // EXIT_HEALING 由外部处理，其他由对话管理器内部处理
      return command === VoiceCommandType.EXIT_HEALING
    },

    // 对话阶段变更
    onPhaseChange: (phase: ConversationPhase) => {
      appStore.setConversationPhase(phase)
    },

    // ASR状态变更
    onAsrStatusChange: (status) => {
      appStore.setAsrStatus(status)
    },

    // TTS状态变更
    onTtsStatusChange: (status) => {
      appStore.setTtsStatus(status)
    },

    // 中间识别结果实时更新
    onInterimResult: (text: string) => {
      appStore.setUserInterimText(text)
    },

    // 请求退出疗愈模式
    onRequestExit: () => {
      console.log('[App] 收到退出请求')
      stopVoiceInteraction()
      appStore.hidePanel()
    },

    // ===== M4: 情绪识别结果回调 =====
    onEmotionResult: (result) => {
      console.log(`[App] 🧠 情绪识别完成: ${result.emotion} (${result.intensity})`)
      
      // 存储结果到store
      appStore.setEmotionResult(result)
      
      // 更新画像和历史
      const enhancedProfile = profileEngine?.getProfile()
      if (enhancedProfile) {
        appStore.setEnhancedProfile(enhancedProfile)
        appStore.setPersonalizedStyle(styleAdapter!.adapt(enhancedProfile))
      } else {
        appStore.setDriverProfile(emotionEngine?.getDriverProfile() || null)
        appStore.setEmotionHistory(emotionEngine?.getEmotionHistory() || [])
      }

      // 根据情绪类型自动切换形象动效
      appStore.applyEmotionToAvatar(result.emotion)

      // M5+M6: 自动匹配疗愈策略（传入增强画像）
      const strategy = healingService?.matchStrategy(result.emotion, result.intensity, enhancedProfile)
      if (strategy) {
        console.log(`[App] 💊 疗愈策略匹配: ${strategy.primary} (${strategy.reason})`)
      }

      // M7: 记录情绪事件到本地存储
      dataStore?.recordEmotionEvent(result)
    },

    // ===== M7: 会话结束回调 =====
    onSessionEnd: (session, emotionResult) => {
      console.log(`[App] 📦 会话结束，记录数据: ${session.turnCount}轮`)
      const strategies: string[] = []
      if (appStore.healingServiceState.currentStrategy) {
        strategies.push(appStore.healingServiceState.currentStrategy.primary)
        strategies.push(...appStore.healingServiceState.currentStrategy.optional)
      }
      dataStore?.recordSessionEnd(session, emotionResult, strategies)
    },
  })

  if (!started) {
    console.error('[App] 对话系统启动失败')
  }
}

/**
 * 处理语音指令
 * Demo版部分指令为模拟响应，后续模块接入真实服务
 */
function handleVoiceCommand(command: VoiceCommandType, text: string): void {
  // M7: 检测"清除情绪记录"语音指令
  if (/清除.*情绪.*记录|删除.*记录|清空.*数据/.test(text)) {
    console.log('[Cmd] 🗑 数据清空指令检测到')
    if (dataStore) {
      const result = dataStore.requestClear()
      console.log(`[Cmd] 清空请求: ${result.message}`)
    }
    return
  }

  // M7: 检测清空确认/取消
  if (appStore.clearConfirmState === ClearConfirmState.PENDING) {
    if (/确认|是的|对/.test(text)) {
      console.log('[Cmd] ✅ 用户确认清空')
      dataStore?.confirmClear(true)
    } else if (/取消|不要|算了|不了/.test(text)) {
      console.log('[Cmd] ❌ 用户取消清空')
      dataStore?.confirmClear(false)
    }
    return
  }

  switch (command) {
    case VoiceCommandType.EXIT_HEALING:
      // 外部已在onCommandTriggered中返回true，此处不重复处理
      break

    case VoiceCommandType.PLAY_MUSIC:
    case VoiceCommandType.STOP_MUSIC:
    case VoiceCommandType.FIND_PARKING:
    case VoiceCommandType.DEEP_BREATH:
      // M5: 以上指令已由 VoiceInteractionManager → HealingService 处理
      console.log(`[Cmd] ${VoiceCommandType[command]} → 由 HealingService 处理`)
      break

    case VoiceCommandType.EMOTION_VENT:
      console.log('[Cmd] 💭 情绪倾诉检测到')
      break

    default:
      break
  }
}

/**
 * 停止语音对话系统
 */
function stopVoiceInteraction(): void {
  voiceInteraction?.stop()
  appStore.setUserInterimText('')
  appStore.setAgentResponseText('')
  appStore.setConversationPhase(ConversationPhase.IDLE)
  appStore.setAsrStatus('idle' as any)
  appStore.setTtsStatus('idle' as any)
  console.log('[App] 语音对话已停止')
}

// ==================== 面板事件回调 ====================

function onPanelEntered() {
  appStore.onPanelEnterComplete()
  console.log('[App] 面板已完全展示')
}

function onPanelLeft() {
  appStore.onPanelLeaveComplete()
  autoExitMgr?.stop()
  stopVoiceInteraction()
  console.log('[App] 面板已完全隐藏')
}
</script>

<style lang="scss" scoped>
@use '@/styles/design-mixins' as *;

.app-container {
  width: 100vw;
  height: 100vh;
  // 通透座舱环境背景：深邃但不厚重，模拟真实座舱夜间氛围
  background:
    radial-gradient(ellipse 80% 60% at 50% 40%, rgba(123, 158, 200, 0.04) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 30% 70%, rgba(107, 168, 165, 0.03) 0%, transparent 50%),
    linear-gradient(180deg, $color-cabin-bg-dark 0%, $color-cabin-bg-mid 50%, $color-cabin-bg-dark 100%);
  color: $color-text-primary;
  font-family: $font-family-base;
  overflow: hidden;
  position: relative;

  // 全局极微妙的动态氛围层（不干扰驾驶）
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 50% 45%,
      $color-cabin-ambient-glow 0%,
      transparent 55%
    );
    animation: ambient-breathe 8s ease-in-out infinite alternate;
    pointer-events: none;
    z-index: 0;
  }

  .main-content {
    height: 100%;
    padding: clamp(1rem, 3vw, 2rem);
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, min(92vw, 520px)) minmax(0, 1fr);
    align-items: center;
    justify-items: stretch;
    box-sizing: border-box;
  }

  .stage-gutter {
    pointer-events: none;
    min-height: 0;
  }

  .stage-core {
    grid-column: 2;
    width: 100%;
    @include cabin-focus-center;
    justify-content: center;
    min-height: 0;
  }
}

// ==================== 状态指示器 ====================

.status-indicator {
  text-align: center;
  
  .status-icon {
    position: relative;
    width: 56px;
    height: 56px;
    margin: 0 auto 1.5rem;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    
    &.active {
      background: rgba(76, 175, 80, 0.10);
      border-color: rgba(76, 175, 80, 0.22);
      
      .pulse {
        background: linear-gradient(135deg, #4CAF50, #66BB6A);
      }
    }
    
    .pulse {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: linear-gradient(135deg, $color-primary-light, $color-primary);
      animation: pulse-animation 1.5s ease-in-out infinite;
    }
  }
}

.status-text {
  font-size: $font-size-status;
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
  letter-spacing: 0.02em;
}

// ==================== 就绪提示（增强品牌氛围）====================

.ready-notice {
  text-align: center;
  animation: fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1);

  .ready-icon {
    margin-bottom: 2rem;

    .icon-circle {
      width: 88px;
      height: 88px;
      margin: 0 auto;
      border-radius: 50%;
      // 多层光晕营造通透呼吸感
      background:
        radial-gradient(circle at 50% 50%, #7B9EC820 0%, transparent 65%);
      position: relative;
      animation: ready-glow 3s ease-in-out infinite alternate;

      // 内层实体核心
      &::before {
        content: '';
        position: absolute;
        inset: 18px;
        border-radius: 50%;
        background: #7B9EC830;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }

      // 最内层高亮
      &::after {
        content: '';
        position: absolute;
        inset: 32px;
        border-radius: 50%;
        background: radial-gradient(
          circle,
          rgba(255, 255, 255, 0.25) 0%,
          rgba(180, 205, 229, 0.15) 60%,
          transparent 100%
        );
      }
    }
  }
  
  .ready-title {
    font-size: $font-size-title;
    font-weight: $font-weight-medium;
    color: rgba(255, 255, 255, 0.90);
    margin: 0 0 0.75rem;
    letter-spacing: 0.06em;
  }
  
  .wake-hint {
    font-size: $font-size-hint;
    font-weight: $font-weight-normal;
    color: rgba(255, 255, 255, 0.40);
    margin: 0;
    letter-spacing: 0.03em;
    
    strong {
      color: $color-primary-light;
      font-weight: $font-weight-medium;
    }
  }

  // 品牌名/副标题
  .brand-tagline {
    margin-top: 2.5rem;
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.22);
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }
}

// ==================== 动画关键帧 ====================

@keyframes pulse-animation {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.85); }
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes ready-glow {
  from { 
    opacity: 0.6; 
    transform: scale(0.95); 
  }
  to { 
    opacity: 1; 
    transform: scale(1.05); 
  }
}

// 全局氛围呼吸（极微弱，不干扰驾驶）
@keyframes ambient-breathe {
  from { opacity: 0.5; }
  to { opacity: 1; }
}

// Vue过渡
.fade-enter-active,
.fade-leave-active {
  transition: all 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
