/**
 * Module 5: 深呼吸正念引导服务
 *
 * 标准节奏：吸气4s → 屏息4s → 呼气6s，循环3次。
 * 通过 TTS 逐步播报引导语音，不阻塞对话系统。
 *
 * 设计要点：
 *   - 全程语音引导，无需看屏幕
 *   - 中途可随时语音停止
 *   - 引导过程中形象保持疗愈态
 *   - 完成后自动恢复对话
 */
import {
  BreathPhase, BreathGuideConfig, BreathGuideState,
} from '@/types'

/** TTS播报接口（解耦，由外部注入） */
export interface BreathTTS {
  speak(text: string, onEnd?: () => void): boolean
  stop(): void
}

export class BreathGuide {
  private config: BreathGuideConfig = {
    inhaleDuration: 4,
    holdDuration: 4,
    exhaleDuration: 6,
    cycles: 3,
  }

  private phase: BreathPhase = BreathPhase.IDLE
  private currentCycle = 0
  private elapsed = 0
  private tts: BreathTTS | null = null

  /** 阶段切换定时器 */
  private phaseTimer: ReturnType<typeof setTimeout> | null = null
  /** 状态变更回调 */
  onStateChange: ((state: BreathGuideState) => void) | null = null
  /** 引导完成回调 */
  onComplete: (() => void) | null = null

  /** 注入 TTS 引擎 */
  setTTS(tts: BreathTTS): void {
    this.tts = tts
  }

  /** 获取当前状态 */
  getState(): BreathGuideState {
    return {
      phase: this.phase,
      currentCycle: this.currentCycle,
      totalCycles: this.config.cycles,
      elapsedSeconds: this.elapsed,
    }
  }

  /** 开始引导 */
  start(): boolean {
    if (!this.tts) {
      console.warn('[BreathGuide] TTS未注入，无法开始引导')
      return false
    }
    if (this.phase !== BreathPhase.IDLE && this.phase !== BreathPhase.COMPLETE) {
      console.warn('[BreathGuide] 引导进行中，请先停止')
      return false
    }

    this.currentCycle = 0
    this.elapsed = 0
    this.phase = BreathPhase.IDLE
    console.log('[BreathGuide] 🌬 开始呼吸引导...')

    // 先播报开场白
    this.tts.speak('好，让我们一起做几次深呼吸放松一下。跟着我的节奏来，准备好了吗？', () => {
      this.elapsed += 4  // 开场白约4秒
      this.currentCycle = 1
      this.startInhale()
    })

    this.emit()
    return true
  }

  /** 停止引导 */
  stop(): void {
    this.clearTimer()
    this.tts?.stop()
    this.phase = BreathPhase.IDLE
    this.currentCycle = 0
    this.elapsed = 0
    this.emit()
    console.log('[BreathGuide] ⏹ 引导已停止')
  }

  /** 自定义配置 */
  setConfig(cfg: Partial<BreathGuideConfig>): void {
    Object.assign(this.config, cfg)
  }

  /** 销毁 */
  destroy(): void {
    this.stop()
    this.tts = null
    this.onStateChange = null
    this.onComplete = null
  }

  // ---- 阶段执行 ----

  private startInhale(): void {
    this.phase = BreathPhase.INHALE
    this.emit()

    this.tts!.speak('吸气——', () => {
      this.elapsed += this.config.inhaleDuration
      this.startHold()
    })
  }

  private startHold(): void {
    this.phase = BreathPhase.HOLD
    this.emit()

    this.tts!.speak('屏住——', () => {
      this.elapsed += this.config.holdDuration
      this.startExhale()
    })
  }

  private startExhale(): void {
    this.phase = BreathPhase.EXHALE
    this.emit()

    this.tts!.speak('慢慢呼气——', () => {
      this.elapsed += this.config.exhaleDuration

      if (this.currentCycle < this.config.cycles) {
        this.currentCycle++
        // 短暂停顿后开始下一轮
        this.phaseTimer = setTimeout(() => this.startInhale(), 1500)
      } else {
        this.complete()
      }
    })
  }

  private complete(): void {
    this.phase = BreathPhase.COMPLETE
    this.emit()

    this.tts!.speak('很好，感觉是不是平静了一些？继续保持这个状态，你做得很棒。', () => {
      this.phase = BreathPhase.IDLE
      this.emit()
      this.onComplete?.()
      console.log('[BreathGuide] ✅ 引导完成')
    })
  }

  private clearTimer(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
      this.phaseTimer = null
    }
  }

  private emit(): void {
    this.onStateChange?.(this.getState())
  }
}
