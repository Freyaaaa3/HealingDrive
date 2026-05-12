/**
 * 自动退出计时管理器
 * 
 * 负责30秒无交互自动收起虚拟形象的逻辑：
 * - 对话进行中暂停计时
 * - 语音交互后重置计时
 * - 超时触发自动退出事件
 */
import { AutoExitStatus } from '@/types'
import { AUTO_EXIT_TIMEOUT } from '@/config/constants'

type ExitCallback = () => void

export class AutoExitManager {
  private status: AutoExitStatus = AutoExitStatus.IDLE
  private timer: ReturnType<typeof setTimeout> | null = null
  private startTime: number | null = null
  private remainingTime: number = AUTO_EXIT_TIMEOUT
  
  private onExitCallback: ExitCallback | null = null

  constructor() {}

  /**
   * M8: 设置自定义超时时长（车企配置覆盖默认值）
   */
  setTimeout(ms: number): void {
    this.remainingTime = ms
    console.log(`[AutoExitManager] 超时时长设为 ${ms / 1000}s`)
  }

  /**
   * 设置超时退出回调
   */
  onExit(callback: ExitCallback): void {
    this.onExitCallback = callback
  }

  /**
   * 开始计时（用户停止交互后调用）
   */
  start(): void {
    this.clearTimer()
    this.status = AutoExitStatus.COUNTING
    this.startTime = Date.now()

    console.log(`[AutoExitManager] 开始${this.remainingTime / 1000}秒倒计时`)

    this.timer = setTimeout(() => {
      this.handleTimeout()
    }, this.remainingTime)
  }

  /**
   * 暂停计时（对话进行中调用）
   */
  pause(): void {
    if (this.status !== AutoExitStatus.COUNTING) return

    // 计算剩余时间
    if (this.startTime !== null) {
      const elapsed = Date.now() - this.startTime
      this.remainingTime = Math.max(0, this.remainingTime - elapsed)
    }

    this.clearTimer()
    this.status = AutoExitStatus.PAUSED
    console.log('[AutoExitManager] 计时已暂停')
  }

  /**
   * 恢复计时
   */
  resume(): void {
    if (this.status !== AutoExitStatus.PAUSED) return
    this.start()
  }

  /**
   * 重置计时（有新的语音交互时调用）
   */
  reset(): void {
    this.start()
    console.log('[AutoExitManager] 计时已重置')
  }

  /**
   * 完全停止计时器
   */
  stop(): void {
    this.clearTimer()
    this.status = AutoExitStatus.IDLE
    this.remainingTime = AUTO_EXIT_TIMEOUT
    this.startTime = null
  }

  /** 获取当前状态 */
  getStatus(): AutoExitStatus {
    return this.status
  }

  /** 获取剩余时间(ms) */
  getRemainingTime(): number {
    if (this.status === AutoExitStatus.COUNTING && this.startTime !== null) {
      const elapsed = Date.now() - this.startTime
      return Math.max(0, this.remainingTime - elapsed)
    }
    return this.remainingTime
  }

  /** 是否正在计时 */
  isCounting(): boolean {
    return this.status === AutoExitStatus.COUNTING
  }

  /** 是否已暂停 */
  isPaused(): boolean {
    return this.status === AutoExitStatus.PAUSED
  }

  /** 处理超时 */
  private handleTimeout(): void {
    this.status = AutoExitStatus.EXPIRED
    console.log('[AutoExitManager] ⏰ 30秒无交互，触发自动退出')

    if (this.onExitCallback) {
      this.onExitCallback()
    }
  }

  /** 清理定时器 */
  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  /** 销毁资源 */
  destroy(): void {
    this.stop()
    this.onExitCallback = null
  }
}
