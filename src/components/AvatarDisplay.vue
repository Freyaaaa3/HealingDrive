<template>
  <div class="avatar-container">
    <!-- CSS 动画形象（原有） -->
    <div 
      class="avatar-figure" 
      :class="[animationClass, { 'avatar-hidden': isHidden || isLottiePlaying }]"
    >
      <!-- 外层光晕容器 -->
      <div class="avatar-glow" :class="glowClass"></div>
      
      <!-- 形象主体 -->
      <div class="avatar-body">
        <!-- 头部区域 -->
        <div class="head-section">
          <!-- 头发 -->
          <div class="hair">
            <div class="hair-top"></div>
            <div class="hair-left"></div>
            <div class="hair-right"></div>
          </div>
          
          <!-- 脸部 -->
          <div class="face">
            <!-- 眉毛 -->
            <div class="eyebrows">
              <span class="brow left"></span>
              <span class="brow right"></span>
            </div>
            
            <!-- 眼睛 -->
            <div class="eyes">
              <span class="eye left" :class="{ 'eye-blink': isBlinking }">
                <span class="eye-pupil"></span>
              </span>
              <span class="eye right" :class="{ 'eye-blink': isBlinking }">
                <span class="eye-pupil"></span>
              </span>
            </div>
            
            <!-- 鼻子 -->
            <div class="nose"></div>
            
            <!-- 嘴巴（根据状态变化） -->
            <div class="mouth-container">
              <div 
                class="mouth" 
                :class="[`mouth-${currentState}`, { 'mouth-talking': isTalking }]"
              ></div>
            </div>

            <!-- 腮红（治愈系柔和感） -->
            <div class="blush left"></div>
            <div class="blush right"></div>
          </div>
          
          <!-- 耳朵 -->
          <div class="ear left-ear"></div>
          <div class="ear right-ear"></div>
        </div>
        
        <!-- 颈部 -->
        <div class="neck"></div>
        
        <!-- 上身/肩膀区域 -->
        <div class="upper-body">
          <div class="shoulders"></div>
          <div class="clothing-collar"></div>
        </div>
      </div>

      <!-- 装饰性光点（疗愈态增强） -->
      <div v-if="currentState === 'healing'" class="healing-particles">
        <span class="particle" v-for="i in 6" :key="i" :style="particleStyle(i)"></span>
      </div>
    </div>

    <!-- Lottie 动画渲染层 -->
    <div 
      ref="lottieContainer" 
      class="lottie-layer"
      :class="{ 'lottie-visible': isLottiePlaying }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { AvatarState } from '@/types'
import lottie from 'lottie-web'
import {
  getLottieAnimationData,
} from '@/core/AvatarAnimationConfigLoader'

interface Props {
  state: AvatarState | string
}

const props = withDefaults(defineProps<Props>(), {
  state: 'hidden',
})

// ==================== 响应式状态 ====================
const currentState = computed(() => props.state)
const isHidden = computed(() => currentState.value === 'hidden')
const isBlinking = ref(false)
const isTalking = ref(false)

// Lottie 相关
const lottieContainer = ref<HTMLDivElement | null>(null)
const isLottiePlaying = ref(false)
let lottieAnimation: ReturnType<typeof lottie.loadAnimation> | null = null

let blinkTimer: ReturnType<typeof setInterval> | null = null
let talkTimer: ReturnType<typeof setInterval> | null = null

// ==================== 计算属性 ====================

/** 动画CSS类名 */
const animationClass = computed(() => {
  switch (currentState.value as AvatarState) {
    case 'idle':
      return 'state-idle'
    case 'listening':
      return 'state-listening'
    case 'speaking':
      return 'state-speaking'
    case 'healing':
      return 'state-healing'
    default:
      return ''
  }
})

/** 光晕效果类名 */
const glowClass = computed(() => {
  if (currentState.value === 'healing') return 'glow-healing'
  if (currentState.value === 'listening') return 'glow-listening'
  if (currentState.value === 'speaking') return 'glow-speaking'
  return ''
})

// ==================== Lottie 动画控制 ====================

function handlePlayLottie(event: Event) {
  const customEvent = event as CustomEvent<{ stateId: string; lottieFile: string }>
  const { stateId } = customEvent.detail
  playLottieAnimation(stateId)
}

function playLottieAnimation(stateId: string) {
  const animData = getLottieAnimationData(stateId)
  if (!animData || !lottieContainer.value) {
    console.warn(`[AvatarDisplay] 无法加载 Lottie 动画: ${stateId}`)
    return
  }

  // 先销毁旧的动画
  destroyLottieAnimation()

  // 创建新的 Lottie 动画
  isLottiePlaying.value = true
  lottieAnimation = lottie.loadAnimation({
    container: lottieContainer.value,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData: animData,
  })

  console.log(`[AvatarDisplay] Lottie 动画播放: ${stateId}`)
}

function stopLottieAnimation() {
  if (lottieAnimation) {
    lottieAnimation.stop()
  }
  isLottiePlaying.value = false
  console.log('[AvatarDisplay] Lottie 动画停止')
}

function destroyLottieAnimation() {
  if (lottieAnimation) {
    lottieAnimation.destroy()
    lottieAnimation = null
  }
  isLottiePlaying.value = false
}

// ==================== 生命周期 ====================

onMounted(() => {
  // 启动自然眨眼动画
  blinkTimer = setInterval(() => {
    // 随机眨眼，3-6秒间隔
    const delay = 3000 + Math.random() * 3000
    setTimeout(() => {
      if (!isHidden.value) {
        isBlinking.value = true
        setTimeout(() => { isBlinking.value = false }, 180)
      }
    }, delay)
  }, 4000)

  // 说话时嘴动效果
  talkTimer = setInterval(() => {
    if ((currentState.value === 'speaking' || currentState.value === 'healing') && !isHidden.value) {
      isTalking.value = true
      setTimeout(() => { isTalking.value = false }, 200 + Math.random() * 150)
    }
  }, 350)

  // 监听 Lottie 播放事件
  window.addEventListener('avatar:play-lottie', handlePlayLottie)
  // 监听 Lottie 停止事件
  window.addEventListener('avatar:stop-lottie', stopLottieAnimation)
})

onUnmounted(() => {
  if (blinkTimer) clearInterval(blinkTimer)
  if (talkTimer) clearInterval(talkTimer)
  window.removeEventListener('avatar:play-lottie', handlePlayLottie)
  window.removeEventListener('avatar:stop-lottie', stopLottieAnimation)
  destroyLottieAnimation()
})

// ==================== 工具方法 ====================

/** 疗愈粒子位置计算 */
function particleStyle(index: number): Record<string, string> {
  const angle = (index / 6) * Math.PI * 2
  const radius = 100 + Math.random() * 30
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius
  const delay = index * 0.4
  
  return {
    '--px': `${x}px`,
    '--py': `${y}px`,
    '--delay': `${delay}s`,
  }
}
</script>

<style lang="scss" scoped>
// ==================== 设计变量导入 ====================
@use '@/styles/design-mixins' as *;

// ==================== 外层容器 ====================

.avatar-container {
  position: relative;
  width: $avatar-width;
  height: $avatar-height;
  display: flex;
  align-items: center;
  justify-content: center;
}

// ==================== Lottie 动画层 ====================

.lottie-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
  z-index: 5;

  &.lottie-visible {
    opacity: 1;
    pointer-events: auto;
  }

  :deep(svg) {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}

// ==================== 形象主体 ====================

.avatar-figure {
  position: relative;
  width: $avatar-width;
  height: $avatar-height;
  display: flex;
  align-items: center;
  justify-content: center;

  &.avatar-hidden {
    display: none;
  }

  // ===== 各状态的过渡动画 =====
  
  &.state-idle {
    animation: avatar-breathe $anim-idle ease-in-out infinite;
  }

  &.state-listening {
    animation: avatar-nod $anim-listening ease-in-out infinite;
  }

  &.state-speaking {
    animation: avatar-speak-subtle $anim-speak ease-in-out infinite;
  }

  &.state-healing {
    animation: avatar-healing-float $anim-healing ease-in-out infinite;
    
    .avatar-glow {
      animation: glow-pulse-healing 2s ease-in-out infinite alternate;
    }
  }
}

// ==================== 光晕效果（增强）====================

.avatar-glow {
  position: absolute;
  width: $avatar-width * 1.2;           // 原来1.15 — 光晕更大
  height: $avatar-height * 1.15;        // 原来1.1
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    #7B9EC826 0%,                        // 原来1F — 更亮
    transparent 70%
  );
  z-index: 0;
  transition: all 0.8s ease;
  pointer-events: none;

  &.glow-listening {
    background: radial-gradient(
      ellipse at center,
      #7B9EC83A 0%,                       // 原来2E
      transparent 72%
    );
  }

  &.glow-speaking {
    background: radial-gradient(
      ellipse at center,
      rgba(107, 168, 165, 0.20) 0%,     // 原来0.15
      transparent 70%
    );
  }

  &.glow-healing {
    background: radial-gradient(
      ellipse at center,
      rgba(167, 147, 193, 0.28) 0%,     // 原来0.22
      transparent 75%
    );
  }
}

// ==================== 身体结构 ====================

.avatar-body {
  position: relative;
  z-index: 1;
}

.head-section {
  position: relative;
  width: 160px;                           // 原来140px
  height: 190px;                          // 原来165px
}

// ---- 头发 ----
.hair {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 148px;                           // 原来130px
  height: 92px;                           // 原来80px
  z-index: 3;

  .hair-top {
    position: absolute;
    top: 0;
    left: 10%;
    width: 80%;
    height: 74px;                         // 原来65px
    background: linear-gradient(180deg, #5D4E37 0%, #4A3F30 100%);
    border-radius: 72px 72px 24px 28px;   // 稍大圆角
  }

  .hair-left,
  .hair-right {
    position: absolute;
    top: 50px;                            // 原来45px
    width: 32px;                          // 原来28px
    height: 62px;                          // 原来55px
    background: linear-gradient(180deg, #5D4E37 0%, #4A3F30 100%);
    border-radius: 0 0 16px 16px;         // 原来14px
  }

  .hair-left { left: 0; border-radius: 0 0 16px 6px; }
  .hair-right { right: 0; border-radius: 0 0 6px 16px; }
}

// ---- 脸部 ----
.face {
  position: absolute;
  top: 40px;                             // 原来35px
  left: 50%;
  transform: translateX(-50%);
  width: 132px;                           // 原来115px
  height: 146px;                          // 原来128px
  background: linear-gradient(180deg, #FFEBD6 0%, #FFE0C2 40%, #F5D5B8 100%);
  border-radius: 66px 66px 58px 58px;     // 原来是 58px 58px 52px 52px
  box-shadow: 
    inset 2px 2px 8px rgba(255, 255, 255, 0.4),
    inset -2px -2px 8px rgba(200, 170, 140, 0.15);
  overflow: hidden;
}

// ---- 眉毛 ----
.eyebrows {
  position: absolute;
  top: 42px;                             // 原来36px
  left: 50%;
  transform: translateX(-50%);
  width: 92px;                            // 原来80px
  display: flex;
  justify-content: space-between;

  .brow {
    width: 23px;                           // 原来20px
    height: 5px;
    background: #7A6B5A;
    border-radius: 3px;
    
    &.left { transform: rotate(-5deg); }
    &.right { transform: rotate(5deg); }
  }
}

// ---- 眼睛 ----
.eyes {
  position: absolute;
  top: 55px;                             // 原来48px
  left: 50%;
  transform: translateX(-50%);
  width: 86px;                            // 原来76px
  display: flex;
  justify-content: space-between;

  .eye {
    width: 27px;                           // 原来24px
    height: 29px;                          // 原来26px
    background: #FFFFFF;
    border-radius: 50%;
    position: relative;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    transition: height 0.15s ease;

    .eye-pupil {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 15px;                          // 原来13px
      height: 16px;                         // 原来14px
      background: linear-gradient(180deg, #4A3728 0%, #3D2E22 100%);
      border-radius: 50%;

      &::after {
        content: '';
        position: absolute;
        top: 2px;
        right: 2px;
        width: 6px;                           // 原来5px
        height: 6px;
        background: white;
        border-radius: 50%;
      }
    }

    // 眨眼动画
    &.eye-blink {
      height: 2px;
    }
  }
}

// ---- 鼻子 ----
.nose {
  position: absolute;
  top: 90px;                            // 原来78px
  left: 50%;
  transform: translateX(-50%);
  width: 11px;                            // 原来10px
  height: 18px;                           // 原来16px
  background: linear-gradient(90deg, transparent 0%, rgba(210, 175, 145, 0.4) 50%, transparent 100%);
  border-radius: 5px;
}

// ---- 嘴巴 ----
.mouth-container {
  position: absolute;
  bottom: 38px;                           // 原来32px
  left: 50%;
  transform: translateX(-50%);
}

.mouth {
  width: 25px;                            // 原来22px
  height: 10px;                           // 原来9px
  border: none;
  border-radius: 0 0 12px 12px;           // 原来11px
  background: transparent;
  position: relative;
  transition: all 0.2s ease;

  // 待机/默认：温柔微笑
  &.mouth-idle,
  &.mouth-listening,
  &.mouth-healing {
    background: linear-gradient(180deg, #E07A6A 0%, #D66A5A 100%);
    box-shadow: 0 1px 3px rgba(208, 106, 90, 0.25);
  }

  // 说话中：嘴型变化
  &.mouth-talking {
    height: 16px;                          // 原来14px
    width: 20px;                           // 原来18px
    border-radius: 50%;
    background: linear-gradient(180deg, #C96A5A 0%, #B85A4A 100%);
  }

  &.mouth-speaking {
    background: linear-gradient(180deg, #E07A6A 0%, #D66A5A 100%);
  }
}

// ---- 腮红（治愈系特征）----
.blush {
  position: absolute;
  bottom: 40px;                           // 原来34px
  width: 26px;                            // 原来22px
  height: 14px;                           // 原来12px
  background: rgba(240, 160, 150, 0.35);
  border-radius: 50%;
  filter: blur(3px);

  &.left { left: 9px; }                   // 原来8px
  &.right { right: 9px; }                 // 原来8px
}

// ---- 耳朵 ----
.ear {
  position: absolute;
  top: 72px;                             // 原来62px
  width: 18px;                            // 原来16px
  height: 32px;                           // 原来28px
  background: linear-gradient(90deg, #F5D5B8 0%, #FFE0C2 60%, #F5D5B8 100%);
  border-radius: 9px;                     // 原来8px
  z-index: -1;

  &.left-ear { left: -8px; }             // 原来-7px
  &.right-ear { right: -8px; }            // 原来-7px
}

// ---- 颈部 ----
.neck {
  width: 48px;                            // 原来42px
  height: 28px;                            // 原来24px
  margin: 0 auto;
  background: linear-gradient(90deg, #EDCBAE 0%, #FFE0C2 50%, #EDCBAE 100%);
  border-radius: 0 0 10px 10px;           // 原来8px
}

// ---- 上身 ----
.upper-body {
  position: relative;
  width: 172px;                           // 原来150px
  margin: 0 auto;

  .shoulders {
    width: 100%;
    height: 63px;                          // 原来55px
    background: linear-gradient(180deg, $color-primary-light 0%, $color-primary 100%);
    border-radius: 85px 85px 24px 24px;   // 原来75px 75px 20px 20px
    opacity: 0.85;
  }

  .clothing-collar {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 56px;                           // 原来50px
    height: 23px;                           // 原来20px
    background: rgba(255, 255, 255, 0.3);
    border-radius: 0 0 28px 28px;         // 原来25px
  }
}

// ==================== 疗愈粒子效果（增强）====================

.healing-particles {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;

  .particle {
    position: absolute;
    left: calc(50% + var(--px));
    top: calc(40% + var(--py));
    width: 7px;                             // 原来6px
    height: 7px;                            // 原来6px
    background: rgba(167, 147, 193, 0.55); // 原来0.6
    border-radius: 50%;
    animation: particle-float 3.5s ease-in-out infinite;  // 原来3s
    animation-delay: var(--delay);
    filter: blur(1.2px);                    // 原来1px
  }
}

// ==================== 动画关键帧 ====================

// 待机：缓慢呼吸浮动
@keyframes avatar-breathe {
  0%, 100% { 
    transform: translateY(0) scale(1); 
  }
  50% { 
    transform: translateY(-6px) scale(1.008); 
  }
}

// 倾听：轻微点头
@keyframes avatar-nod {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(2.5deg) translateY(1px); }
  40% { transform: rotate(-1.5deg); }
  60% { transform: rotate(1.5deg) translateY(-1px); }
  80% { transform: rotate(-1deg); }
}

// 说话：轻微上下浮动+微缩放
@keyframes avatar-speak-subtle {
  0%, 100% { transform: translateY(0) scale(1); }
  30% { transform: translateY(-2px) scale(1.005); }
  60% { transform: translateY(1px) scale(0.998); }
}

// 疗愈：更柔和的漂浮+发光
@keyframes avatar-healing-float {
  0%, 100% { transform: translateY(0) scale(1); filter: brightness(1); }
  33% { transform: translateY(-8px) scale(1.01); filter: brightness(1.05); }
  66% { transform: translateY(-3px) scale(1.005); filter: brightness(1.02); }
}

// 光晕脉冲
@keyframes glow-pulse-healing {
  from { opacity: 0.6; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1.06); }
}

// 粒子上浮（更柔和）
@keyframes particle-float {
  0% { opacity: 0; transform: translateY(0) scale(0.5) rotate(0deg); }
  25% { opacity: 0.7; }
  60% { opacity: 0.5; }
  100% { opacity: 0; transform: translateY(-48px) scale(1.3) rotate(20deg); }  // 原来-40px, 1.2
}
</style>
