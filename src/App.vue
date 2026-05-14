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

        <!-- ===== 已就绪但未唤醒：待命提示 + LLM对话测试 ===== -->
        <div v-else class="ready-area">
          <Transition name="fade">
            <div
              class="ready-notice"
              v-if="!appStore.isPanelVisible()"
            >
              <div class="ready-icon">
                <div class="icon-circle"></div>
              </div>
              <p class="ready-title">疗愈Agent 已就绪</p>
              <p class="wake-hint">说出 "<strong>{{ appStore.oemConfigState.config.wakeWord }}</strong>" 或点击下方按钮唤醒</p>
              <p class="brand-tagline">{{ appStore.oemConfigState.config.brandTagline }}</p>
              <button class="start-voice-btn" @click="handleManualStart" :disabled="appStore.isPanelVisible()">
                <span class="start-voice-icon">🎙️</span>
                模拟对话开始
              </button>
            </div>
          </Transition>

          <!-- ===== 主功能：测试大模型对话 ===== -->
          <div class="llm-chat-section">
            <div class="llm-chat-header">
              <span class="llm-chat-title">AI 对话测试</span>
              <span class="llm-model-badge" :class="{ online: appStore.llmModelState.ollamaReady }">
                {{ appStore.llmModelState.currentModelId }}
              </span>
            </div>

            <!-- ===== 形象展示区（面板拉起时显示形象，收起时显示对话） ===== -->
            <div class="llm-chat-stage">
              <!-- 面板可见：显示虚拟形象 -->
              <Transition name="stage-crossfade">
                <div v-if="appStore.isPanelVisible()" class="llm-stage-avatar">
                  <AvatarDisplay :state="appStore.avatarAnimState" />
                  <!-- Agent 回复文本叠在形象下方 -->
                  <Transition name="text-fade" mode="out-in">
                    <p v-if="appStore.agentResponseText" class="llm-stage-response">
                      {{ appStore.agentResponseText }}
                    </p>
                  </Transition>
                  <button class="end-voice-btn" @click="handleManualStop" :disabled="!appStore.isPanelVisible()">
                    结束对话
                  </button>
                </div>
              </Transition>

              <!-- 面板不可见：显示对话消息列表 -->
              <Transition name="stage-crossfade">
                <div v-if="!appStore.isPanelVisible()" class="llm-chat-messages" ref="chatMessagesRef">
                  <div v-if="chatHistory.length === 0" class="llm-chat-empty">
                    <p>输入消息，测试大模型对话能力</p>
                  </div>
                  <div
                    v-for="(msg, idx) in chatHistory"
                    :key="idx"
                    class="llm-msg"
                    :class="msg.role"
                  >
                    <span class="llm-msg-role">{{ msg.role === 'user' ? '你' : 'AI' }}</span>
                    <div class="llm-msg-bubble">
                      <p>{{ msg.content }}</p>
                      <span v-if="msg.elapsed" class="llm-msg-time">{{ msg.elapsed }}ms</span>
                    </div>
                  </div>
                  <div v-if="llmLoading" class="llm-msg ai">
                    <span class="llm-msg-role">AI</span>
                    <div class="llm-msg-bubble typing">
                      <span class="typing-dot"></span>
                      <span class="typing-dot"></span>
                      <span class="typing-dot"></span>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- 输入区 -->
            <form class="llm-chat-input" @submit.prevent="sendLLMMessage">
              <input
                v-model="llmInput"
                type="text"
                :placeholder="voiceInputActive ? '正在聆听...' : '输入消息...'"
                :disabled="llmLoading || voiceInputActive"
                class="llm-input-field"
              />
              <button
                type="button"
                class="llm-mic-btn"
                :class="{ active: voiceInputActive }"
                @click="toggleVoiceInput"
                :disabled="llmLoading || appStore.isPanelVisible()"
                :title="voiceInputActive ? '停止语音输入' : '语音输入'"
              >
                <span class="mic-icon">🎤</span>
                <span v-if="voiceInputActive" class="mic-pulse"></span>
              </button>
              <button
                type="submit"
                class="llm-send-btn"
                :disabled="llmLoading || !llmInput.trim() || voiceInputActive"
              >
                {{ llmLoading ? '思考中...' : '发送' }}
              </button>
            </form>

            <p v-if="voiceInputActive" class="llm-voice-hint">聆听中... 说话后将自动发送</p>
            <p v-else class="llm-chat-hint">
              当前模型: {{ appStore.llmModelState.currentModelId }}
              <span v-if="!appStore.llmModelState.ollamaReady" class="llm-status-offline"> (Ollama未连接)</span>
            </p>
          </div>
        </div>
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
import { onMounted, onUnmounted, computed, ref, watch, nextTick } from 'vue'
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
import { ModelHub } from '@/core/ModelHub'
import { StrategyEngine } from '@/core/StrategyEngine'
import { PromptManager } from '@/services/PromptManager'
import { ContextManager } from '@/core/ContextManager'
import { WakeStatus, ConversationPhase, VoiceCommandType, EmotionType, ClearConfirmState } from '@/types'
import DebugPanel from './components/DebugPanel.vue'
import VisualizationPanel from './components/VisualizationPanel.vue'
import HealingPanel from './components/HealingPanel.vue'
import AvatarDisplay from './components/AvatarDisplay.vue'

const appStore = useAppStore()

// Demo配置
const showDebug = ref(import.meta.env.DEV)

// ==================== LLM 对话测试 ====================

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  elapsed?: number
}

const llmInput = ref('')
const llmLoading = ref(false)
const chatHistory = ref<ChatMessage[]>([])
const chatMessagesRef = ref<HTMLElement | null>(null)

// ===== LLM 测试语音对话模式 =====
const voiceInputActive = ref(false)

/** 切换语音/文字输入模式 */
function toggleVoiceInput() {
  if (voiceInputActive.value) {
    stopLLMVoiceListening()
  } else {
    startLLMVoiceListening()
  }
}

/** 启动LLM测试语音监听（仅面板收起时可用） */
function startLLMVoiceListening() {
  if (!asrEngine || appStore.isPanelVisible()) return
  voiceInputActive.value = true
  console.log('[App] 🎤 LLM语音对话已启动，等待输入...')

  asrEngine.startListening(
    (result) => handleLLMVoiceResult(result),
    (interim) => { llmInput.value = interim },
    (error) => {
      console.warn('[App] LLM语音ASR错误:', error)
      // 出错后自动恢复
      if (voiceInputActive.value) {
        setTimeout(() => startLLMVoiceListening(), 1000)
      }
    },
  )
}

/** 停止LLM测试语音监听 */
function stopLLMVoiceListening() {
  voiceInputActive.value = false
  asrEngine?.stopListening()
  llmInput.value = ''
  console.log('[App] 🎤 LLM语音对话已停止')
}

/** 处理LLM测试语音结果：填入输入框并自动发送 */
function handleLLMVoiceResult(result: import('@/types').ASRResult) {
  if (!voiceInputActive.value) return
  const text = result.text.trim()
  if (!text) return

  console.log(`[App] LLM语音识别结果: "${text}"`)
  llmInput.value = text
  // 停止监听，等待AI回复后重新启动
  asrEngine?.stopListening()
  // 自动发送
  sendLLMMessage()
}

// 面板可见时自动退出语音模式
watch(() => appStore.panelVisibility, (vis) => {
  if (vis !== 'hidden' && voiceInputActive.value) {
    stopLLMVoiceListening()
  }
})

async function sendLLMMessage() {
  const text = llmInput.value.trim()
  if (!text || llmLoading.value || !modelHub) return

  llmInput.value = ''
  chatHistory.value.push({ role: 'user', content: text })
  await scrollChatBottom()

  llmLoading.value = true
  try {
    const messages = chatHistory.value.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }))

    // 在最前面插入系统提示词
    messages.unshift({
      role: 'system',
      content: '你是小疗，智能座舱疗愈助手。回复温柔简洁，不超过80字。',
    })

    const result = await modelHub.chat({
      model: modelHub.getCurrentModelId(),
      messages,
    })

    if (result.code === 200) {
      chatHistory.value.push({
        role: 'assistant',
        content: result.content,
        elapsed: result.elapsedMs,
      })

      // Requirment 1: AI回复后触发TTS语音输出
      const responseText = result.content
      if (ttsEngine) {
        ttsEngine.speak(responseText, undefined, () => {
          // TTS播报完成 → 若处于语音对话模式则重新开始监听（等音频消散）
          if (voiceInputActive.value && !appStore.isPanelVisible()) {
            setTimeout(() => {
              asrEngine?.stopListening()
              startLLMVoiceListening()
            }, 800)
          }
        })
      }
    } else {
      chatHistory.value.push({
        role: 'assistant',
        content: `[错误] ${result.content}`,
      })
    }
  } catch (err) {
    chatHistory.value.push({
      role: 'assistant',
      content: `[异常] ${(err as Error).message}`,
    })
  } finally {
    llmLoading.value = false
    await scrollChatBottom()
  }
}

async function scrollChatBottom() {
  await nextTick()
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
  }
}

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

// Module 10 实例
let modelHub: ModelHub | null = null

// Module 11 实例
let strategyEngine: StrategyEngine | null = null
let promptManager: PromptManager | null = null

// Module 12 实例
let contextManager: ContextManager | null = null

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

  // --- Module 10: 初始化大模型调度中心 ---
  modelHub = new ModelHub()
  const llmState = await modelHub.init()
  appStore.setLLMModelState(llmState)
  modelHub.onChange((state) => {
    appStore.setLLMModelState(state)
  })

  // --- Module 11: 初始化策略引擎 + 提示词管理器 ---
  strategyEngine = new StrategyEngine()
  const strategyState = strategyEngine.init()
  appStore.setStrategyEngineState(strategyState)
  strategyEngine.onChange((state) => {
    appStore.setStrategyEngineState(state)
  })
  promptManager = new PromptManager()
  console.log('[App] M11 策略引擎&提示词管理器初始化完成')

  // --- Module 12: 初始化上下文管理器 ---
  contextManager = new ContextManager()
  console.log('[App] M12 上下文管理器初始化完成')

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
    // M10 新增
    modelHub,
    // M11 新增
    strategyEngine,
    promptManager,
    // M12 新增
    contextManager,
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
  modelHub?.destroy()            // M10: 清理回调
  strategyEngine?.destroy()      // M11: 清理缓存和回调
  contextManager?.destroy()     // M12: 清理上下文和回调
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

  // M10: 注入大模型调度中心
  voiceInteraction.setModelHub(modelHub)

  // M11: 注入策略引擎 + 提示词管理器
  voiceInteraction.setStrategyEngine(strategyEngine)
  voiceInteraction.setPromptManager(promptManager)

  // M12: 注入上下文管理器
  voiceInteraction.setContextManager(contextManager)

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
 * 手动启动模拟对话（跳过唤醒词）
 * 点击"模拟对话开始"按钮 → 拉起面板 → 直接进入监听→LLM→TTS→监听循环
 */
function handleManualStart() {
  console.log('[App] 🎙️ 手动启动模拟对话，跳过唤醒词...')
  handleWakeDetected(true)
}

/**
 * 手动结束对话
 */
function handleManualStop() {
  console.log('[App] 🔇 手动结束对话')
  stopVoiceInteraction()
  animController?.hide()
  appStore.hidePanel()
  autoExitMgr?.stop()
}

/**
 * 处理唤醒词被检测到
 * 启动完整语音交互流程
 * @param skipGreeting 是否跳过品牌问候语（手动启动时跳过）
 */
function handleWakeDetected(skipGreeting = false) {
  console.log('[App] 🎉 启动语音交互...' + (skipGreeting ? '(手动模式)' : '(唤醒词模式)'))

  // M9: 音频通道被占用时拦截唤醒
  if (audioPriorityMgr && !audioPriorityMgr.canListen()) {
    console.log('[App] M9: 音频通道被占用，拦截唤醒')
    return
  }

  // 1. 显示面板
  appStore.showPanel()
  
  // 2. 形象进入待机态
  animController?.show()
  
  // 3. 启动自动退出计时（手动模式不启动，直到用户主动结束）
  if (!skipGreeting) {
    autoExitMgr?.start()
  }

  // 4. M8: 播报品牌问候语（仅唤醒词模式，手动启动时跳过）
  if (!skipGreeting) {
    const oemGreeting = oemConfig?.getConfig().greetingPhrase
    if (oemGreeting && oemConfig?.isOEMMode()) {
      ttsEngine?.speak(oemGreeting, undefined, () => {
        appStore.setAgentResponseText('')
        appStore.backToIdle()
      })
      appStore.startSpeaking(oemGreeting)
      appStore.setAgentResponseText(oemGreeting)
    }
  }

  // 5. 启动语音对话系统（Module 3 核心）
  startVoiceInteraction()
}

/**
 * 启动语音对话系统
 */
function startVoiceInteraction(): void {
  // 防御性初始化：如果引擎未就绪，尝试即时创建（同步部分）
  if (!asrEngine) {
    asrEngine = new ASREngine()
    asrEngine.init()
    console.warn('[App] ASR引擎延迟初始化')
  }
  if (!ttsEngine) {
    ttsEngine = new TTSEngine()
    // TTS init 是异步的，这里同步创建实例即可（speak 时内部会自动初始化）
    console.warn('[App] TTS引擎延迟创建')
  }
  if (!voiceInteraction && asrEngine && ttsEngine) {
    commandHandler = commandHandler || new VoiceCommandHandler()
    emotionEngine = emotionEngine || new EmotionRecognitionEngine()
    voiceInteraction = new VoiceInteractionManager(asrEngine, ttsEngine, commandHandler, emotionEngine)
    // 补充注入
    if (modelHub) voiceInteraction.setModelHub(modelHub)
    if (strategyEngine) voiceInteraction.setStrategyEngine(strategyEngine)
    if (promptManager) voiceInteraction.setPromptManager(promptManager)
    if (contextManager) voiceInteraction.setContextManager(contextManager)
    if (healingService) voiceInteraction.setHealingService(healingService)
    console.warn('[App] VoiceInteractionManager 延迟初始化')
  }

  if (!voiceInteraction || !asrEngine || !ttsEngine) {
    console.error('[App] 语音引擎初始化失败，无法启动对话')
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

  // 模拟对话开始按钮
  .start-voice-btn {
    margin-top: 2rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 1.8rem;
    background: rgba(123, 158, 200, 0.12);
    border: 1px solid rgba(123, 158, 200, 0.22);
    border-radius: $radius-button;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.85rem;
    font-weight: $font-weight-medium;
    cursor: pointer;
    transition: all 0.25s ease;
    letter-spacing: 0.02em;

    .start-voice-icon {
      font-size: 1rem;
    }

    &:hover:not(:disabled) {
      background: rgba(123, 158, 200, 0.22);
      border-color: rgba(123, 158, 200, 0.35);
      transform: translateY(-1px);
    }

    &:active:not(:disabled) {
      transform: scale(0.97);
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }
}

// ==================== 就绪区域（含LLM对话）====================

.ready-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

// ==================== LLM 对话测试（主功能）====================

.llm-chat-section {
  width: 100%;
  max-width: 520px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: $radius-panel;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  overflow: hidden;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.15),
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.08);
}

.llm-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem 1.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.llm-chat-title {
  font-size: 0.82rem;
  font-weight: $font-weight-medium;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.04em;
}

.llm-model-badge {
  font-size: 0.68rem;
  font-weight: $font-weight-normal;
  color: rgba(255, 255, 255, 0.35);
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);

  &.online {
    color: rgba(76, 175, 80, 0.85);
    border-color: rgba(76, 175, 80, 0.2);
    background: rgba(76, 175, 80, 0.06);
  }
}

// 消息展示区 / 形象展示区（共享同一空间）
.llm-chat-stage {
  position: relative;
  min-height: 260px;
  overflow: hidden;
}

// 面板可见时：形象居中展示
.llm-stage-avatar {
  width: 100%;
  height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;

  :deep(.avatar-container) {
    transform: scale(0.85);
    opacity: 0.9;
  }
}

.llm-stage-response {
  font-size: 0.8rem;
  font-weight: $font-weight-medium;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
  padding: 0.5rem 1.2rem;
  text-align: center;
  line-height: 1.6;
  max-width: 85%;
  background: rgba(255, 255, 255, 0.35);
  border-radius: $radius-card;
}

// 结束对话按钮
.end-voice-btn {
  margin-top: 1.2rem;
  padding: 0.45rem 1.2rem;
  background: rgba(220, 80, 80, 0.12);
  border: 1px solid rgba(220, 80, 80, 0.2);
  border-radius: $radius-button;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.72rem;
  font-weight: $font-weight-medium;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(220, 80, 80, 0.22);
    border-color: rgba(220, 80, 80, 0.35);
    color: rgba(255, 255, 255, 0.85);
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

// 面板不可见时：对话消息列表
.llm-chat-messages {
  height: 260px;
  overflow-y: auto;
  padding: 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;

  &::-webkit-scrollbar {
    width: 3px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
}

.llm-chat-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;

  p {
    color: rgba(255, 255, 255, 0.2);
    font-size: 0.78rem;
    margin: 0;
    letter-spacing: 0.02em;
  }
}

// 单条消息
.llm-msg {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;

  &.user {
    flex-direction: row-reverse;
  }

  .llm-msg-role {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
    font-weight: $font-weight-medium;
    margin-top: 2px;
  }

  &.user .llm-msg-role {
    background: rgba(123, 158, 200, 0.2);
    color: rgba(123, 158, 200, 0.85);
  }

  &.ai .llm-msg-role {
    background: rgba(107, 168, 165, 0.2);
    color: rgba(107, 168, 165, 0.85);
  }

  .llm-msg-bubble {
    max-width: 78%;
    padding: 0.55rem 0.85rem;
    border-radius: 12px;
    position: relative;

    p {
      margin: 0;
      font-size: 0.8rem;
      line-height: 1.55;
      color: rgba(255, 255, 255, 0.85);
      word-break: break-word;
    }
  }

  &.user .llm-msg-bubble {
    background: rgba(123, 158, 200, 0.15);
    border: 1px solid rgba(123, 158, 200, 0.1);
    border-top-right-radius: 4px;
  }

  &.ai .llm-msg-bubble {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-top-left-radius: 4px;
  }

  .llm-msg-time {
    display: block;
    text-align: right;
    font-size: 0.58rem;
    color: rgba(255, 255, 255, 0.18);
    margin-top: 0.3rem;
  }
}

// 输入打字动画
.llm-msg-bubble.typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0.7rem 1rem;

  .typing-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(107, 168, 165, 0.5);
    animation: typing-bounce 1.2s ease-in-out infinite;

    &:nth-child(2) { animation-delay: 0.15s; }
    &:nth-child(3) { animation-delay: 0.3s; }
  }
}

@keyframes typing-bounce {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-3px); }
}

// 输入区域
.llm-chat-input {
  display: flex;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.llm-input-field {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: $radius-button;
  padding: 0.5rem 0.8rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.8rem;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.2);
  }

  &:focus {
    border-color: rgba(123, 158, 200, 0.3);
    background: rgba(255, 255, 255, 0.07);
  }

  &:disabled {
    opacity: 0.5;
  }
}

.llm-send-btn {
  flex-shrink: 0;
  padding: 0.5rem 1.2rem;
  background: rgba(123, 158, 200, 0.2);
  border: 1px solid rgba(123, 158, 200, 0.15);
  border-radius: $radius-button;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.78rem;
  font-weight: $font-weight-medium;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: rgba(123, 158, 200, 0.3);
    border-color: rgba(123, 158, 200, 0.25);
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

// 麦克风按钮
.llm-mic-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: $radius-button;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  .mic-icon {
    font-size: 1rem;
    line-height: 1;
    position: relative;
    z-index: 1;
  }

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.15);
  }

  &.active {
    background: rgba(76, 175, 80, 0.14);
    border-color: rgba(76, 175, 80, 0.28);

    .mic-pulse {
      position: absolute;
      inset: -2px;
      border-radius: inherit;
      border: 2px solid rgba(76, 175, 80, 0.35);
      animation: mic-pulse 1.5s ease-in-out infinite;
    }
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

// 语音模式提示文字
.llm-voice-hint {
  font-size: 0.65rem;
  color: rgba(76, 175, 80, 0.7);
  margin: 0;
  padding: 0.25rem 1rem 0.4rem;
  text-align: center;
  letter-spacing: 0.02em;
  animation: voice-hint-pulse 1.5s ease-in-out infinite;
}

.llm-chat-hint {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.2);
  margin: 0;
  padding: 0.4rem 1rem 0.6rem;
  text-align: center;
  letter-spacing: 0.02em;
}

.llm-status-offline {
  color: rgba(244, 67, 54, 0.7);
}

// ==================== 动画关键帧 ====================

@keyframes pulse-animation {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.85); }
}

@keyframes mic-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 0.15; transform: scale(1.2); }
}

@keyframes voice-hint-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
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

// stage 区域切换过渡（形象 ↔ 对话）
.stage-crossfade-enter-active,
.stage-crossfade-leave-active {
  transition: opacity 0.35s ease;
}
.stage-crossfade-enter-from,
.stage-crossfade-leave-to {
  opacity: 0;
}

// 文字渐变过渡
.text-fade-enter-active,
.text-fade-leave-active {
  transition: all 0.25s ease;
}
.text-fade-enter-from,
.text-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
