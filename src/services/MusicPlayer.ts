/**
 * Module 5: 舒缓音乐播放服务
 *
 * Demo版使用 Web Audio API 合成环境音（正弦波叠加），
 * 后续替换为真实音频资源播放。
 *
 * 设计要点：
 *   - 导航/通话优先级 > 疗愈音乐，音频通道被占用时自动暂停
 *   - 顺序循环播放，不支持切歌/收藏（Demo简化）
 *   - 播放失败自动换下一首
 */
import {
  MusicPlayState, MusicTrack, MusicPlayerState,
} from '@/types'

/** Demo版内置治愈曲目（Web Audio 合成参数） */
const DEMO_TRACKS: MusicTrack[] = [
  { id: 't1', name: '星空冥想', frequency: 220, waveType: 'sine', calmness: 0.9 },
  { id: 't2', name: '森林晨雾', frequency: 261.6, waveType: 'sine', calmness: 0.85 },
  { id: 't3', name: '月光小溪', frequency: 293.7, waveType: 'triangle', calmness: 0.88 },
  { id: 't4', name: '云端漫步', frequency: 329.6, waveType: 'sine', calmness: 0.82 },
  { id: 't5', name: '静谧山谷', frequency: 196, waveType: 'triangle', calmness: 0.92 },
]

export class MusicPlayer {
  private audioCtx: AudioContext | null = null
  private oscillatorNode: OscillatorNode | null = null
  private gainNode: GainNode | null = null
  private trackIndex = 0
  private status: MusicPlayState = MusicPlayState.STOPPED
  private volume = 0.3
  /** 自动下一首定时器 */
  private nextTimer: ReturnType<typeof setTimeout> | null = null
  /** 单曲播放时长 (Demo: 每首30s后切下一首) */
  private readonly TRACK_DURATION = 30_000

  /** 状态变更回调 */
  onStateChange: ((state: MusicPlayerState) => void) | null = null

  /** 获取曲目列表 */
  getTracks(): MusicTrack[] {
    return [...DEMO_TRACKS]
  }

  /** 获取当前状态 */
  getState(): MusicPlayerState {
    return {
      status: this.status,
      currentTrack: DEMO_TRACKS[this.trackIndex] || null,
      volume: this.volume,
      trackIndex: this.trackIndex,
    }
  }

  /** 播放（从当前曲目开始或继续暂停） */
  play(): boolean {
    try {
      if (this.status === MusicPlayState.PAUSED) {
        this.audioCtx?.resume()
        this.status = MusicPlayState.PLAYING
        this.emit()
        return true
      }

      this.stopInternal()
      this.audioCtx = new AudioContext()

      const track = DEMO_TRACKS[this.trackIndex]
      if (!track) return false

      // 创建振荡器 → 增益 → 输出
      const osc = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()

      osc.type = track.waveType
      osc.frequency.setValueAtTime(track.frequency, this.audioCtx.currentTime)

      // 淡入效果 (2秒)
      gain.gain.setValueAtTime(0, this.audioCtx.currentTime)
      gain.gain.linearRampToValueAtTime(this.volume, this.audioCtx.currentTime + 2)

      osc.connect(gain)
      gain.connect(this.audioCtx.destination)
      osc.start()

      this.oscillatorNode = osc
      this.gainNode = gain
      this.status = MusicPlayState.PLAYING

      // 定时切下一首
      this.nextTimer = setTimeout(() => this.playNext(), this.TRACK_DURATION)

      this.emit()
      console.log(`[MusicPlayer] ▶️ 正在播放: ${track.name}`)
      return true
    } catch (e) {
      console.warn('[MusicPlayer] 播放失败:', e)
      return false
    }
  }

  /** 暂停 */
  pause(): void {
    if (this.status !== MusicPlayState.PLAYING) return
    this.audioCtx?.suspend()
    this.status = MusicPlayState.PAUSED
    this.clearNextTimer()
    this.emit()
    console.log('[MusicPlayer] ⏸ 已暂停')
  }

  /** 停止 */
  stop(): void {
    this.stopInternal()
    this.status = MusicPlayState.STOPPED
    this.emit()
    console.log('[MusicPlayer] ⏹ 已停止')
  }

  /** 下一首 */
  playNext(): void {
    this.stopInternal()
    this.trackIndex = (this.trackIndex + 1) % DEMO_TRACKS.length
    this.play()
  }

  /** 设置音量 (0-1) */
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.linearRampToValueAtTime(
        this.volume, this.audioCtx.currentTime + 0.5
      )
    }
    this.emit()
  }

  /** 音频通道被抢占时自动暂停（供外部调用） */
  onAudioChannelBusy(): void {
    if (this.status === MusicPlayState.PLAYING) {
      this.pause()
      console.log('[MusicPlayer] 音频通道被占用，自动暂停')
    }
  }

  /** 音频通道释放后恢复 */
  onAudioChannelFree(): void {
    if (this.status === MusicPlayState.PAUSED) {
      this.play()
      console.log('[MusicPlayer] 音频通道释放，恢复播放')
    }
  }

  /** 销毁 */
  destroy(): void {
    this.stopInternal()
    this.audioCtx?.close()
    this.audioCtx = null
    this.onStateChange = null
  }

  // ---- 内部方法 ----

  private stopInternal(): void {
    this.clearNextTimer()
    try {
      if (this.gainNode && this.audioCtx) {
        // 淡出 (0.5秒)
        this.gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.5)
      }
      setTimeout(() => {
        try { this.oscillatorNode?.stop() } catch {}
        this.oscillatorNode = null
        this.gainNode = null
      }, 600)
    } catch {}
  }

  private clearNextTimer(): void {
    if (this.nextTimer) {
      clearTimeout(this.nextTimer)
      this.nextTimer = null
    }
  }

  private emit(): void {
    this.onStateChange?.(this.getState())
  }
}
