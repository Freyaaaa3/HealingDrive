<template>
  <div class="viz-dock" :class="{ 'viz-dock--collapsed': !vizExpanded }">
    <div class="viz-panel-wrap">
      <div class="viz-panel">
        <header class="viz-header">
          <div>
            <p class="viz-kicker">座舱 Demo</p>
            <h2 class="viz-title">状态看台</h2>
          </div>
          <button type="button" class="viz-header-collapse" aria-label="向左收起" @click="vizExpanded = false">
            收起
          </button>
        </header>

        <div class="viz-scroll">
          <!-- 会话流 + 情绪主视觉 -->
          <section class="viz-hero viz-card">
            <div class="viz-pipeline">
              <span class="viz-pill" :class="appStore.asrStatus">{{ asrLabel }}</span>
              <span class="viz-pipeline-dot" />
              <span class="viz-pill phase">{{ phaseLabel }}</span>
              <span class="viz-pipeline-dot" />
              <span class="viz-pill" :class="appStore.ttsStatus">{{ ttsLabel }}</span>
            </div>

            <div class="viz-emotion-layout">
              <div
                class="viz-ring"
                :style="{ '--ring-pct': emotionConfidencePct, '--ring-hue': emotionHue }"
                :class="{ 'viz-ring--empty': !appStore.emotionResult }"
              >
                <div class="viz-ring__inner">
                  <template v-if="appStore.emotionResult">
                    <span class="viz-ring__label">{{ formatEmotionType(appStore.emotionResult.emotion) }}</span>
                    <span class="viz-ring__sub">{{ formatIntensity(appStore.emotionResult.intensity) }} · {{ Math.round(appStore.emotionResult.confidence * 100) }}%</span>
                  </template>
                  <template v-else>
                    <span class="viz-ring__label muted">待识别</span>
                    <span class="viz-ring__sub muted">说出感受后更新</span>
                  </template>
                </div>
              </div>

              <ul v-if="appStore.emotionResult" class="viz-meta">
                <li><span>场景</span><em>{{ formatScenario(appStore.emotionResult.scenario) }}</em></li>
                <li><span>耗时</span><em>{{ appStore.emotionResult.processingTimeMs }}ms</em></li>
              </ul>
            </div>

            <div v-if="appStore.emotionResult" class="viz-dimensions">
              <div
                v-for="row in dimensionRows"
                :key="row.key"
                class="viz-dim-row"
              >
                <span class="viz-dim-name">{{ row.label }}</span>
                <div class="viz-dim-track">
                  <div class="viz-dim-fill" :class="row.key" :style="{ width: row.pct + '%' }" />
                </div>
                <span class="viz-dim-val">{{ row.value.toFixed(1) }}</span>
              </div>
            </div>

            <div class="viz-m4-actions">
              <button type="button" class="viz-btn" :disabled="!isPanelVisible || !isVoiceActive" @click="simulateEmotionRecognition">
                模拟情绪识别
              </button>
              <button type="button" class="viz-btn viz-btn--ghost" @click="resetDriverProfile">重置画像</button>
            </div>
          </section>

          <details v-if="appStore.driverProfile" class="viz-card viz-details">
            <summary>司机画像（简）</summary>
            <div class="viz-profile-rows">
              <div class="viz-row"><span>易怒</span><em>{{ (appStore.driverProfile.angerFrequency * 100).toFixed(0) }}%</em></div>
              <div class="viz-row"><span>交互</span><em>{{ appStore.driverProfile.totalInteractions }} 次</em></div>
            </div>
          </details>

          <!-- M5 -->
          <section class="viz-card">
            <h3 class="viz-card-title">疗愈服务</h3>
            <div class="viz-row-line">
              <span>策略</span>
              <em v-if="appStore.healingServiceState.currentStrategy">{{ formatStrategy(appStore.healingServiceState.currentStrategy.primary) }}</em>
              <em v-else class="muted">未匹配</em>
            </div>
            <p v-if="appStore.healingServiceState.currentStrategy?.reason" class="viz-reason">{{ appStore.healingServiceState.currentStrategy.reason }}</p>
            <div class="viz-row-line">
              <span>音乐</span>
              <em>{{ formatMusicStatus(appStore.healingServiceState.music.status) }}</em>
            </div>
            <div class="viz-row-line">
              <span>呼吸</span>
              <em>{{ formatBreathPhase(appStore.healingServiceState.breath.phase) }}</em>
            </div>
            <div v-if="appStore.healingServiceState.lastParkingSpots.length" class="viz-parking">
              <div v-for="spot in appStore.healingServiceState.lastParkingSpots" :key="spot.id" class="viz-parking-row">
                <span>{{ spot.name }}</span><em>{{ spot.direction }} · {{ spot.distance }}m</em>
              </div>
            </div>
            <div class="viz-m5-actions">
              <button type="button" class="viz-btn viz-btn--sm" :disabled="!isPanelVisible" @click="toggleMusic">{{ appStore.healingServiceState.music.status === 'playing' ? '停音乐' : '播音乐' }}</button>
              <button type="button" class="viz-btn viz-btn--sm" :disabled="!isPanelVisible" @click="toggleBreathGuide">{{ isBreathActive ? '停引导' : '呼吸引导' }}</button>
              <button type="button" class="viz-btn viz-btn--sm viz-btn--ghost" :disabled="!isPanelVisible" @click="findParking">停车</button>
              <button type="button" class="viz-btn viz-btn--sm viz-btn--ghost" :disabled="!isPanelVisible" @click="stopAllHealing">全停</button>
            </div>
          </section>

          <!-- M6 -->
          <section v-if="appStore.enhancedProfile" class="viz-card">
            <h3 class="viz-card-title">画像</h3>
            <div class="viz-chips">
              <span class="viz-chip" :class="extroversionClass">外向性 {{ formatDimension(appStore.enhancedProfile.extroversion) }}</span>
              <span class="viz-chip" :class="emotionalnessClass">感性 {{ formatDimension(appStore.enhancedProfile.emotionalness) }}</span>
            </div>
            <div v-if="appStore.enhancedProfile.emotionStats.total > 0" class="viz-stats">
              <div v-for="item in emotionStatItems" :key="item.key" class="viz-stat">
                <span class="viz-stat-label">{{ item.label }}</span>
                <div class="viz-stat-bar"><span :class="item.key" :style="{ width: item.pct + '%' }" /></div>
                <span class="viz-stat-pct">{{ item.pct }}%</span>
              </div>
            </div>
          </section>

          <!-- M7–M9 紧凑 -->
          <section class="viz-card viz-compact">
            <h3 class="viz-card-title">存储 · 车企 · 异常</h3>
            <div class="viz-grid-mini">
              <span>条目 {{ appStore.dataStoreState.totalEntries }}</span>
              <span>队列 {{ appStore.dataStoreState.writeQueueLength }}</span>
              <span>异常 {{ appStore.globalErrorState.stats.total }}</span>
              <span :class="{ warn: appStore.audioChannelState.isBusy }">{{ appStore.audioChannelState.isBusy ? '音频占用' : '音频空闲' }}</span>
            </div>
            <div class="viz-mini-actions">
              <button type="button" class="viz-btn viz-btn--sm viz-btn--ghost" @click="exportData">导出</button>
              <button type="button" class="viz-btn viz-btn--sm viz-btn--ghost" @click="previewOEMGreeting">问候</button>
              <button type="button" class="viz-btn viz-btn--sm" @click="simulateError">模拟异常</button>
              <button type="button" class="viz-btn viz-btn--sm" @click="simulatePhoneCall">占通道</button>
            </div>
            <div v-if="recentErrors.length" class="viz-logs">
              <p class="viz-logs-title">最近日志</p>
              <div v-for="e in recentErrors" :key="e.id" class="viz-log-line" :class="e.severity">
                <span>{{ formatLogTime(e.timestamp) }}</span>
                <span>{{ e.severity }}</span>
                <span>{{ e.message }}</span>
              </div>
            </div>
          </section>

          <section v-if="appStore.error" class="viz-card viz-error">
            <h3 class="viz-card-title">错误</h3>
            <pre>{{ appStore.error }}</pre>
          </section>
        </div>

        <footer class="viz-footer">
          <button type="button" class="viz-btn viz-btn--ghost" @click="requestDataClear">模拟清空</button>
          <button type="button" class="viz-btn viz-btn--ghost" @click="releaseChannel" v-if="appStore.audioChannelState.isBusy">释放通道</button>
          <button type="button" class="viz-btn viz-btn--ghost" @click="clearErrorLogs">清日志</button>
          <button type="button" class="viz-btn viz-btn--ghost" @click="resetOEMConfig">重置 OEM</button>
        </footer>
      </div>
    </div>

    <button
      type="button"
      class="viz-rail"
      :aria-expanded="vizExpanded"
      :aria-label="vizExpanded ? '收起可视化' : '打开可视化'"
      @click="vizExpanded = !vizExpanded"
    >
      <span v-if="!vizExpanded" class="viz-rail__label">可<wbr>视<wbr>化</span>
      <span class="viz-rail__chevron">{{ vizExpanded ? '›' : '‹' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/appStore'
import {
  PanelVisibility,
  EmotionType,
  EmotionIntensity,
  DrivingScenario,
  HealingStrategy,
  MusicPlayState,
  BreathPhase,
  ConversationPhase,
} from '@/types'

const appStore = useAppStore()
const vizExpanded = ref(true)

const isPanelVisible = computed(() => appStore.panelVisibility !== PanelVisibility.HIDDEN)
const isVoiceActive = computed(
  () => appStore.asrStatus === 'listening' || appStore.ttsStatus === 'speaking',
)

const asrLabel = computed(() => (appStore.asrStatus === 'listening' ? '聆听' : appStore.asrStatus === 'recognizing' ? '识别' : 'ASR 空闲'))
const ttsLabel = computed(() => (appStore.ttsStatus === 'speaking' ? '播报中' : 'TTS 空闲'))

const phaseLabel = computed(() => {
  const map: Record<string, string> = {
    [ConversationPhase.IDLE]: '空闲',
    [ConversationPhase.AWAITING_INPUT]: '等待输入',
    [ConversationPhase.PROCESSING]: '处理',
    [ConversationPhase.RESPONDING]: '回复',
  }
  return map[appStore.conversationPhase] || String(appStore.conversationPhase)
})

const emotionConfidencePct = computed(() =>
  appStore.emotionResult ? Math.round(appStore.emotionResult.confidence * 100) : 0,
)

const emotionHue = computed(() => {
  if (!appStore.emotionResult) return 210
  const map: Record<string, number> = {
    [EmotionType.ANGER]: 8,
    [EmotionType.ANXIETY]: 38,
    [EmotionType.IRRITABILITY]: 28,
    [EmotionType.FATIGUE]: 265,
    [EmotionType.CALM]: 155,
  }
  return map[appStore.emotionResult.emotion] ?? 210
})

const dimensionRows = computed(() => {
  const r = appStore.emotionResult
  if (!r) return []
  const w = r.weightedScores
  return [
    { key: 'voice', label: '语音', pct: Math.min(100, w.voice), value: w.voice },
    { key: 'facial', label: '面部', pct: Math.min(100, w.facial), value: w.facial },
    { key: 'driving', label: '驾驶', pct: Math.min(100, w.driving), value: w.driving },
    { key: 'heart', label: '心率', pct: Math.min(100, w.heartRate), value: w.heartRate },
    { key: 'profile', label: '画像', pct: Math.min(100, w.profile), value: w.profile },
  ]
})

const isBreathActive = computed(
  () =>
    appStore.healingServiceState.breath.phase !== 'idle' &&
    appStore.healingServiceState.breath.phase !== 'complete',
)

const extroversionClass = computed(() => {
  const v = appStore.enhancedProfile?.extroversion ?? 0
  return v > 0.2 ? 'extrovert' : v < -0.2 ? 'introvert' : 'balanced'
})

const emotionalnessClass = computed(() => {
  const v = appStore.enhancedProfile?.emotionalness ?? 0
  return v > 0.2 ? 'emotional' : v < -0.2 ? 'rational' : 'balanced'
})

const emotionStatItems = computed(() => {
  const s = appStore.enhancedProfile?.emotionStats
  if (!s || s.total === 0) return []
  const total = Math.max(1, s.total)
  return [
    { key: 'anger', label: '愤怒', count: s.anger, pct: Math.round((s.anger / total) * 100) },
    { key: 'anxiety', label: '焦虑', count: s.anxiety, pct: Math.round((s.anxiety / total) * 100) },
    { key: 'irritability', label: '烦躁', count: s.irritability, pct: Math.round((s.irritability / total) * 100) },
    { key: 'fatigue', label: '疲劳', count: s.fatigue, pct: Math.round((s.fatigue / total) * 100) },
    { key: 'calm', label: '平稳', count: s.calm, pct: Math.round((s.calm / total) * 100) },
  ]
})

const recentErrors = computed(() => {
  const logs = appStore.globalErrorState.errorLogs
  return logs.slice(-6).reverse()
})

function formatEmotionType(type: EmotionType): string {
  const map: Record<string, string> = {
    [EmotionType.ANGER]: '愤怒',
    [EmotionType.ANXIETY]: '焦虑',
    [EmotionType.IRRITABILITY]: '烦躁',
    [EmotionType.FATIGUE]: '疲劳',
    [EmotionType.CALM]: '平稳',
  }
  return map[type] || String(type)
}

function formatIntensity(intensity: EmotionIntensity): string {
  const map: Record<string, string> = {
    [EmotionIntensity.HIGH]: '高',
    [EmotionIntensity.MEDIUM]: '中',
    [EmotionIntensity.LOW]: '低',
  }
  return map[intensity] || String(intensity)
}

function formatScenario(scenario: DrivingScenario): string {
  const map: Record<string, string> = {
    [DrivingScenario.TRAFFIC_JAM]: '拥堵',
    [DrivingScenario.HIGHWAY]: '高速',
    [DrivingScenario.CITY]: '市区',
    [DrivingScenario.IDLE]: '怠速',
    [DrivingScenario.NIGHT]: '夜间',
    [DrivingScenario.GENERAL]: '通用',
  }
  return map[scenario] || String(scenario)
}

function formatStrategy(s: HealingStrategy): string {
  const map: Record<string, string> = {
    [HealingStrategy.EMPATHETIC_DIALOG]: '共情对话',
    [HealingStrategy.SOOTHING_MUSIC]: '舒缓音乐',
    [HealingStrategy.BREATH_GUIDE]: '呼吸引导',
    [HealingStrategy.PARKING_RECOMMEND]: '停车推荐',
  }
  return map[s] || String(s)
}

function formatMusicStatus(s: MusicPlayState): string {
  const map: Record<string, string> = {
    [MusicPlayState.PLAYING]: '播放中',
    [MusicPlayState.PAUSED]: '暂停',
    [MusicPlayState.STOPPED]: '停止',
  }
  return map[s] || String(s)
}

function formatBreathPhase(p: BreathPhase): string {
  const map: Record<string, string> = {
    [BreathPhase.IDLE]: '未开始',
    [BreathPhase.INHALE]: '吸气',
    [BreathPhase.HOLD]: '屏息',
    [BreathPhase.EXHALE]: '呼气',
    [BreathPhase.COMPLETE]: '完成',
  }
  return map[p] || String(p)
}

function formatDimension(val: number): string {
  if (val > 0.2) return `+${val.toFixed(2)}`
  if (val < -0.2) return val.toFixed(2)
  return '0.00'
}

function formatLogTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

function simulateEmotionRecognition() {
  if (!isPanelVisible.value) return
  const emotionEngine = (window as any).__HEALING_AGENT__?.emotionEngine
  if (!emotionEngine) {
    alert('情绪引擎未初始化')
    return
  }
  const testTexts = [
    '前面的车开得太慢了，真他妈气死我了！',
    '今天好累啊，开不动了。',
    '堵了这么久，好烦躁啊。',
    '我好紧张，怕来不及了。',
  ]
  const text = testTexts[Math.floor(Math.random() * testTexts.length)]
  emotionEngine
    .recognize(text, {
      onStart: () => {
        appStore.setRecognizing(true)
      },
      onComplete: (result: any) => {
        appStore.setRecognizing(false)
        appStore.setEmotionResult(result)
        const enhancedProfile = emotionEngine.getEnhancedProfile?.()
        if (enhancedProfile) {
          appStore.setEnhancedProfile(enhancedProfile)
          const styleAdapter = (window as any).__HEALING_AGENT__?.styleAdapter
          if (styleAdapter) {
            appStore.setPersonalizedStyle(styleAdapter.adapt(enhancedProfile))
          }
        } else {
          appStore.setDriverProfile(emotionEngine.getDriverProfile())
          appStore.setEmotionHistory(emotionEngine.getEmotionHistory())
        }
        appStore.applyEmotionToAvatar(result.emotion)
        const voiceMgr = (window as any).__HEALING_AGENT__?.voiceInteraction
        voiceMgr?.emotionEngine?.markSessionAnalyzed(true)
      },
      onError: () => {
        appStore.setRecognizing(false)
      },
    })
    .catch(() => {
      appStore.setRecognizing(false)
    })
}

function resetDriverProfile() {
  const emotionEngine = (window as any).__HEALING_AGENT__?.emotionEngine
  if (emotionEngine) {
    emotionEngine.resetProfile()
    appStore.setDriverProfile(emotionEngine.getDriverProfile())
    appStore.setEmotionHistory([])
    appStore.setEmotionResult(null)
    const profileEngine = (window as any).__HEALING_AGENT__?.profileEngine
    if (profileEngine) {
      appStore.setEnhancedProfile(profileEngine.getProfile())
      appStore.setPersonalizedStyle(null as any)
    }
    alert('司机画像已重置')
  }
}

function toggleMusic() {
  const healing = (window as any).__HEALING_AGENT__?.healingService
  if (!healing) {
    alert('疗愈服务未初始化')
    return
  }
  if (healing.musicPlayer.getState().status === 'playing') healing.musicPlayer.stop()
  else healing.musicPlayer.play()
}

function toggleBreathGuide() {
  const healing = (window as any).__HEALING_AGENT__?.healingService
  if (!healing) {
    alert('疗愈服务未初始化')
    return
  }
  if (isBreathActive.value) healing.stopBreathGuide()
  else healing.breathGuide.start()
}

function findParking() {
  const healing = (window as any).__HEALING_AGENT__?.healingService
  if (!healing) {
    alert('疗愈服务未初始化')
    return
  }
  const spots = healing.parkingFinder.findNearby()
  const text = healing.parkingFinder.generateSpotsText(spots)
  appStore.startSpeaking(text)
  appStore.setAgentResponseText(text)
}

function stopAllHealing() {
  ;(window as any).__HEALING_AGENT__?.healingService?.stopAll()
}

function exportData() {
  const ds = (window as any).__HEALING_AGENT__?.dataStore
  if (!ds) {
    alert('数据存储未初始化')
    return
  }
  const data = ds.exportData()
  console.group('DataStore Export')
  console.log(data)
  console.groupEnd()
  alert('已导出到控制台 (F12)')
}

function requestDataClear() {
  ;(window as any).__HEALING_AGENT__?.dataStore?.requestClear()
}

function previewOEMGreeting() {
  const oem = (window as any).__HEALING_AGENT__?.oemConfig
  const tts = (window as any).__HEALING_AGENT__?.ttsEngine
  if (oem && tts) tts.speak(oem.getConfig().greetingPhrase)
}

function resetOEMConfig() {
  const oem = (window as any).__HEALING_AGENT__?.oemConfig
  const store = (window as any).__HEALING_AGENT__?.store
  if (oem && store) store.setOEMConfigState(oem.resetToDefault())
}

function simulateError() {
  const eh = (window as any).__HEALING_AGENT__?.globalErrorHandler
  if (!eh) return
  eh.handleError('global', '[模拟] 异常', 'low')
}

function simulatePhoneCall() {
  ;(window as any).__HEALING_AGENT__?.audioPriorityMgr?.simulateOccupied(0)
}

function releaseChannel() {
  ;(window as any).__HEALING_AGENT__?.audioPriorityMgr?.simulateRelease()
}

function clearErrorLogs() {
  const eh = (window as any).__HEALING_AGENT__?.globalErrorHandler
  if (!eh) return
  eh.clearLogs()
  ;(window as any).__HEALING_AGENT__?.store?.setGlobalErrorState(eh.getState())
}
</script>

<style lang="scss" scoped>
@use '@/styles/design-mixins' as *;

$viz-z: 9998;

.viz-dock {
  position: fixed;
  right: 0;
  top: 12px;
  bottom: 12px;
  z-index: $viz-z;
  display: flex;
  flex-direction: row-reverse;
  align-items: stretch;
  width: min(400px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;

  & > * {
    pointer-events: auto;
  }
}

.viz-dock--collapsed {
  width: 44px;
}

.viz-panel-wrap {
  flex: 1;
  min-width: 460px;
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.25s ease, min-width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.viz-dock--collapsed .viz-panel-wrap {
  flex: 0;
  width: 0;
  min-width: 0;
  opacity: 0;
  pointer-events: none;
}

.viz-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: $radius-panel 0 0 $radius-panel;
  overflow: hidden;
  @include glass-effect(rgba(255, 255, 255, 0.82), 24px);
  border: 0.5px solid rgba(255, 255, 255, 0.55);
  border-right: none;
  box-shadow: $shadow-panel;
  color: $color-text-primary;
  font-family: $font-family-base;
  font-size: 13px;
}

.viz-rail {
  width: 44px;
  flex-shrink: 0;
  border: none;
  border-radius: $radius-panel 0 0 $radius-panel;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 4px;
  @include glass-effect(rgba(255, 255, 255, 0.88), 20px);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.06);
  color: $color-text-secondary;
  font-size: 11px;
  font-weight: $font-weight-medium;
  letter-spacing: 0.12em;
  transition: background 0.2s, color 0.2s;

  &:hover {
    color: $color-primary;
    background: rgba(255, 255, 255, 0.95);
  }
}

.viz-rail__label {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  line-height: 1.35;
}

.viz-rail__chevron {
  font-size: 16px;
  opacity: 0.65;
}

.viz-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 14px 14px 10px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.2) 100%);
}

.viz-kicker {
  margin: 0 0 4px;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: $color-text-muted;
}

.viz-title {
  margin: 0;
  font-size: 17px;
  font-weight: $font-weight-medium;
  letter-spacing: 0.02em;
}

.viz-header-collapse {
  border: none;
  border-radius: $radius-button;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: $font-weight-medium;
  color: $color-primary;
  background: rgba(123, 158, 200, 0.15);
  cursor: pointer;
  font-family: inherit;

  &:hover {
    background: rgba(123, 158, 200, 0.28);
  }
}

.viz-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.viz-card {
  border-radius: $radius-card;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.viz-card-title {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: $font-weight-medium;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: $color-text-muted;
}

.viz-hero {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.72) 0%, rgba(230, 238, 248, 0.55) 100%);
}

.viz-pipeline {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.viz-pill {
  font-size: 11px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.05);
  color: $color-text-secondary;

  &.listening,
  &.speaking {
    background: rgba(123, 158, 200, 0.22);
    color: $color-primary;
  }

  &.phase {
    background: rgba(107, 168, 165, 0.18);
    color: #2d6d66;
  }
}

.viz-pipeline-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.12);
}

.viz-emotion-layout {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.viz-ring {
  --ring-pct: 0;
  --ring-hue: 210;
  width: 132px;
  height: 132px;
  border-radius: 50%;
  padding: 5px;
  background: conic-gradient(
    from -90deg,
    hsl(var(--ring-hue), 42%, 72%) 0turn,
    hsl(var(--ring-hue), 42%, 72%) calc(var(--ring-pct) / 100 * 1turn),
    rgba(0, 0, 0, 0.07) 0turn
  );
  box-shadow: 0 8px 28px rgba(123, 158, 200, 0.12);

  &--empty {
    background: conic-gradient(from -90deg, rgba(0, 0, 0, 0.07) 0turn, rgba(0, 0, 0, 0.07) 1turn);
  }
}

.viz-ring__inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 8px;
}

.viz-ring__label {
  font-size: 15px;
  font-weight: $font-weight-medium;
  color: $color-text-primary;

  &.muted {
    color: $color-text-secondary;
  }
}

.viz-ring__sub {
  margin-top: 4px;
  font-size: 11px;
  color: $color-text-muted;

  &.muted {
    opacity: 0.85;
  }
}

.viz-meta {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 12px;
  color: $color-text-secondary;

  li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 6px;

    span {
      color: $color-text-muted;
    }

    em {
      font-style: normal;
      font-weight: $font-weight-medium;
      color: $color-text-primary;
    }
  }
}

.viz-dimensions {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.viz-dim-row {
  display: grid;
  grid-template-columns: 36px 1fr 36px;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.viz-dim-name {
  color: $color-text-muted;
  text-align: right;
}

.viz-dim-track {
  height: 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.viz-dim-fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.5s ease;

  &.voice {
    background: linear-gradient(90deg, #7b9ec8, #b4cde5);
  }
  &.facial {
    background: linear-gradient(90deg, #a78bc1, #d4c4e8);
  }
  &.driving {
    background: linear-gradient(90deg, #e8c48a, #f0d4a8);
  }
  &.heart {
    background: linear-gradient(90deg, #e0a8a8, #eec4c4);
  }
  &.profile {
    background: linear-gradient(90deg, #8dbe9a, #b8dfc4);
  }
}

.viz-dim-val {
  text-align: right;
  font-weight: 500;
  color: $color-text-secondary;
  font-variant-numeric: tabular-nums;
}

.viz-m4-actions,
.viz-m5-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.viz-btn {
  border: none;
  border-radius: $radius-button;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: $font-weight-medium;
  font-family: inherit;
  cursor: pointer;
  background: rgba(123, 158, 200, 0.28);
  color: $color-primary;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &--sm {
    padding: 6px 10px;
    font-size: 11px;
  }

  &--ghost {
    background: rgba(255, 255, 255, 0.55);
    color: $color-text-secondary;
    box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.06);
  }
}

.viz-details summary {
  cursor: pointer;
  font-size: 12px;
  color: $color-primary;
}

.viz-profile-rows {
  margin-top: 8px;
  font-size: 12px;
}

.viz-row,
.viz-row-line {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 12px;

  span {
    color: $color-text-muted;
  }

  em {
    font-style: normal;
    font-weight: $font-weight-medium;
    color: $color-text-primary;
  }
}

.muted {
  color: $color-text-muted !important;
}

.viz-reason {
  margin: 0 0 8px;
  font-size: 11px;
  line-height: 1.45;
  color: $color-text-secondary;
}

.viz-parking {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.06);
}

.viz-parking-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 4px;
}

.viz-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.viz-chip {
  font-size: 11px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.05);
  color: $color-text-secondary;

  &.extrovert {
    background: rgba(255, 167, 38, 0.15);
    color: #a66a00;
  }
  &.introvert {
    background: rgba(123, 158, 200, 0.2);
    color: $color-primary;
  }
  &.emotional {
    background: rgba(167, 147, 193, 0.18);
    color: #6b5088;
  }
  &.rational {
    background: rgba(77, 182, 172, 0.15);
    color: #2a7a72;
  }
  &.balanced {
    background: rgba(0, 0, 0, 0.05);
  }
}

.viz-stats {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.viz-stat {
  display: grid;
  grid-template-columns: 52px 1fr 36px;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.viz-stat-label {
  color: $color-text-muted;
}

.viz-stat-bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.06);
  overflow: hidden;

  span {
    display: block;
    height: 100%;
    border-radius: inherit;
    min-width: 2px;
    transition: width 0.4s ease;
  }

  .anger {
    background: linear-gradient(90deg, #e57373, #ef9a9a);
  }
  .anxiety {
    background: linear-gradient(90deg, #ffb74d, #ffcc80);
  }
  .irritability {
    background: linear-gradient(90deg, #ffcc80, #ffe082);
  }
  .fatigue {
    background: linear-gradient(90deg, #90caf9, #bbdefb);
  }
  .calm {
    background: linear-gradient(90deg, #81c784, #c8e6c9);
  }
}

.viz-stat-pct {
  text-align: right;
  color: $color-text-muted;
  font-variant-numeric: tabular-nums;
}

.viz-compact .viz-grid-mini {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  font-size: 11px;
  color: $color-text-secondary;

  .warn {
    color: #c45c5c;
  }
}

.viz-mini-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.viz-logs {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.06);
}

.viz-logs-title {
  margin: 0 0 6px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: $color-text-muted;
}

.viz-log-line {
  display: grid;
  grid-template-columns: 36px 52px 1fr;
  gap: 6px;
  font-size: 10px;
  padding: 4px 0;
  color: $color-text-secondary;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.04);

  &.high {
    color: #b71c1c;
  }
  &.medium {
    color: #b8860b;
  }
}

.viz-error pre {
  margin: 0;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-word;
  color: $color-text-secondary;
}

.viz-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 10px 10px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.45);
}

@media (max-width: 720px) {
  .viz-dock:not(.viz-dock--collapsed) {
    width: min(100vw - 52px, 360px);
  }
}
</style>
