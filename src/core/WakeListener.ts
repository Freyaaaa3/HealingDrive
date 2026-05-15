/**
 * 唤醒词监听服务
 * 负责常驻后台监听固定唤醒词，支持低功耗运行和自动重启
 * Demo版使用Web Speech API进行模拟
 */
import { WakeStatus } from '@/types'
import { WAKE_WORD, RESTART_LISTEN_INTERVAL } from '@/config/constants'

export class WakeListener {
  private status: WakeStatus = WakeStatus.INACTIVE
  private recognition: any = null       // SpeechRecognition实例
  private isListening: boolean = false
  private isManualStop: boolean = false  // 主动停止标志（抑制aborted错误和onend重启）
  private lastError: string = ''        // 最近一次错误类型（供onend判断重启策略）
  private restartTimer: ReturnType<typeof setTimeout> | null = null
  private onWakeDetectedCallback: (() => void) | null = null

  constructor() {
    this.initSpeechRecognition()
  }

  /**
   * 初始化语音识别引擎
   */
  private initSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || 
                              (window as any).webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      console.error('[WakeListener] 浏览器不支持语音识别API')
      this.status = WakeStatus.ERROR
      return
    }

    this.recognition = new SpeechRecognition()
    this.configureRecognition()
  }

  /**
   * 配置语音识别参数
   */
  private configureRecognition(): void {
    if (!this.recognition) return

    this.recognition.continuous = true          // 持续监听
    this.recognition.interimResults = true      // 返回中间结果
    this.recognition.lang = 'zh-CN'             // 中文
    this.recognition.maxAlternatives = 1        // 返回最佳匹配

    // 监听识别结果
    this.recognition.onresult = (event: any) => {
      this.handleRecognitionResult(event)
    }

    // 错误处理
    this.recognition.onerror = (event: any) => {
      // 主动停止产生的 aborted 不做错误处理
      if (this.isManualStop && event.error === 'aborted') {
        return
      }
      this.lastError = event.error
      this.handleError(event.error)
    }

    // 监听结束（可能被意外停止）
    this.recognition.onend = () => {
      if (this.isManualStop) {
        // 主动停止，不重启
        this.isManualStop = false
        this.lastError = ''
        return
      }
      if (this.isListening && this.status !== WakeStatus.ERROR) {
        // no-speech 是浏览器静默超时的正常行为，立即重启避免监听盲区
        if (this.lastError === 'no-speech' || this.lastError === 'aborted') {
          try { this.recognition?.start() } catch (e) { /* ignore */ }
        } else {
          console.log('[WakeListener] 监听意外停止，准备重启...')
          this.scheduleRestart()
        }
      }
      this.lastError = ''
    }
  }

  /**
   * 处理识别结果，检测唤醒词
   */
  private handleRecognitionResult(event: any): void {
    const last = event.results.length - 1
    const transcript = event.results[last][0].transcript.trim().toLowerCase()
    const isFinal = event.results[last].isFinal

    console.log(`[WakeListener] 识别到: "${transcript}" (final: ${isFinal})`)

    // 检测唤醒词
    if (isFinal && this.containsWakeWord(transcript)) {
      console.log('[WakeListener] ✅ 检测到唤醒词!')
      this.status = WakeStatus.DETECTED
      
      // 触发回调
      if (this.onWakeDetectedCallback) {
        this.onWakeDetectedCallback()
      }

      // 临时暂停监听（等待交互完成后恢复）
      this.pause()
    }
  }

  /**
   * 检查文本是否包含唤醒词
   */
  private containsWakeWord(text: string): boolean {
    const wakeWords = [WAKE_WORD.toLowerCase()]
    return wakeWords.some(word => text.includes(word))
  }

  /**
   * 开始监听唤醒词
   * 进入后台低功耗待命状态
   */
  start(onWakeDetected?: () => void): boolean {
    if (this.status === WakeStatus.ERROR) {
      console.error('[WakeListener] 语音识别初始化失败，无法启动')
      return false
    }

    console.log('[WakeListener] 启动唤醒词监听...')
    
    // 设置回调
    if (onWakeDetected) {
      this.onWakeDetectedCallback = onWakeDetected
    }

    this.isListening = true
    this.status = WakeStatus.ACTIVE

    try {
      this.recognition?.start()
      console.log('[WakeListener] ✓ 已进入后台待命状态，监听唤醒词:', WAKE_WORD)
      return true
    } catch (error) {
      console.error('[WakeListener] 启动监听失败:', error)
      this.status = WakeStatus.ERROR
      return false
    }
  }

  /**
   * 暂停监听（例如在交互过程中）
   */
  pause(): void {
    if (!this.isListening) return

    console.log('[WakeListener] 暂停监听')
    this.isListening = false
    this.isManualStop = true    // 标记主动停止，抑制onend重启
    this.cancelRestartTimer()    // 取消可能存在的重启定时器
    try {
      this.recognition?.stop()
    } catch (error) {
      this.isManualStop = false
      console.warn('[WakeListener] 暂停监听异常:', error)
    }
    this.status = WakeStatus.INACTIVE
  }

  /**
   * 恢复监听
   */
  resume(): void {
    if (this.isListening || this.status === WakeStatus.ERROR) return

    console.log('[WakeListener] 恢复监听')
    this.start()
  }

  /**
   * 停止监听并清理资源
   */
  stop(): void {
    console.log('[WakeListener] 停止监听服务')
    
    this.isListening = false
    this.isManualStop = true
    this.cancelRestartTimer()
    
    try {
      this.recognition?.stop()
    } catch (error) {
      // ignore
    }
    
    this.recognition = null
    this.status = WakeStatus.INACTIVE
    this.onWakeDetectedCallback = null
  }

  /**
   * 处理错误并尝试重启
   */
  private handleError(error: string): void {
    switch (error) {
      case 'no-speech':
        // 静默超时，正常行为，不记录
        break
      case 'aborted':
        // 系统取消，正常行为，不记录
        break
      case 'network':
        console.warn('[WakeListener] 网络错误，稍后重试')
        break
      case 'not-allowed':
        console.error('[WakeListener] 麦克风权限被拒绝')
        this.status = WakeStatus.ERROR
        break
      default:
        console.error('[WakeListener] 未知错误:', error)
        this.scheduleRestart()
    }
  }

  /**
   * 定时重启监听（进程被系统查杀后自动恢复）
   */
  private scheduleRestart(): void {
    if (this.restartTimer) return

    console.log(`[WakeListener] 将在${RESTART_LISTEN_INTERVAL / 1000}秒后自动重启监听`)
    
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null
      if (this.isListening) {
        console.log('[WakeListener] 自动重启监听服务')
        try {
          this.recognition?.start()
        } catch (error) {
          console.warn('[WakeListener] 重启失败:', error)
          this.scheduleRestart()
        }
      }
    }, RESTART_LISTEN_INTERVAL)
  }

  /**
   * 取消重启定时器
   */
  private cancelRestartTimer(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }
  }

  /**
   * 获取当前监听状态
   */
  getStatus(): WakeStatus {
    return this.status
  }

  /**
   * 是否正在监听
   */
  isActive(): boolean {
    return this.isListening && this.status === WakeStatus.ACTIVE
  }
}
