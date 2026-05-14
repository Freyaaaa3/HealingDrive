<template>
  <div class="debug-dock" :class="{ 'debug-dock--collapsed': !debugExpanded }">
    <div class="debug-rail">
      <div class="debug-rail__top">
        <button
          type="button"
          class="debug-rail__toggle"
          :aria-expanded="debugExpanded"
          :aria-label="debugExpanded ? '向左收起调试' : '向右展开调试'"
          @click="debugExpanded = !debugExpanded"
        >
          <span v-if="!debugExpanded" class="debug-rail__chev">›</span>
          <span v-else class="debug-rail__chev">‹</span>
          <span class="debug-rail__text">调试</span>
        </button>
      </div>

      <div class="debug-rail__bottom">
        <button type="button" class="debug-rail__icon-btn" title="设置" @click="() => {}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        </button>
        <button type="button" class="debug-rail__icon-btn" title="夜间模式" @click="toggleDarkMode">
          <svg v-if="isDarkMode" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="debug-panel-wrap">
      <div class="debug-panel">
        <header class="debug-panel-header">
          <div class="debug-panel-title">
            <span class="debug-panel-badge">Demo</span>
            <h3>疗愈Agent 调试</h3>
          </div>
          <button type="button" class="debug-panel-header__collapse" aria-label="向左收起" @click="debugExpanded = false">
            收起
          </button>
        </header>

        <div class="debug-body">
          <p class="debug-zone-label">运行与语音</p>

    <!-- ===== 系统状态 ===== -->
    <section class="debug-section">
      <h4>系统状态</h4>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">初始化阶段</span>
          <span class="value">{{ appStore.initPhase }}</span>
        </div>
        <div class="info-item">
          <span class="label">运行模式</span>
          <span class="value mode-badge">{{ appStore.runMode }}</span>
        </div>
        <div class="info-item">
          <span class="label">就绪状态</span>
          <span class="value" :class="{ ready: appStore.isReady }">
            {{ appStore.isReady ? '✓ 就绪' : '✗ 未就绪' }}
          </span>
        </div>
        <div class="info-item">
          <span class="label">唤醒监听</span>
          <span class="value">{{ appStore.wakeStatus }}</span>
        </div>
      </div>
    </section>

    <!-- ===== Module 2: 面板 & 形象状态 ===== -->
    <section class="debug-section">
      <h4>🎭 面板 & 形象 (M2)</h4>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">面板可见性</span>
          <span class="value" :class="{ active: isPanelVisible }">
            {{ appStore.panelVisibility }}
          </span>
        </div>
        <div class="info-item">
          <span class="label">形象状态</span>
          <span class="value avatar-state">{{ appStore.avatarAnimState }}</span>
        </div>
        <div class="info-item">
          <span class="label">自动退出</span>
          <span class="value">{{ appStore.autoExitStatus }}</span>
        </div>
        <div class="info-item">
          <span class="label">交互中</span>
          <span class="value" :class="{ ready: appStore.isInteracting }">
            {{ appStore.isInteracting ? '是' : '否' }}
          </span>
        </div>
      </div>
      
      <!-- 面板控制按钮 -->
      <div class="panel-controls" style="margin-top: 0.5rem;">
        <button 
          @click="togglePanel" 
          class="action-btn"
          :class="{ danger: isPanelVisible }"
        >
          {{ isPanelVisible ? '收起面板' : '拉起面板' }}
        </button>
      </div>
    </section>

    <!-- ===== Module 3: 语音交互状态 (新增) ===== -->
    <section class="debug-section">
      <h4>🎤 语音交互 (M3) ⭐</h4>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">ASR状态</span>
          <span class="value asr-badge" :class="appStore.asrStatus">{{ appStore.asrStatus }}</span>
        </div>
        <div class="info-item">
          <span class="label">TTS状态</span>
          <span class="value tts-badge" :class="appStore.ttsStatus">{{ appStore.ttsStatus }}</span>
        </div>
        <div class="info-item">
          <span class="label">对话阶段</span>
          <span class="value phase-badge">{{ formatPhase(appStore.conversationPhase) }}</span>
        </div>
        <div class="info-item">
          <span class="label">音频通道</span>
          <span class="value" :class="{ ready: !appStore.audioChannelBusy, danger: appStore.audioChannelBusy }">
            {{ appStore.audioChannelBusy ? '占用中' : '空闲' }}
          </span>
        </div>
      </div>

      <!-- 实时文字显示 -->
      <div v-if="appStore.userInterimText || appStore.agentResponseText" class="live-text-display">
        <div v-if="appStore.userInterimText" class="live-user">
          <span class="live-label">🎤 用户输入:</span>
          <span class="live-content">"{{ appStore.userInterimText }}"</span>
        </div>
        <div v-if="appStore.agentResponseText" class="live-agent">
          <span class="live-label">🗣 Agent回复:</span>
          <span class="live-content">{{ appStore.agentResponseText.substring(0, 80) }}{{ appStore.agentResponseText.length > 80 ? '...' : '' }}</span>
        </div>
      </div>

      <!-- M3 操作按钮 -->
      <div class="m3-actions">
        <button @click="simulateUserInput" class="action-btn m3-btn" :disabled="!isPanelVisible || isVoiceActive">
          🎤 模拟说话
        </button>
        <button @click="testTTS" class="action-btn m3-btn secondary" :disabled="!isPanelVisible">
          🔊 测试播报
        </button>
        <button @click="stopVoiceInteraction" class="action-btn m3-btn danger" :disabled="!isVoiceActive">
          ⏹ 停止对话
        </button>
      </div>

      <!-- 支持的语音指令列表 -->
      <details class="command-list">
        <summary>支持的语音指令 (6条)</summary>
        <div class="command-items">
          <div v-for="cmd in supportedCommands" :key="cmd.type" class="command-item">
            <span class="cmd-type">{{ cmd.type.replace(/_/g, ' ') }}</span>
            <span class="cmd-desc">{{ cmd.description }}</span>
          </div>
        </div>
      </details>

      <!-- 对话历史（最近5条） -->
      <div v-if="appStore.currentSession?.messages.length" class="chat-history">
        <h5>对话历史 (最近5条)</h5>
        <div
          v-for="msg in recentMessages"
          :key="msg.id"
          class="chat-msg"
          :class="msg.role"
        >
          <span class="msg-role">{{ msg.role === 'user' ? '用户' : msg.role === 'agent' ? '小疗' : '系统' }}:</span>
          <span class="msg-content">{{ msg.content.substring(0, 60) }}</span>
        </div>
      </div>
    </section>

        <!-- ===== 权限状态 ===== -->
        <section class="debug-section">
          <h4>权限状态</h4>
          <div class="permission-list">
            <div
              v-for="perm in appStore.permissions"
              :key="perm.type"
              class="permission-item"
              :class="perm.status"
            >
              <span class="type">{{ perm.type }}</span>
              <span class="status">{{ perm.status }}</span>
            </div>
            <p v-if="appStore.permissions.length === 0" class="empty">暂无权限数据</p>
          </div>
        </section>

        <!-- ===== 资源加载 ===== -->
        <section class="debug-section">
          <h4>资源加载</h4>
          <div class="resource-list">
            <div class="resource-item" v-for="(loaded, key) in appStore.resourceState" :key="key">
              <span>{{ key }}</span>
              <span :class="{ loaded }">{{ loaded ? '✓' : '✗' }}</span>
            </div>
          </div>
        </section>

        <!-- ===== 形象动效测试 ===== -->
        <section class="debug-section">
          <h4>形象动效测试 ({{ animationStates.length }}种状态)</h4>
          <div class="avatar-test-info">
            <span class="info-tag css-tag">CSS: {{ cssStates.length }}</span>
            <span class="info-tag lottie-tag">Lottie: {{ lottieStates.length }}</span>
          </div>
          <div class="avatar-test-grid">
            <button
              v-for="animState in animationStates"
              :key="animState.id"
              @click="testAnimationState(animState)"
              class="avatar-test-btn"
              :class="{
                active: currentAnimStateId === animState.id,
                'lottie-type': !!animState.lottieFile,
                'css-type': !!animState.cssClass,
              }"
              :disabled="!isPanelVisible"
              :title="animState.description"
            >
              <span class="btn-label">{{ animState.label }}</span>
              <span v-if="animState.lottieFile" class="btn-tag">Lottie</span>
              <span v-else class="btn-tag css-badge">CSS</span>
            </button>
          </div>
          <!-- 当前动效参数详情 -->
          <div v-if="currentAnimDetail" class="anim-detail">
            <h5>当前动效参数</h5>
            <div class="detail-row">
              <span class="detail-label">ID</span>
              <span class="detail-value">{{ currentAnimDetail.id }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">类型</span>
              <span class="detail-value">{{ currentAnimDetail.lottieFile ? 'Lottie' : 'CSS' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">周期</span>
              <span class="detail-value">{{ currentAnimDetail.duration }}ms</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">缓动</span>
              <span class="detail-value">{{ currentAnimDetail.easing }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">循环</span>
              <span class="detail-value">{{ currentAnimDetail.loop ? '是' : '否' }}</span>
            </div>
            <div v-if="currentAnimDetail.cssClass" class="detail-row">
              <span class="detail-label">CSS类</span>
              <span class="detail-value code">{{ currentAnimDetail.cssClass }}</span>
            </div>
            <div v-if="currentAnimDetail.lottieFile" class="detail-row">
              <span class="detail-label">Lottie文件</span>
              <span class="detail-value code">{{ currentAnimDetail.lottieFile }}</span>
            </div>
          </div>
        </section>

        <!-- ===== Module 10: 大模型调度 ===== -->
        <section class="debug-section">
          <h4>🤖 大模型调度 (M10) ⭐</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Ollama</span>
              <span class="value" :class="{ ready: appStore.llmModelState.ollamaReady, danger: !appStore.llmModelState.ollamaReady }">
                {{ appStore.llmModelState.ollamaReady ? '就绪' : '未连接' }}
              </span>
            </div>
            <div class="info-item">
              <span class="label">当前模型</span>
              <span class="value">{{ appStore.llmModelState.currentModelId }}</span>
            </div>
            <div class="info-item">
              <span class="label">模型状态</span>
              <span class="value">{{ appStore.llmModelState.currentStatus }}</span>
            </div>
            <div class="info-item">
              <span class="label">API Keys</span>
              <span class="value">{{ configuredKeyCount }}/{{ totalApiKeyCount }}</span>
            </div>
          </div>

          <!-- 模型列表 -->
          <details class="command-list">
            <summary>模型列表 ({{ appStore.llmModelState.models.length }})</summary>
            <div class="model-list">
              <div
                v-for="model in appStore.llmModelState.models"
                :key="model.id"
                class="model-item"
                :class="{ active: model.status === 'active', unavailable: model.status === 'unavailable' }"
              >
                <div class="model-info">
                  <span class="model-name">{{ model.name }}</span>
                  <span class="model-tag" :class="model.isLocal ? 'local' : 'api'">
                    {{ model.isLocal ? '本地' : 'API' }}
                  </span>
                  <span class="model-status" :class="model.status">{{ statusLabel(model.status) }}</span>
                </div>
                <button
                  v-if="model.id !== appStore.llmModelState.currentModelId && model.status !== 'unavailable'"
                  @click="switchModel(model.id)"
                  class="action-btn model-switch-btn"
                  :disabled="isSwitchingModel"
                >
                  切换
                </button>
              </div>
            </div>
          </details>

          <!-- M10 操作按钮 -->
          <div class="m3-actions">
            <button @click="testLLMChat" class="action-btn m3-btn" :disabled="!isPanelVisible || isSwitchingModel">
              💬 测试大模型对话
            </button>
            <button @click="refreshModelList" class="action-btn m3-btn secondary">
              🔄 刷新模型列表
            </button>
          </div>
        </section>

        <!-- ===== Module 11: 疗愈策略&提示词 ===== -->
        <section class="debug-section">
          <h4>🧠 策略&提示词 (M11) ⭐</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">策略引擎</span>
              <span class="value" :class="{ ready: appStore.strategyEngineState.isReady, danger: !appStore.strategyEngineState.isReady }">
                {{ appStore.strategyEngineState.isReady ? '就绪' : '未初始化' }}
              </span>
            </div>
            <div class="info-item">
              <span class="label">情景数</span>
              <span class="value">{{ appStore.strategyEngineState.scenarioCount }}</span>
            </div>
            <div class="info-item">
              <span class="label">策略规则数</span>
              <span class="value">{{ appStore.strategyEngineState.ruleCount }}</span>
            </div>
            <div class="info-item">
              <span class="label">缓存命中率</span>
              <span class="value">{{ strategyCacheRate }}%</span>
            </div>
          </div>

          <!-- 最近匹配结果 -->
          <div class="strategy-match-info">
            <span class="label">最近匹配:</span>
            <span class="value" v-if="appStore.strategyEngineState.lastMatchReason">
              {{ appStore.strategyEngineState.lastMatchReason }}
              <template v-if="appStore.strategyEngineState.lastMatchMs">
                ({{ appStore.strategyEngineState.lastMatchMs }}ms)
              </template>
            </span>
            <span class="value muted" v-else>暂无匹配记录</span>
          </div>

          <!-- 情景列表 -->
          <details class="command-list">
            <summary>策略规则列表 ({{ appStore.strategyEngineState.ruleCount }})</summary>
            <div class="model-list" v-if="strategyRuleList.length > 0">
              <div
                v-for="rule in strategyRuleList"
                :key="rule.id"
                class="model-item"
                :class="{ active: rule.id === appStore.strategyEngineState.currentRuleId, unavailable: !rule.enabled }"
              >
                <div class="model-info">
                  <span class="model-name">{{ rule.description }}</span>
                  <span class="model-tag" :class="rule.enabled ? 'api' : 'local'">
                    {{ rule.enabled ? '启用' : '停用' }}
                  </span>
                </div>
                <span class="strategy-id">{{ rule.id }}</span>
              </div>
            </div>
          </details>

          <!-- M11 操作按钮 -->
          <div class="m3-actions">
            <button @click="testStrategyMatch" class="action-btn m3-btn">
              🧪 测试策略匹配
            </button>
            <button @click="clearStrategyCache" class="action-btn m3-btn secondary">
              🗑 清除缓存
            </button>
          </div>
        </section>

        <!-- ===== Module 12: 上下文记忆管理 ===== -->
        <section class="debug-section">
          <h4>📝 上下文记忆 (M12) ⭐</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">会话状态</span>
              <span class="value" :class="{ ready: appStore.contextManagerState?.isReady, danger: !appStore.contextManagerState?.isReady }">
                {{ appStore.contextManagerState?.isReady ? '活跃' : '空闲' }}
              </span>
            </div>
            <div class="info-item">
              <span class="label">消息总数</span>
              <span class="value">{{ appStore.contextManagerState?.messageCount || 0 }}</span>
            </div>
            <div class="info-item">
              <span class="label">对话轮次</span>
              <span class="value">{{ appStore.contextManagerState?.turnCount || 0 }}/{{ contextMaxTurns }}</span>
            </div>
            <div class="info-item">
              <span class="label">字符数</span>
              <span class="value" :class="{ danger: isContextNearLimit }">
                {{ appStore.contextManagerState?.totalChars || 0 }}/{{ contextMaxChars }}
              </span>
            </div>
          </div>

          <!-- 压缩状态 -->
          <div class="strategy-match-info" v-if="appStore.contextManagerState?.isReady">
            <span class="label">压缩状态:</span>
            <span class="value" :class="{ ready: appStore.contextManagerState?.hasCompressed }">
              {{ appStore.contextManagerState?.hasCompressed ? '已压缩' : '未压缩' }}
            </span>
          </div>

          <!-- M12 操作按钮 -->
          <div class="m3-actions">
            <button @click="initContext" class="action-btn m3-btn" :disabled="appStore.contextManagerState?.isReady">
              初始化会话
            </button>
            <button @click="clearContext" class="action-btn m3-btn secondary" :disabled="!appStore.contextManagerState?.isReady">
              清除会话
            </button>
          </div>
        </section>

      </div>
      <!-- 底部按钮：固定在调试面板底部，视觉上包裹在面板内 -->
      <footer class="debug-footer">
        <button type="button" @click="testWakeWord" class="action-btn">模拟唤醒词</button>
        <button type="button" @click="printToConsole" class="action-btn secondary">输出到控制台</button>
      </footer>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/appStore'
import {
  AvatarState, PanelVisibility, VoiceCommandType, ConversationPhase,
} from '@/types'
import type { LLMModelStatus } from '@/types'
import {
  CONTEXT_MAX_TURNS, CONTEXT_MAX_CHARS,
} from '@/config/constants'
import {
  getAnimationStateList,
  type AnimationStateConfig,
} from '@/core/AvatarAnimationConfigLoader'

const appStore = useAppStore()
const debugExpanded = ref(true)
const isDarkMode = ref(true)

/** 从配置文件动态加载所有动效状态 */
const animationStates = getAnimationStateList()

/** 当前选中的动效状态ID */
const currentAnimStateId = ref<string | null>(null)

/** CSS类型状态 */
const cssStates = computed(() => animationStates.filter(s => !!s.cssClass))

/** Lottie类型状态 */
const lottieStates = computed(() => animationStates.filter(s => !!s.lottieFile))

/** 当前动效详情 */
const currentAnimDetail = computed(() => {
  if (!currentAnimStateId.value) return null
  return animationStates.find(s => s.id === currentAnimStateId.value) || null
})

// CSS基础状态与AvatarState枚举的映射
const cssStateMapping: Record<string, AvatarState> = {
  idle: AvatarState.IDLE,
  listening: AvatarState.LISTENING,
  speaking: AvatarState.SPEAKING,
  healing: AvatarState.HEALING,
}

/** 面板是否可见 */
const isPanelVisible = computed(() => appStore.panelVisibility !== PanelVisibility.HIDDEN)

/** 语音是否活跃 */
const isVoiceActive = computed(() =>
  appStore.asrStatus === 'listening' || appStore.ttsStatus === 'speaking'
)

/** 支持的指令列表（从VoiceCommandHandler获取） */
const supportedCommands = [
  { type: VoiceCommandType.EXIT_HEALING, description: '退出疗愈/关闭助手' },
  { type: VoiceCommandType.PLAY_MUSIC, description: '播放舒缓音乐' },
  { type: VoiceCommandType.STOP_MUSIC, description: '停止音乐' },
  { type: VoiceCommandType.FIND_PARKING, description: '找附近停车点' },
  { type: VoiceCommandType.DEEP_BREATH, description: '深呼吸放松引导' },
  { type: VoiceCommandType.EMOTION_VENT, description: '情绪倾诉识别' },
]

/** 最近消息 */
const recentMessages = computed(() => {
  const msgs = appStore.currentSession?.messages || []
  return msgs.slice(-5)
})

/** M10: 已配置的 API Key 数量 */
const configuredKeyCount = computed(() => {
  return Object.values(appStore.llmModelState.apiKeysConfigured).filter(Boolean).length
})

/** M10: API Key 总数 */
const totalApiKeyCount = computed(() => {
  return Object.keys(appStore.llmModelState.apiKeysConfigured).length
})

/** M10: 是否正在切换模型 */
const isSwitchingModel = ref(false)

function statusLabel(status: LLMModelStatus): string {
  const map: Record<string, string> = {
    available: '可用',
    active: '使用中',
    loading: '加载中',
    unavailable: '不可用',
    switching: '切换中',
  }
  return map[status] || status
}

/**
 * M10: 切换模型
 */
async function switchModel(modelId: string) {
  const hub = (window as any).__HEALING_AGENT__?.modelHub
  if (!hub) return

  isSwitchingModel.value = true
  try {
    const result = await hub.switchModel(modelId)
    if (result.code === 200) {
      console.log(`[Debug] 模型切换成功: ${result.model}`)
    } else {
      console.warn(`[Debug] 模型切换失败: ${result.content}`)
      alert(`切换失败: ${result.content}`)
    }
  } finally {
    isSwitchingModel.value = false
  }
}

/**
 * M10: 测试大模型对话
 */
async function testLLMChat() {
  const hub = (window as any).__HEALING_AGENT__?.modelHub
  if (!hub) {
    alert('大模型调度中心未初始化')
    return
  }

  const testTexts = ['你好，我是小疗', '我最近工作压力很大', '今天开车感觉好累']
  const text = testTexts[Math.floor(Math.random() * testTexts.length)]

  console.log(`[Debug] 测试大模型对话: "${text}"`)

  const result = await hub.chat({
    model: hub.getCurrentModelId(),
    messages: [
      { role: 'system', content: '你是小疗，智能座舱疗愈助手。回复不超过50字，温柔简洁。' },
      { role: 'user', content: text },
    ],
  })

  console.log(`[Debug] LLM回复 (${result.model}, ${result.elapsedMs}ms):`, result.content)

  if (result.code === 200) {
    appStore.startSpeaking(result.content)
    appStore.setAgentResponseText(result.content)
    const tts = (window as any).__HEALING_AGENT__?.ttsEngine
    tts?.speak(result.content, undefined, () => {
      appStore.backToIdle()
      appStore.setAgentResponseText('')
    })
  } else {
    alert(`模型调用失败: ${result.content}`)
  }
}

/**
 * M10: 刷新模型列表
 */
async function refreshModelList() {
  const hub = (window as any).__HEALING_AGENT__?.modelHub
  if (!hub) return
  await hub.init()
  console.log('[Debug] 模型列表已刷新')
}

// ==================== M11: 策略引擎调试 ====================

/** 缓存命中率 */
const strategyCacheRate = computed(() => {
  const s = appStore.strategyEngineState
  if (s.totalMatchCount === 0) return 0
  return Math.round((s.cacheHitCount / s.totalMatchCount) * 100)
})

/** 策略规则列表 */
const strategyRuleList = ref<any[]>([])

/** 加载策略规则列表 */
function loadStrategyRules() {
  const engine = (window as any).__HEALING_AGENT__?.strategyEngine
  if (engine) {
    strategyRuleList.value = engine.getRules()
  }
}

/** 测试策略匹配 */
function testStrategyMatch() {
  const engine = (window as any).__HEALING_AGENT__?.strategyEngine
  if (!engine) {
    alert('策略引擎未初始化')
    return
  }

  // 随机生成模拟情绪结果
  const emotions = ['anger', 'anxiety', 'irritability', 'fatigue', 'calm']
  const scenarios = ['traffic_jam', 'highway', 'city', 'idle', 'night', 'general']
  const emotion = emotions[Math.floor(Math.random() * emotions.length)]
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]

  const mockEmotion = {
    emotion,
    intensity: Math.random() > 0.5 ? 'high' : 'medium',
    confidence: 0.7 + Math.random() * 0.3,
    scenario,
    weightedScores: {},
  }

  const result = engine.match(mockEmotion, null)
  console.log('[Debug] 策略匹配测试:', {
    emotion,
    scenario,
    matchedRule: result.ruleId,
    reason: result.matchReason,
    isFallback: result.isFallback,
    promptLength: result.systemPrompt.length,
    fewShotCount: result.fewShots.length,
    personalityTags: result.injectedVars.personalityTags || '无',
  })

  // 重新加载规则列表以更新UI
  loadStrategyRules()
}

/** 清除策略缓存 */
function clearStrategyCache() {
  const engine = (window as any).__HEALING_AGENT__?.strategyEngine
  if (engine) {
    engine.clearCache()
    console.log('[Debug] 策略缓存已清除')
  }
}

// ==================== M12: 上下文记忆管理 ====================

/** 上下文阈值配置（从常量读取） */
const contextMaxTurns = CONTEXT_MAX_TURNS
const contextMaxChars = CONTEXT_MAX_CHARS

/** 是否接近阈值（80%以上） */
const isContextNearLimit = computed(() => {
  if (!appStore.contextManagerState?.isReady) return false
  const turnRatio = (appStore.contextManagerState.turnCount || 0) / contextMaxTurns
  const charRatio = (appStore.contextManagerState.totalChars || 0) / contextMaxChars
  return turnRatio > 0.8 || charRatio > 0.8
})

/** 初始化上下文会话 */
function initContext() {
  const mgr = (window as any).__HEALING_AGENT__?.contextManager
  if (mgr) {
    const sessionId = mgr.initSession()
    console.log(`[Debug] 上下文会话已初始化: ${sessionId}`)
  }
}

/** 清除上下文会话 */
function clearContext() {
  const mgr = (window as any).__HEALING_AGENT__?.contextManager
  if (mgr) {
    mgr.clearSession()
    console.log('[Debug] 上下文会话已清除')
  }
}

function togglePanel() {
  if (isPanelVisible.value) {
    appStore.hidePanel()
  } else {
    appStore.showPanel()
  }
}

/**
 * 测试动效状态（支持CSS和Lottie两种类型）
 */
function testAnimationState(state: AnimationStateConfig) {
  if (!isPanelVisible.value) return

  currentAnimStateId.value = state.id

  // CSS类型的状态 -> 映射到原有的AvatarState
  if (state.cssClass && cssStateMapping[state.id]) {
    // 先停止 Lottie 动画，恢复 CSS 形象
    window.dispatchEvent(new CustomEvent('avatar:stop-lottie'))

    const avatarState = cssStateMapping[state.id]
    switch (avatarState) {
      case AvatarState.IDLE:
        appStore.backToIdle()
        break
      case AvatarState.LISTENING:
        appStore.startListening()
        break
      case AvatarState.SPEAKING:
        appStore.startSpeaking('这是一条测试回复')
        break
      case AvatarState.HEALING:
        appStore.startHealing()
        break
    }
    console.log(`[Debug] CSS动效切换: ${state.label} (${state.cssClass}), 周期: ${state.duration}ms`)
    return
  }

  // Lottie类型的状态 -> 发送自定义事件，由上层组件处理
  console.log(`[Debug] Lottie动效: ${state.label}, 文件: ${state.lottieFile}, 周期: ${state.duration}ms`)
  window.dispatchEvent(new CustomEvent('avatar:play-lottie', {
    detail: { stateId: state.id, lottieFile: state.lottieFile },
  }))
}

/**
 * 格式化对话阶段显示名称
 */
function formatPhase(phase: ConversationPhase): string {
  const map: Record<string, string> = {
    [ConversationPhase.IDLE]: '空闲',
    [ConversationPhase.AWAITING_INPUT]: '等待输入',
    [ConversationPhase.PROCESSING]: '处理中',
    [ConversationPhase.RESPONDING]: '回复中',
  }
  return map[phase] || phase
}

/**
 * 模拟用户语音输入（通过全局实例调用voiceInteraction）
 * Demo版：直接触发ASR结果回调模拟
 */
function simulateUserInput() {
  if (!isPanelVisible.value) return
  
  const testInputs = [
    '你好',
    '我很生气，前面的车开得太慢了',
    '今天好累啊',
    '帮我做一下深呼吸放松',
    '播放点音乐吧',
    '我很烦，堵了这么久',
  ]
  
  // 随机选一条测试输入
  const text = testInputs[Math.floor(Math.random() * testInputs.length)]
  
  console.log(`[Debug] 模拟用户输入: "${text}"`)
  
  // 通过全局实例触发
  const voiceMgr = (window as any).__HEALING_AGENT__?.voiceInteraction
  if (voiceMgr && voiceMgr.isActive()) {
    // 直接构造ASR结果并传入
    voiceMgr.handleUserInput?.({
      text,
      isFinal: true,
      confidence: 0.92,
      timestamp: Date.now(),
    })
  } else {
    alert('请先通过「模拟唤醒词」启动对话系统')
  }
}

/**
 * 测试TTS播报
 */
function testTTS() {
  if (!isPanelVisible.value) return
  
  const tts = (window as any).__HEALING_AGENT__?.ttsEngine
  if (tts) {
    tts.speak(
      '你好呀！我是小疗，很高兴能陪伴你这段旅程。有什么想聊的吗？',
    )
    appStore.startSpeaking('你好呀！我是小疗，很高兴能陪伴你这段旅程。有什么想聊的吗？')
  }
}

/**
 * 停止语音对话
 */
function stopVoiceInteraction() {
  const voiceMgr = (window as any).__HEALING_AGENT__?.voiceInteraction
  if (voiceMgr) {
    voiceMgr.stop()
    appStore.backToIdle()
  }
}

function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value
  console.log('[Debug] 夜间模式切换:', isDarkMode.value ? '深色' : '浅色')
}

function testWakeWord() {
  console.log('[Debug] 模拟唤醒词触发')
  
  // 模拟唤醒检测
  appStore.setWakeStatus('detected' as any)
  
  setTimeout(() => {
    alert('模拟唤醒词：小疗同学\n\n实际功能需在真实座舱环境中使用语音触发')
  }, 100)
}

function printToConsole() {
  console.group('🔧 Healing Agent State Dump (M1~M11)')
  console.log('=== Module 1 ===')
  console.log('Init Phase:', appStore.initPhase)
  console.log('Run Mode:', appStore.runMode)
  console.log('Is Ready:', appStore.isReady)
  console.log('Permissions:', appStore.permissions)
  console.log('Resources:', appStore.resourceState)
  console.log('Wake Status:', appStore.wakeStatus)
  console.log('')
  console.log('=== Module 2 ===')
  console.log('Panel Visibility:', appStore.panelVisibility)
  console.log('Avatar State:', appStore.avatarAnimState)
  console.log('Auto Exit Status:', appStore.autoExitStatus)
  console.log('Is Interacting:', appStore.isInteracting)
  console.log('')
  console.log('=== Module 3 ===')
  console.log('ASR Status:', appStore.asrStatus)
  console.log('TTS Status:', appStore.ttsStatus)
  console.log('Conversation Phase:', appStore.conversationPhase)
  console.log('Current Session:', appStore.currentSession)
  console.log('Agent Response Text:', appStore.agentResponseText)
  console.log('User Interim Text:', appStore.userInterimText)
  console.log('')
  console.log('=== Module 4 (新增) ===')
  console.log('Emotion Result:', appStore.emotionResult)
  console.log('Is Recognizing:', appStore.isRecognizing)
  console.log('Driver Profile:', appStore.driverProfile)
  console.log('Emotion History:', appStore.emotionHistory)
  console.log('')
  console.log('=== Module 5 (新增) ===')
  console.log('Healing Service State:', appStore.healingServiceState)
  console.log('')
  console.log('=== Module 6 (新增) ===')
  console.log('Enhanced Profile:', appStore.enhancedProfile)
  console.log('Personalized Style:', appStore.personalizedStyle)
  console.log('')
  console.log('=== Module 7 (新增) ===')
  console.log('Data Store State:', appStore.dataStoreState)
  console.log('Clear Confirm State:', appStore.clearConfirmState)
  console.log('')
  console.log('=== Module 8 (新增) ===')
  console.log('OEM Config State:', appStore.oemConfigState)
  console.log('')
  console.log('=== Module 9 (新增) ===')
  console.log('Global Error State:', appStore.globalErrorState)
  console.log('Audio Channel State:', appStore.audioChannelState)
  console.log('Error:', appStore.error)
  console.log('')
  console.log('=== Module 10 (新增) ===')
  console.log('LLM Model State:', appStore.llmModelState)
  console.log('')
  console.log('=== Module 11 (新增) ===')
  console.log('Strategy Engine State:', appStore.strategyEngineState)
  const lastStrategy = (window as any).__HEALING_AGENT__?.voiceInteraction?.getLastStrategyResult?.()
  if (lastStrategy) {
    console.log('Last Strategy Result:', lastStrategy)
  }
  console.log('')
  console.log('=== Module 12 (新增) ===')
  console.log('Context Manager State:', appStore.contextManagerState)
  const contextMgr = (window as any).__HEALING_AGENT__?.contextManager
  if (contextMgr) {
    console.log('Context Stats:', contextMgr.getStats())
  }
  console.groupEnd()
  alert('已输出到浏览器控制台 (F12)')
}
</script>

<style lang="scss" scoped>
@use '@/styles/design-mixins' as *;

.debug-dock {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: $z-debug;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: min(560px, calc(100vw - 52px));
  max-width: calc(100vw - 52px);
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;

  & > * {
    pointer-events: auto;
  }
}

.debug-dock--collapsed {
  width: 44px;
}

.debug-rail {
  width: 80px;
  flex-shrink: 0;
  border: none;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  @include glass-effect(rgba(255, 255, 255, 0.88), 20px);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.06);
  color: $color-text-secondary;
  font-family: $font-family-base;
  transition: background 0.2s, color 0.2s;
  overflow: hidden;

  &__top {
    padding: 12px 4px;
  }

  &__bottom {
    padding: 12px 4px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
}

.debug-rail__toggle {
  border: none;
  border-radius: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0;
  background: none;
  color: inherit;
  font-family: inherit;
  transition: color 0.2s;

  &:hover {
    color: $color-primary;
  }
}

.debug-rail__icon-btn {
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  background: rgba(0, 0, 0, 0.04);
  color: rgba(0, 0, 0, 0.4);
  transition: all 0.2s;

  &:hover {
    background: rgba(123, 158, 200, 0.12);
    color: $color-primary;
  }

  svg {
    display: block;
  }
}

.debug-rail__chev {
  font-size: 15px;
  line-height: 1;
  opacity: 0.75;
}

.debug-rail__text {
  font-size: 11px;
  font-weight: $font-weight-medium;
  letter-spacing: 0.12em;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.debug-panel-wrap {
  padding:30px 45px 20px 10px;
  background-color: #dee1ec50;
  background-image: linear-gradient(0dge, #cfd8e43d, #d4dfee3d 100%, #2a5faa3d 100%, #2c333d3d 100%);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.25s ease, min-width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.debug-dock--collapsed .debug-panel-wrap {
  flex: 0;
  width: 0;
  min-width: 0;
  opacity: 0;
  pointer-events: none;
}

.debug-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  @include glass-effect(rgba(255, 255, 255, 0.78), 28px);
  border: 5px solid rgba(229, 233, 233, 0.55);
  border-radius: 3%;
  will-change: transform;
  border-left: none;
  box-shadow: $shadow-panel;
  color: $color-text-primary;
  font-size: 13px;
  font-family: $font-family-base;
  position: relative;

  // 底部灰白色底图（伪元素以避免被内部内容遮挡）
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: rgba(240, 242, 245, 0.45);
    z-index: -1;
    pointer-events: none;
  }

  // 调试面板内容（滚动区 + 底部按钮统一由 debug-body 管理）
  .debug-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 10px 12px 12px;
  }

  // 底部两个按钮：随 debug-body 内容滚动
  .debug-footer {
    display: flex;
    gap: 10px;
    padding: 10px 14px 12px;
    flex-shrink: 0;
    background: rgba(240, 242, 245, 0.6);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-top: 0.5px solid rgba(0, 0, 0, 0.06);

    .action-btn {
      flex: 1;
    }
  }
}

.debug-panel-header {
  display: flex;
  align-items: center;
  border-radius: 50%;
  justify-content: space-between;
  padding: 12px 14px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.38);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.debug-panel-header__collapse {
  border: none;
  border-radius: $radius-button;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: $font-weight-medium;
  font-family: inherit;
  color: $color-primary;
  background: rgba(123, 158, 200, 0.15);
  cursor: pointer;

  &:hover {
    background: rgba(123, 158, 200, 0.28);
  }
}

.debug-panel-title {
  display: flex;
  align-items: center;
  gap: 10px;

  h3 {
    margin: 0;
    font-size: 15px;
    font-weight: $font-weight-medium;
    color: $color-text-primary;
    letter-spacing: 0.02em;
  }
}

.debug-panel-badge {
  font-size: 11px;
  font-weight: $font-weight-medium;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(123, 158, 200, 0.22);
  color: $color-primary;
}

.debug-zone-label {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: $font-weight-medium;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: $color-text-muted;
}

// .debug-footer 已在 .debug-panel 内定义

@media (max-width: 640px) {
  .debug-dock:not(.debug-dock--collapsed) {
    width: min(100vw - 52px, 380px);
  }
}

.debug-section {
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: $radius-card;
  background: rgba(255, 255, 255, 0.5);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);

  &:last-child {
    margin-bottom: 0;
  }

  h4 {
    margin: 0 0 8px;
    font-size: 11px;
    font-weight: $font-weight-medium;
    color: $color-text-secondary;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  h5 {
    margin: 0.35rem 0 0.3rem;
    font-size: 12px;
    font-weight: $font-weight-medium;
    color: $color-text-muted;
  }
}

.info-grid {
  display: grid;
  gap: 0.4rem;

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.35rem 0.6rem;
    background: rgba(255, 255, 255, 0.72);
    border-radius: $radius-button;

    .label {
      color: $color-text-secondary;
      font-size: 0.8rem;
    }

    .value {
      font-weight: 500;
      font-size: 0.78rem;
      color: $color-text-primary;
      
      &.ready,
      &.active {
        color: #66BB6A;
      }
      
      &.mode-badge,
      &.avatar-state {
        font-size: 0.7rem;
        padding: 2px 8px;
        background: #7B9EC82E;
        border-radius: 4px;
        text-transform: uppercase;
      }

      // M3 新增状态徽章样式
      &.asr-badge {
        font-size: 0.7rem;
        padding: 2px 8px;
        border-radius: 4px;
        
        &.listening { background: rgba(76, 175, 80, 0.25); color: #81C784; }
        &.success { background: rgba(123, 158, 200, 0.25); color: $color-primary-light; }
        &.idle, &.recognizing { background: rgba(0, 0, 0, 0.05); color: $color-text-secondary; }
        &.error { background: rgba(239, 83, 80, 0.2); color: #EF5350; }
      }

      &.tts-badge {
        font-size: 0.7rem;
        padding: 2px 8px;
        border-radius: 4px;

        &.speaking { background: rgba(167, 147, 193, 0.25); color: #CE93D8; }
        &.paused { background: rgba(255, 167, 38, 0.15); color: #FFB74D; }
        &.idle { background: rgba(0, 0, 0, 0.05); color: $color-text-secondary; }
        &.error { background: rgba(239, 83, 80, 0.2); color: #EF5350; }
      }

      &.phase-badge {
        font-size: 0.7rem;
        padding: 2px 8px;
        background: rgba(107, 168, 165, 0.2);
        color: #3d7a72;
        border-radius: 4px;
      }

      &.danger {
        color: #EF5350;
      }
    }
  }
}

// ==================== Module 3: 实时文字显示 ====================

.live-text-display {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;

  .live-user, .live-agent {
    padding: 0.35rem 0.6rem;
    border-radius: $radius-button;
    font-size: 0.78rem;

    .live-label {
      font-weight: 500;
      margin-right: 0.4rem;
    }

    .live-content {
      color: $color-text-primary;
      font-style: italic;
    }
  }

  .live-user {
    background: rgba(123, 158, 200, 0.14);
    border-radius: $radius-button;
    .live-label { color: $color-primary; }
  }

  .live-agent {
    background: rgba(167, 147, 193, 0.12);
    border-radius: $radius-button;
    .live-label { color: #8b6fa8; }
  }
}

// ==================== Module 3: 操作按钮 ====================

.m3-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
  margin-top: 0.5rem;

  .m3-btn {
    font-size: 0.72rem;
    padding: 0.4rem 0.3rem;

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }
}

// ==================== 指令列表 ====================

.command-list {
  margin-top: 0.5rem;

  summary {
    cursor: pointer;
    font-size: 0.78rem;
    color: $color-primary;
    padding: 0.3rem 0;

    &:hover { text-decoration: underline; }
  }

  .command-items {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.4rem;
  }

  .command-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.3rem 0.5rem;
    background: rgba(255, 255, 255, 0.65);
    border-radius: $radius-button;
    font-size: 0.74rem;

    .cmd-type {
      font-weight: 500;
      color: $color-primary;
      text-transform: capitalize;
    }

    .cmd-desc {
      color: $color-text-muted;
      font-size: 0.7rem;
    }
  }
}

// ==================== 对话历史 ====================

.chat-history {
  margin-top: 0.5rem;

  .chat-msg {
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    font-size: 0.74rem;
    margin-bottom: 0.2rem;

    &.user {
      background: rgba(123, 158, 200, 0.14);
      border-radius: $radius-button;
    }

    &.agent {
      background: rgba(167, 147, 193, 0.12);
      border-radius: $radius-button;
    }

    &.system {
      background: rgba(255, 167, 38, 0.1);
      border-radius: $radius-button;
    }

    .msg-role {
      font-weight: 500;
      margin-right: 0.3rem;
      font-size: 0.68rem;
      color: $color-text-secondary;
    }

    .msg-content {
      color: $color-text-primary;
    }
  }
}

.permission-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  .permission-item {
    display: flex;
    justify-content: space-between;
    padding: 0.4rem 0.7rem;
    border-radius: $radius-button;
    background: rgba(255, 255, 255, 0.65);

    &.granted { box-shadow: inset 3px 0 0 0 #66BB6A; }
    &.denied { box-shadow: inset 3px 0 0 0 #EF5350; }
    &.not_available { box-shadow: inset 3px 0 0 0 #FFA726; }

    .type { font-weight: 500; color: $color-text-primary; }
    .status {
      font-size: 0.72rem;
      text-transform: uppercase;
      color: $color-text-muted;
    }
  }

  .empty {
    color: $color-text-muted;
    font-style: italic;
    text-align: center;
    padding: 0.5rem;
  }
}

.resource-list {
  .resource-item {
    display: flex;
    justify-content: space-between;
    padding: 0.3rem 0.5rem;
    font-size: 0.78rem;

    span:last-child {
      &.loaded { color: #66BB6A; }
      &:not(.loaded) { color: #EF5350; }
    }
  }
}

// 形象状态测试按钮网格
.avatar-test-info {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.35rem;
  margin-bottom: 0.35rem;

  .info-tag {
    font-size: 0.68rem;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 500;

    &.css-tag {
      background: rgba(123, 158, 200, 0.15);
      color: $color-primary;
    }

    &.lottie-tag {
      background: rgba(167, 147, 193, 0.15);
      color: #8b6fa8;
    }
  }
}

.avatar-test-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
  margin-top: 0.5rem;

  .avatar-test-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 0.4rem 0.25rem;
    font-size: 0.72rem;
    background: rgba(255, 255, 255, 0.55);
    border: 0.5px solid rgba(0, 0, 0, 0.06);
    border-radius: $radius-button;
    color: $color-text-secondary;
    cursor: pointer;
    transition: all 0.2s;

    .btn-label {
      font-weight: 500;
    }

    .btn-tag {
      font-size: 0.6rem;
      padding: 1px 5px;
      border-radius: 3px;
      background: rgba(167, 147, 193, 0.2);
      color: #8b6fa8;

      &.css-badge {
        background: rgba(123, 158, 200, 0.15);
        color: $color-primary;
      }
    }

    &:hover:not(:disabled) {
      background: rgba(123, 158, 200, 0.18);
      border-color: rgba(123, 158, 200, 0.35);
      color: $color-primary;
    }

    &.active {
      background: rgba(123, 158, 200, 0.28);
      border-color: rgba(123, 158, 200, 0.45);
      color: $color-text-primary;
    }

    &.lottie-type.active {
      background: rgba(167, 147, 193, 0.22);
      border-color: rgba(167, 147, 193, 0.4);
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }
}

// 动效参数详情面板
.anim-detail {
  margin-top: 0.5rem;
  padding: 0.5rem 0.6rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: $radius-button;
  border: 0.5px solid rgba(123, 158, 200, 0.2);

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.2rem 0;

    .detail-label {
      font-size: 0.72rem;
      color: $color-text-muted;
    }

    .detail-value {
      font-size: 0.72rem;
      font-weight: 500;
      color: $color-text-primary;

      &.code {
        font-family: monospace;
        font-size: 0.68rem;
        background: rgba(0, 0, 0, 0.04);
        padding: 1px 4px;
        border-radius: 3px;
      }
    }
  }
}

// 面板控制按钮
.panel-controls {
  .action-btn.danger {
    background: rgba(239, 83, 80, 0.12);
    border-color: rgba(239, 83, 80, 0.3);
    color: #EF5350;
  }
}

.error-msg {
  background: rgba(142, 142, 147, 0.12);
  border: 0.5px solid rgba(142, 142, 147, 0.28);
  border-radius: $radius-button;
  padding: 0.75rem;
  margin: 0;
  font-size: 0.78rem;
  color: $color-text-secondary;
  white-space: pre-wrap;
  word-break: break-all;
}

// M10 模型列表
.model-list {
  margin-top: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  .model-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.35rem 0.5rem;
    border-radius: $radius-button;
    background: rgba(255, 255, 255, 0.5);
    border: 0.5px solid rgba(0, 0, 0, 0.04);
    transition: all 0.2s;

    &.active {
      background: rgba(123, 158, 200, 0.15);
      border-color: rgba(123, 158, 200, 0.3);
    }

    &.unavailable {
      opacity: 0.45;
    }

    .model-info {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
    }

    .model-name {
      font-weight: 500;
      color: $color-text-primary;
    }

    .model-tag {
      font-size: 0.58rem;
      padding: 1px 5px;
      border-radius: 3px;

      &.local {
        background: rgba(76, 175, 80, 0.15);
        color: #4CAF50;
      }

      &.api {
        background: rgba(123, 158, 200, 0.15);
        color: $color-primary;
      }
    }

    .model-status {
      font-size: 0.6rem;

      &.available { color: #4CAF50; }
      &.active { color: $color-primary; font-weight: 600; }
      &.unavailable { color: #999; }
    }

    .model-switch-btn {
      padding: 2px 10px;
      font-size: 0.68rem;
      flex: none;
    }
  }
}

// M11 策略匹配信息
.strategy-match-info {
  margin-top: 0.4rem;
  padding: 0.35rem 0.5rem;
  border-radius: $radius-button;
  background: rgba(255, 255, 255, 0.4);
  font-size: 0.72rem;
  display: flex;
  gap: 0.4rem;
  align-items: baseline;

  .label {
    color: $color-text-secondary;
    flex-shrink: 0;
  }

  .value {
    color: $color-text-primary;
    word-break: break-all;

    &.muted {
      color: #999;
      font-style: italic;
    }
  }

  .strategy-id {
    font-size: 0.6rem;
    color: #999;
    font-family: monospace;
    margin-left: auto;
    flex-shrink: 0;
  }
}

.action-btn {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background: rgba(123, 158, 200, 0.2);
  border: 0.5px solid rgba(123, 158, 200, 0.45);
  border-radius: $radius-button;
  color: $color-primary;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
  font-family: inherit;

  &:hover:not(:disabled) {
    background: rgba(123, 158, 200, 0.3);
  }

  &.secondary {
    background: rgba(255, 255, 255, 0.55);
    border-color: rgba(0, 0, 0, 0.08);
    color: $color-text-secondary;

    &:hover {
      background: rgba(255, 255, 255, 0.85);
    }
  }

  &.danger {
    background: rgba(239, 83, 80, 0.12);
    border-color: rgba(239, 83, 80, 0.3);
    color: #EF5350;

    &:hover:not(:disabled) {
      background: rgba(239, 83, 80, 0.2);
    }
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

</style>
