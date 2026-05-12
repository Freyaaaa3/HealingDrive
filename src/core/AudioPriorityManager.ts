/**
 * Module 9: 音频优先级管理器
 *
 * 管理座舱音频通道的优先级抢占。
 * 规则（PRD 2.2 & 3.3）：
 *   - 导航/蓝牙通话 ＞ 疗愈语音 ＞ 车载音乐
 *   - 蓝牙通话中：暂停所有倾听与播报
 *   - 座舱音频被占用：拦截唤醒，静默待命
 *   - 导航播报中：降低疗愈语音音量
 *
 * Demo版通过 document.visibilitychange + 自定义事件模拟音频通道抢占。
 * 正式版需接入座舱音频系统API。
 */
import { AudioPriority, AudioChannelState, AudioChannelEvent } from '@/types'

/** 优先级来源名称 */
export const PRIORITY_SOURCE_NAMES: Record<AudioPriority, string> = {
  [AudioPriority.PHONE_CALL]: '蓝牙通话',
  [AudioPriority.NAVIGATION]: '导航播报',
  [AudioPriority.HEALING_AGENT]: '疗愈语音',
  [AudioPriority.MUSIC]: '车载音乐',
}

export type ChannelChangeListener = (state: AudioChannelState, event: AudioChannelEvent) => void

export class AudioPriorityManager {
  private state: AudioChannelState = {
    isBusy: false,
    busySource: null,
    busyPriority: null,
  }

  private listeners: ChannelChangeListener[] = []
  private currentHealingPriority = AudioPriority.HEALING_AGENT

  constructor() {
    console.log('[AudioPriorityManager] 初始化完成')
  }

  /**
   * 请求占用音频通道
   * @param priority 请求方优先级
   * @param source 请求方名称
   * @returns 是否成功占用
   */
  request(priority: AudioPriority, source: string): boolean {
    // 已经被同源占用
    if (this.state.isBusy && this.state.busyPriority === priority && this.state.busySource === source) {
      return true
    }

    // 空闲或被低优先级占用 → 可以抢占
    if (!this.state.isBusy || (this.state.busyPriority !== null && priority <= this.state.busyPriority)) {
      const prevState = { ...this.state }
      this.state = { isBusy: true, busySource: source, busyPriority: priority }
      this.notify(prevState, AudioChannelEvent.OCCUPIED)
      console.log(`[AudioPriority] 通道被 ${source} 占用 (priority=${priority})`)
      return true
    }

    // 被高优先级占用 → 拒绝
    console.log(`[AudioPriority] ${source} 请求被拒绝，通道被 ${this.state.busySource} 占用`)
    return false
  }

  /**
   * 释放音频通道
   * @param source 释放方名称（仅同源可释放）
   */
  release(source: string): void {
    if (!this.state.isBusy || this.state.busySource !== source) return

    const prevState = { ...this.state }
    this.state = { isBusy: false, busySource: null, busyPriority: null }
    this.notify(prevState, AudioChannelEvent.RELEASED)
    console.log(`[AudioPriority] ${source} 已释放通道`)
  }

  /**
   * 检查疗愈Agent是否可以播放
   * 规则：蓝牙通话中 → 完全暂停；导航播报中 → 允许但降音量
   */
  canHealingSpeak(): { allowed: boolean; volumeMultiplier: number } {
    if (!this.state.isBusy) return { allowed: true, volumeMultiplier: 1.0 }

    const diff = this.state.busyPriority - this.currentHealingPriority
    if (diff < 0) {
      // 对方优先级更高
      if (this.state.busyPriority === AudioPriority.PHONE_CALL) {
        // 通话中：完全暂停
        return { allowed: false, volumeMultiplier: 0 }
      }
      // 导航播报中：降低音量
      return { allowed: true, volumeMultiplier: 0.4 }
    }

    return { allowed: true, volumeMultiplier: 1.0 }
  }

  /**
   * 检查是否可以监听语音（唤醒/ASR）
   * 通话中 → 禁止监听；导航中 → 允许
   */
  canListen(): boolean {
    if (!this.state.isBusy) return true
    // 蓝牙通话中禁止监听
    return this.state.busyPriority !== AudioPriority.PHONE_CALL
  }

  /**
   * 模拟高优先级源抢占（Demo调试用）
   * 正式版替换为座舱音频事件监听
   */
  simulateOccupied(priority: AudioPriority): void {
    const source = PRIORITY_SOURCE_NAMES[priority]
    this.request(priority, source)
  }

  /**
   * 模拟释放（Demo调试用）
   */
  simulateRelease(): void {
    if (this.state.busySource) {
      this.release(this.state.busySource)
    }
  }

  /** 获取当前通道状态 */
  getState(): AudioChannelState {
    return { ...this.state }
  }

  /** 注册状态变更监听 */
  onChange(fn: ChannelChangeListener): () => void {
    this.listeners.push(fn)
    return () => {
      const idx = this.listeners.indexOf(fn)
      if (idx >= 0) this.listeners.splice(idx, 1)
    }
  }

  private notify(prevState: AudioChannelState, event: AudioChannelEvent): void {
    const state = this.getState()
    this.listeners.forEach(fn => {
      try { fn(state, event) } catch { /* ignore */ }
    })
  }

  /** 销毁 */
  destroy(): void {
    this.listeners.length = 0
    this.state = { isBusy: false, busySource: null, busyPriority: null }
  }
}
