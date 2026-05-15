<template>
  <Teleport to="body">
    <Transition name="panel-transition" @after-enter="onEnterComplete" @after-leave="onLeaveComplete">
      <div
        v-if="isVisible"
        class="healing-panel"
        :class="[visibilityState]"
        @click.stop.prevent
        @touchstart.stop.prevent
        @mousedown.stop.prevent
      >
        <!-- 毛玻璃背景层 -->
        <div class="panel-glass-bg"></div>
        
        <!-- 内容容器：三段式布局 -->
        <div class="panel-content">
          <!-- 顶部留白区 -->
          <div class="section-top">
            <!-- 预留：后续可加品牌logo或问候语 -->
          </div>

          <!-- 核心视觉区：虚拟形象 -->
          <div class="section-avatar">
            <AvatarDisplay 
              :state="currentAvatarState" 
            />
            
            <!-- M3: 用户实时输入文字（说话时显示） -->
            <Transition name="text-fade" mode="out-in">
              <p 
                v-if="userInterimText && isInteracting"
                key="user-interim"
                class="user-interim-text"
              >
                "{{ userInterimText }}"
              </p>
            </Transition>

            <!-- M3: Agent回复文本（播报时显示） -->
            <Transition name="text-fade" mode="out-in">
              <p 
                v-if="agentResponse && !statusText"
                key="agent-response"
                class="agent-response-text"
              >
                {{ agentResponse }}
              </p>
            </Transition>
            
            <!-- 底部状态文字（聆听中/疗愈中等） -->
            <Transition name="text-fade" mode="out-in">
              <p 
                v-if="statusText && showStatusText" 
                key="status-text"
                class="status-label"
              >
                {{ statusText }}
              </p>
            </Transition>
          </div>

          <!-- 底部留白区 -->
          <div class="section-bottom">
            <!-- ASR网络错误提示 -->
            <Transition name="text-fade" mode="out-in">
              <div v-if="asrError" class="asr-error-hint" :key="'asr-error'">
                <span class="asr-error-icon">!</span>
                <span>语音识别暂时不可用</span>
                <button class="asr-retry-btn" @click.stop="emit('retryAsr')">重试</button>
              </div>
              <!-- 提示文字（仅在待机态且无错误时显示） -->
              <p
                v-else-if="showHintText && !isInteracting"
                key="hint"
                class="hint-text"
              >
                我在听，请说...
              </p>
            </Transition>
          </div>
        </div>

        <!-- 边缘柔光装饰 -->
        <div class="panel-edge-glow"></div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/appStore'
import { PanelVisibility, AvatarState, ASRStatus } from '@/types'
import AvatarDisplay from './AvatarDisplay.vue'

interface Props {
  /** 面板可见性 */
  visibility: PanelVisibility
  /** 当前虚拟形象状态 */
  avatarState: AvatarState | string
  /** 是否显示状态文字 */
  showStatusText?: boolean
  /** 状态文字内容 */
  statusText?: string
  /** 是否显示提示语 */
  showHintText?: boolean
  /** 是否正在交互 */
  isInteracting?: boolean
  /** Agent回复文本（Module 3） */
  agentResponse?: string
  /** 用户输入中间文本（Module 3） */
  userInterimText?: string
}

const props = withDefaults(defineProps<Props>(), {
  showStatusText: true,
  statusText: '',
  showHintText: true,
  isInteracting: false,
  agentResponse: '',
  userInterimText: '',
})

const emit = defineEmits<{
  (e: 'enter-complete'): void
  (e: 'leave-complete'): void
  (e: 'retryAsr'): void
}>()

const appStore = useAppStore()

// ASR 是否处于错误状态
const asrError = computed(() => appStore.asrStatus === ASRStatus.ERROR)

// ==================== 计算属性 ====================

/** 面板是否需要渲染DOM */
const isVisible = computed(() => {
  return props.visibility !== PanelVisibility.HIDDEN
    && props.visibility !== PanelVisibility.EXITING
})

/** 当前可见性状态类（用于CSS过渡） */
const visibilityState = computed(() => {
  switch (props.visibility) {
    case PanelVisibility.ENTERING:
    case PanelVisibility.VISIBLE:
      return 'is-visible'
    case PanelVisibility.EXITING:
      return 'is-exiting'
    default:
      return ''
  }
})

/** 当前传给AvatarDisplay的状态 */
const currentAvatarState = computed(() => {
  // 如果面板正在进入/退出，强制用IDLE或HIDDEN
  if (props.visibility === PanelVisibility.EXITING || props.visibility === PanelVisibility.HIDDEN) {
    return AvatarState.HIDDEN
  }
  return props.avatarState
})

// ==================== 事件处理 ====================

function onEnterComplete() {
  emit('enter-complete')
}

function onLeaveComplete() {
  emit('leave-complete')
}
</script>

<style lang="scss" scoped>
@use '@/styles/design-mixins' as *;

// ==================== 主面板容器 ====================

.healing-panel {
  position: fixed;
  // 居中放置（PRD：蔚来焦点式居中构图）
  top: 50%;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
  z-index: $z-panel;
  
  width: min($panel-max-width, 88vw);
  max-width: $panel-max-width;
  min-height: $panel-min-height;
  padding: $panel-padding-y $panel-padding-x;
  
  // 苹果大圆角 + 蔚来面板弧度
  border-radius: $radius-panel;
  
  // 禁止任何触控交互（纯语音交互）
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  pointer-events: auto;

  &.is-visible {
    pointer-events: auto;
  }

  &.is-exiting {
    pointer-events: none;
  }
}

// ==================== 毛玻璃背景 ====================

.panel-glass-bg {
  position: absolute;
  inset: 0;
  opacity: 0;  // 初始隐藏，由入场动画控制
  // 与 AI 对话测试框统一的深色半透明风格
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: inherit;

  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.15),
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.08);
}

// ==================== 状态氛围光层（PRD要求）====================

.healing-panel {
  // 默认待机氛围（深色微光）
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(
      ellipse at 50% 40%,
      rgba(123, 158, 200, 0.06) 0%,
      transparent 60%
    );
    pointer-events: none;
    z-index: 0;
    transition: background 1.2s ease;
  }

  // 倾听态：淡蓝微光
  &[class*="listening"]::before,
  &.is-visible::before {
    background: radial-gradient(
      ellipse at 50% 40%,
      rgba(107, 168, 165, 0.08) 0%,
      transparent 55%
    );
  }
}

// ==================== 内容三段式布局 ====================

.panel-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  min-height: inherit;
  height: 100%;
  gap: $section-gap;                      // 使用新变量1.5rem
}

.section-top {
  flex: 0 0 auto;
  width: 100%;
  padding-top: 0.8rem;
  min-height: 40px;
}

.section-avatar {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $text-area-gap;                   // 使用新变量1.2rem
}

.section-bottom {
  flex: 0 0 auto;
  width: 100%;
  padding-bottom: 0.8rem;
  text-align: center;
  min-height: 44px;
}

// ==================== 状态文字 ====================

.status-label {
  font-size: $font-size-status;
  font-weight: $font-weight-medium;
  color: $color-text-secondary;
  letter-spacing: 0.03em;
  text-align: center;
  margin: 0;
  padding: 0.35rem 1.2rem;
  background: rgba(123, 158, 200, 0.08);
  border-radius: $radius-button;
}

.hint-text {
  font-size: $font-size-hint;
  font-weight: $font-weight-normal;
  color: $color-text-muted;
  margin: 0;
  letter-spacing: 0.04em;
  opacity: 0.7;
}

// ==================== ASR 错误提示 ====================

.asr-error-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: $font-size-hint;
  color: $color-text-muted;
  opacity: 0.9;
  padding: 0.35rem 0.6rem;
  background: rgba(239, 83, 80, 0.08);
  border: 1px solid rgba(239, 83, 80, 0.15);
  border-radius: $radius-button;
}

.asr-error-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(239, 83, 80, 0.25);
  color: #EF5350;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.asr-retry-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: $color-primary;
  font-size: 12px;
  font-weight: $font-weight-medium;
  padding: 0.2rem 0.7rem;
  border-radius: $radius-button;
  cursor: pointer;
  transition: background 0.2s ease;
  pointer-events: auto;

  &:hover {
    background: rgba(255, 255, 255, 0.18);
  }

  &:active {
    transform: scale(0.96);
  }
}

// ==================== Module 3: 对话文字展示（层次优化）====================

.user-interim-text {
  font-size: $font-size-status;
  font-weight: $font-weight-normal;
  color: $color-primary;
  margin: 0;
  padding: 0.5rem 1.4rem;
  font-style: italic;
  max-width: 82%;
  text-align: center;
  line-height: 1.55;
  background: rgba(123, 158, 200, 0.1);
  border-radius: $radius-button;
}

.agent-response-text {
  font-size: $font-size-status;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
  margin: 0;
  padding: 0.7rem 1.5rem;
  text-align: center;
  line-height: 1.65;
  max-width: 88%;
  background: rgba(255, 255, 255, 0.35);
  border-radius: $radius-card;
  text-shadow: none;
}

// ==================== 边缘柔光装饰（增强）====================

.panel-edge-glow {
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  opacity: 0;  // 初始隐藏，由入场动画控制
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.35) 0%,
    transparent 35%,
    transparent 65%,
    rgba(123, 158, 200, 0.15) 100%
  );
  pointer-events: none;
  z-index: 0;
}

// ==================== 过渡动画（弹性+层叠+景深）====================

// 面板进入：大幅位移 + 缩放 + 阴影生长
.panel-transition-enter-active {
  transition:
    transform $anim-panel-enter cubic-bezier(0.16, 1, 0.3, 1),
    opacity ($anim-panel-enter * 0.6) ease-out,
    box-shadow ($anim-panel-enter * 0.8) ease-out;
  will-change: transform, opacity;
  backface-visibility: hidden;
}

// 面板退出：柔和下沉 + 收缩消散
.panel-transition-leave-active {
  transition:
    transform $anim-panel-exit cubic-bezier(0.4, 0, 1, 1),
    opacity ($anim-panel-exit * 0.65) ease-in,
    box-shadow ($anim-panel-exit * 0.7) ease-in;
  will-change: transform, opacity;
  backface-visibility: hidden;
}

.panel-transition-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-50%) translateY(48px) scale(0.88);
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
}

.panel-transition-enter-to {
  opacity: 1;
  transform: translateX(-50%) translateY(-50%) translateY(0) scale(1);
  box-shadow:
    0 12px 48px rgba(0, 0, 0, 0.12),
    0 4px 16px rgba(0, 0, 0, 0.06);
}

.panel-transition-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(-50%) translateY(0) scale(1);
  box-shadow:
    0 12px 48px rgba(0, 0, 0, 0.12),
    0 4px 16px rgba(0, 0, 0, 0.06);
}

.panel-transition-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-50%) translateY(28px) scale(0.95);
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
}

// ==================== 内容层叠入场动画 ====================

@keyframes panel-stagger-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.healing-panel.is-visible .section-top {
  animation: panel-stagger-up 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 80ms;
}

.healing-panel.is-visible .section-avatar {
  animation: panel-stagger-up 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 160ms;
}

.healing-panel.is-visible .section-bottom {
  animation: panel-stagger-up 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 240ms;
}

// 毛玻璃背景层叠入场
.healing-panel.is-visible .panel-glass-bg {
  animation: glass-fade-in 600ms ease-out both;
  animation-delay: 40ms;
}

@keyframes glass-fade-in {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
    -webkit-backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
}

// 边缘柔光层叠入场
.healing-panel.is-visible .panel-edge-glow {
  animation: panel-stagger-up 500ms ease-out both;
  animation-delay: 100ms;
}

// 文字渐变过渡
.text-fade-enter-active,
.text-fade-leave-active {
  transition: all $anim-text-fade ease;
}

.text-fade-enter-from,
.text-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
