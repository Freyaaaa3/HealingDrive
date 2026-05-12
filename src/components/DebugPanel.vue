<template>
  <div class="debug-dock" :class="{ 'debug-dock--collapsed': !debugExpanded }">
    <button
      type="button"
      class="debug-rail"
      :aria-expanded="debugExpanded"
      :aria-label="debugExpanded ? '向左收起调试' : '向右展开调试'"
      @click="debugExpanded = !debugExpanded"
    >
      <span v-if="!debugExpanded" class="debug-rail__chev">›</span>
      <span v-else class="debug-rail__chev">‹</span>
      <span class="debug-rail__text">调试</span>
    </button>

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
    </div>

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
import {
  getAnimationStateList,
  type AnimationStateConfig,
} from '@/core/AvatarAnimationConfigLoader'

const appStore = useAppStore()
const debugExpanded = ref(true)

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

function testWakeWord() {
  console.log('[Debug] 模拟唤醒词触发')
  
  // 模拟唤醒检测
  appStore.setWakeStatus('detected' as any)
  
  setTimeout(() => {
    alert('模拟唤醒词：小疗同学\n\n实际功能需在真实座舱环境中使用语音触发')
  }, 100)
}

function printToConsole() {
  console.group('🔧 Healing Agent State Dump (M1+M2+M3+M4+M5+M6+M7+M8+M9)')
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
  console.groupEnd()
  alert('已输出到浏览器控制台 (F12)')
}
</script>

<style lang="scss" scoped>
@use '@/styles/design-mixins' as *;

.debug-dock {
  position: fixed;
  left: 0;
  top: 12px;
  bottom: 12px;
  z-index: $z-debug;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: min(440px, calc(100vw - 56px));
  max-width: calc(100vw - 56px);
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
  width: 44px;
  flex-shrink: 0;
  border: none;
  border-radius: 0 $radius-panel $radius-panel 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 4px;
  @include glass-effect(rgba(255, 255, 255, 0.88), 20px);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.06);
  color: $color-text-secondary;
  font-family: $font-family-base;
  transition: background 0.2s, color 0.2s;

  &:hover {
    color: $color-primary;
    background: rgba(255, 255, 255, 0.95);
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
  border-radius: 0 $radius-panel $radius-panel 0;
  overflow: hidden;
  @include glass-effect(rgba(255, 255, 255, 0.78), 28px);
  border: 0.5px solid rgba(255, 255, 255, 0.55);
  border-left: none;
  box-shadow: $shadow-panel;
  color: $color-text-primary;
  font-size: 13px;
  font-family: $font-family-base;
}

.debug-panel-header {
  display: flex;
  align-items: center;
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

.debug-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 10px 12px 12px;
  overflow-x: hidden;
  overflow-y: auto;
}

.debug-zone-label {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: $font-weight-medium;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: $color-text-muted;
}

.debug-footer {
  display: flex;
  gap: 10px;
  padding: 10px 14px 12px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.42);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-top: 0.5px solid rgba(0, 0, 0, 0.06);

  .action-btn {
    flex: 1;
  }
}

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
