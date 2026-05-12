/**
 * Module 5: 核心疗愈服务 —— 疗愈策略编排器
 *
 * 基于 M4 情绪识别结果 + 司机画像，自动匹配并执行疗愈策略。
 * 统一管理四大疗愈能力：共情对话 / 舒缓音乐 / 深呼吸引导 / 停车推荐。
 *
 * 设计要点：
 *   - 情绪→策略自动匹配（愤怒/焦虑/烦躁/疲劳/平稳）
 *   - 用户可自由语音切换任意疗愈服务
 *   - 所有能力仅语音触发，无UI按钮
 *   - 会话结束/退出时自动停止所有疗愈服务
 */
import {
  EmotionType, EmotionIntensity,
  HealingStrategy, HealingStrategyMatch,
  HealingServiceState, ParkingSpot,
  VoiceCommandType,
  EnhancedDriverProfile,
} from '@/types'
import { EmpatheticResponder } from './EmpatheticResponder'
import { MusicPlayer } from './MusicPlayer'
import { BreathGuide, BreathTTS } from './BreathGuide'
import { ParkingFinder } from './ParkingFinder'

/** 疗愈服务回调 */
export interface HealingServiceCallbacks {
  /** 需要播报文本（外部TTS引擎执行） */
  onSpeak?: (text: string) => void
  /** 状态变更 */
  onStateChange?: (state: HealingServiceState) => void
}

export class HealingService {
  readonly responder: EmpatheticResponder
  readonly musicPlayer: MusicPlayer
  readonly breathGuide: BreathGuide
  readonly parkingFinder: ParkingFinder

  private currentStrategy: HealingStrategyMatch | null = null
  private lastParkingSpots: ParkingSpot[] = []
  private callbacks: HealingServiceCallbacks = {}

  constructor(tts?: BreathTTS) {
    this.responder = new EmpatheticResponder()
    this.musicPlayer = new MusicPlayer()
    this.breathGuide = new BreathGuide()
    this.parkingFinder = new ParkingFinder()

    if (tts) this.breathGuide.setTTS(tts)

    // 音乐状态变更 → 上报
    this.musicPlayer.onStateChange = () => this.emit()

    // 呼吸引导状态变更 → 上报
    this.breathGuide.onStateChange = () => this.emit()

    // 呼吸引导完成 → 播报总结
    this.breathGuide.onComplete = () => {
      this.callbacks.onStateChange?.(this.getState())
    }
  }

  /** 设置回调 */
  setCallbacks(cbs: HealingServiceCallbacks): void {
    this.callbacks = { ...this.callbacks, ...cbs }
  }

  /** 获取完整状态 */
  getState(): HealingServiceState {
    return {
      currentStrategy: this.currentStrategy,
      music: this.musicPlayer.getState(),
      breath: this.breathGuide.getState(),
      lastParkingSpots: this.lastParkingSpots,
    }
  }

  // ==================== 策略匹配 ====================

  /**
   * 根据情绪结果自动匹配疗愈策略
   * M6 升级：结合增强画像做差异化策略
   */
  matchStrategy(emotion: EmotionType, intensity: EmotionIntensity, enhancedProfile?: EnhancedDriverProfile | null): HealingStrategyMatch {
    // 基础策略映射
    const baseStrategies: Record<string, HealingStrategyMatch> = {
      [EmotionType.ANGER]: {
        primary: HealingStrategy.EMPATHETIC_DIALOG,
        optional: [HealingStrategy.SOOTHING_MUSIC, HealingStrategy.BREATH_GUIDE, HealingStrategy.PARKING_RECOMMEND],
        reason: '高共情安抚 + 全疗愈能力可选',
      },
      [EmotionType.ANXIETY]: {
        primary: HealingStrategy.EMPATHETIC_DIALOG,
        optional: [HealingStrategy.SOOTHING_MUSIC, HealingStrategy.BREATH_GUIDE],
        reason: '轻度疏导 + 基础疗愈',
      },
      [EmotionType.IRRITABILITY]: {
        primary: HealingStrategy.EMPATHETIC_DIALOG,
        optional: [HealingStrategy.SOOTHING_MUSIC, HealingStrategy.BREATH_GUIDE],
        reason: '轻度疏导 + 舒缓音乐/呼吸引导',
      },
      [EmotionType.FATIGUE]: {
        primary: HealingStrategy.EMPATHETIC_DIALOG,
        optional: [HealingStrategy.SOOTHING_MUSIC],
        reason: '温柔关怀 + 放松音乐引导',
      },
      [EmotionType.CALM]: {
        primary: HealingStrategy.EMPATHETIC_DIALOG,
        optional: [],
        reason: '日常闲聊陪伴',
      },
    }

    let match = baseStrategies[emotion] || baseStrategies[EmotionType.CALM]

    // M6: 画像差异化策略调整
    if (enhancedProfile && enhancedProfile.stability !== 'new') {
      match = this.adjustStrategyByProfile(match, emotion, intensity, enhancedProfile)
    }

    this.currentStrategy = match
    this.emit()
    return match
  }

  /**
   * M6: 根据画像微调疗愈策略
   */
  private adjustStrategyByProfile(
    base: HealingStrategyMatch,
    emotion: EmotionType,
    _intensity: EmotionIntensity,
    profile: EnhancedDriverProfile,
  ): HealingStrategyMatch {
    const reason: string[] = [base.reason]

    // 易激怒用户 + 愤怒 → 自动推荐呼吸引导作为优先可选
    if (profile.emotionHabits.includes('quick_temper' as any) && emotion === EmotionType.ANGER) {
      if (!base.optional.includes(HealingStrategy.BREATH_GUIDE)) {
        base.optional.push(HealingStrategy.BREATH_GUIDE)
      }
      reason.push('易激怒画像: 推荐呼吸引导')
    }

    // 路况敏感 + 拥堵场景 → 优先停车推荐
    if (profile.emotionHabits.includes('traffic_sensitive' as any)) {
      if (!base.optional.includes(HealingStrategy.PARKING_RECOMMEND)) {
        base.optional.push(HealingStrategy.PARKING_RECOMMEND)
      }
      reason.push('路况敏感画像: 可选停车推荐')
    }

    // 易疲劳用户 → 疲劳时自动播放音乐
    if (profile.emotionHabits.includes('fatigue_prone' as any) && emotion === EmotionType.FATIGUE) {
      base.primary = HealingStrategy.SOOTHING_MUSIC
      reason.push('易疲劳画像: 优先舒缓音乐')
    }

    // 内向用户 + 平稳情绪 → 仅对话不推荐额外服务
    if (profile.extroversion < -0.3 && emotion === EmotionType.CALM) {
      base.optional = []
      reason.push('内向画像: 安静陪伴模式')
    }

    return { ...base, reason: reason.join(' | ') }
  }

  // ==================== 语音指令处理 ====================

  /**
   * 处理疗愈相关语音指令
   * @returns true=已处理, false=未处理
   */
  handleCommand(command: VoiceCommandType, _text: string): boolean {
    switch (command) {
      case VoiceCommandType.PLAY_MUSIC:
        this.playMusic()
        return true
      case VoiceCommandType.STOP_MUSIC:
        this.stopMusic()
        return true
      case VoiceCommandType.DEEP_BREATH:
        this.startBreathGuide()
        return true
      case VoiceCommandType.FIND_PARKING:
        this.findParking()
        return true
      default:
        return false
    }
  }

  /** 检查是否是停止呼吸引导的指令 */
  isStopBreathCommand(text: string): boolean {
    return /停止引导|别引导了|停止呼吸|够了/.test(text)
  }

  // ==================== 疗愈能力调用 ====================

  /** 播放舒缓音乐 */
  private playMusic(): void {
    const ok = this.musicPlayer.play()
    if (ok) {
      const track = this.musicPlayer.getState().currentTrack
      const msg = this.responder.generateCommandResponse('music')
      this.callbacks.onSpeak?.(track ? `${msg} 正在播放《${track.name}》。` : msg)
    } else {
      this.callbacks.onSpeak?.('抱歉，暂时无法播放音乐。')
    }
  }

  /** 停止音乐 */
  private stopMusic(): void {
    this.musicPlayer.stop()
    this.callbacks.onSpeak?.(this.responder.generateCommandResponse('stop_music'))
  }

  /** 开始呼吸引导 */
  private startBreathGuide(): void {
    // 如果正在引导中，先提示
    if (this.breathGuide.getState().phase !== 'idle') {
      this.callbacks.onSpeak?.('呼吸引导正在进行中哦，再说"停止引导"就可以结束。')
      return
    }
    const ok = this.breathGuide.start()
    if (!ok) {
      this.callbacks.onSpeak?.('抱歉，暂时无法开始呼吸引导。')
    }
    // 开场白由 BreathGuide 内部 TTS 播报，不需要额外的 onSpeak
  }

  /** 停止呼吸引导 */
  stopBreathGuide(): void {
    if (this.breathGuide.getState().phase === 'idle') return
    this.breathGuide.stop()
    this.callbacks.onSpeak?.(this.responder.generateCommandResponse('breath_stop'))
  }

  /** 查找停车点 */
  private findParking(): void {
    const spots = this.parkingFinder.findNearby()
    this.lastParkingSpots = spots
    const text = this.parkingFinder.generateSpotsText(spots)
    this.callbacks.onSpeak?.(text)
    this.emit()
  }

  // ==================== 生命周期 ====================

  /**
   * 会话结束时停止所有疗愈服务
   */
  stopAll(): void {
    this.musicPlayer.stop()
    this.breathGuide.stop()
    this.currentStrategy = null
    this.emit()
    console.log('[HealingService] 所有疗愈服务已停止')
  }

  /**
   * 音频通道被抢占
   */
  onAudioChannelBusy(): void {
    this.musicPlayer.onAudioChannelBusy()
  }

  /**
   * 音频通道释放
   */
  onAudioChannelFree(): void {
    this.musicPlayer.onAudioChannelFree()
  }

  /** 销毁 */
  destroy(): void {
    this.stopAll()
    this.musicPlayer.destroy()
    this.breathGuide.destroy()
    this.callbacks = {}
  }

  private emit(): void {
    this.callbacks.onStateChange?.(this.getState())
  }
}
