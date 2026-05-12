/**
 * ASR语音转文字引擎
 * 
 * 基于Web Speech API封装，支持流式实时识别
 * Demo版仅支持标准普通话
 */
import { ASRStatus, ASRResult } from '@/types'

export class ASREngine {
  private recognition: any = null          // SpeechRecognition实例
  private status: ASRStatus = ASRStatus.IDLE
  private isListeningForInput: boolean = false

  /** 最终结果回调 */
  private onFinalResultCallback: ((result: ASRResult) => void) | null = null
  
  /** 中间结果回调（实时显示用） */
  private onInterimCallback: ((text: string) => void) | null = null

  /** 错误回调 */
  private onErrorCallback: ((error: string) => void) | null = null

  /** 状态变更回调 */
  private onStatusChangeCallback: ((status: ASRStatus) => void) | null = null

  /**
   * 初始化ASR引擎
   */
  init(): boolean {
    const SpeechRecognition = (window as any).SpeechRecognition ||
                              (window as any).webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      console.error('[ASREngine] 浏览器不支持语音识别API')
      this.setStatus(ASRStatus.ERROR)
      return false
    }

    this.recognition = new SpeechRecognition()
    this.configure()
    console.log('[ASREngine] ✓ 引擎初始化完成')
    return true
  }

  /**
   * 配置识别参数（中文连续识别）
   */
  private configure(): void {
    if (!this.recognition) return

    this.recognition.continuous = true        // 连续识别（支持多轮对话）
    this.recognition.interimResults = true    // 返回中间结果（实时显示）
    this.recognition.lang = 'zh-CN'          // 标准普通话
    this.recognition.maxAlternatives = 1     // 最佳匹配

    // 结果处理
    this.recognition.onresult = (event: any) => {
      this.handleResult(event)
    }

    // 错误处理
    this.recognition.onerror = (event: any) => {
      this.handleError(event.error)
    }

    // 结束事件（可能被系统停止）
    this.recognition.onend = () => {
      if (this.isListeningForInput && this.status !== ASRStatus.ERROR) {
        console.warn('[ASREngine] 意外停止，自动重启...')
        try { this.recognition?.start() } catch(e) { /* ignore */ }
      }
    }
  }

  /**
   * 处理识别结果
   */
  private handleResult(event: any): void {
    const last = event.results.length - 1
    const result = event.results[last]
    const transcript = result[0].transcript.trim()
    const isFinal = result.isFinal

    if (isFinal && transcript) {
      const asrResult: ASRResult = {
        text: transcript,
        isFinal: true,
        confidence: result[0].confidence || 0.85,
        timestamp: Date.now(),
      }

      console.log(`[ASREngine] 最终识别: "${transcript}" (${asrResult.confidence.toFixed(2)})`)
      
      this.setStatus(ASRStatus.SUCCESS)
      this.onFinalResultCallback?.(asrResult)
    } else if (!isFinal && transcript) {
      // 中间结果：用于实时显示用户正在说的话
      this.onInterimCallback?.(transcript)
    }
  }

  /**
   * 处理错误
   */
  private handleError(error: string): void {
    switch (error) {
      case 'no-speech':
        // 无语音，正常情况，不报错
        break
      case 'audio-capture':
        console.error('[ASREngine] 麦克风未检测到声音')
        this.onErrorCallback?.('没听清，请再说一遍')
        break
      case 'not-allowed':
        console.error('[ASREngine] 麦克风权限被拒绝')
        this.setStatus(ASRStatus.ERROR)
        this.onErrorCallback?.('麦克风权限不足')
        break
      case 'network':
        console.warn('[ASREngine] 网络错误，重试中...')
        break
      default:
        console.error(`[ASREngine] 识别错误: ${error}`)
        this.onErrorCallback?.(`识别异常: ${error}`)
    }
  }

  /**
   * 开始监听用户语音输入（唤醒后调用）
   * @returns 是否启动成功
   */
  startListening(
    onFinalResult: (result: ASRResult) => void,
    onInterim?: (text: string) => void,
    onError?: (error: string) => void,
    onStatusChange?: (status: ASRStatus) => void,
  ): boolean {
    if (!this.recognition) {
      console.error('[ASREngine] 未初始化')
      return false
    }

    // 设置回调
    this.onFinalResultCallback = onFinalResult
    this.onInterimCallback = onInterim || null
    this.onErrorCallback = onError || null
    this.onStatusChangeCallback = onStatusChange || null

    this.isListeningForInput = true
    this.setStatus(ASRStatus.LISTENING)

    try {
      this.recognition.start()
      console.log('[ASREngine] ✓ 开始倾听用户输入')
      return true
    } catch (e) {
      // 可能已在运行
      console.log('[ASREngine] 已在运行或需重启')
      try {
        this.recognition.stop()
        setTimeout(() => this.recognition.start(), 100)
      } catch (e2) {
        console.error('[ASREngine] 重启失败:', e2)
        return false
      }
      return true
    }
  }

  /**
   * 停止监听（Agent回复时暂停）
   */
  stopListening(): void {
    if (!this.isListeningForInput) return

    this.isListeningForInput = false
    this.setStatus(ASRStatus.IDLE)

    try {
      this.recognition?.stop()
    } catch (e) {
      // ignore
    }

    console.log('[ASREngine] 停止倾听')
  }

  /**
   * 暂停监听（不释放资源，可快速恢复）
   */
  pause(): void {
    if (this.status === ASRStatus.LISTENING) {
      this.setStatus(ASRStatus.IDLE)
      try { this.recognition?.stop() } catch(e) {}
    }
  }

  /**
   * 恢复监听
   */
  resume(): void {
    if (this.isListeningForInput && this.status === ASRStatus.IDLE) {
      this.setStatus(ASRStatus.LISTENING)
      try { this.recognition?.start() } catch(e) {}
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(): ASRStatus {
    return this.status
  }

  /**
   * 是否正在监听输入
   */
  isActive(): boolean {
    return this.status === ASRStatus.LISTENING
  }

  /**
   * 释放资源
   */
  destroy(): void {
    this.stopListening()
    this.recognition = null
    this.setStatus(ASRStatus.IDLE)
    console.log('[ASREngine] 资源已释放')
  }

  // ==================== 内部 ====================

  private setStatus(status: ASRStatus): void {
    const prev = this.status
    this.status = status
    if (prev !== status) {
      this.onStatusChangeCallback?.(status)
    }
  }
}
