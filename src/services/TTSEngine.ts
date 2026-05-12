/**
 * TTS语音合成引擎
 * 
 * 基于Web Speech Synthesis API封装
 * Demo版固定温柔治愈女声音色
 */
import { TTSStatus, TTSConfig } from '@/types'

export class TTSEngine {
  private status: TTSStatus = TTSStatus.IDLE
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private isSpeaking: boolean = false

  /** 播报完成回调 */
  private onSpeakEndCallback: (() => void) | null = null
  
  /** 状态变更回调 */
  private onStatusChangeCallback: ((status: TTSStatus) => void) | null = null

  /** 默认配置（温柔治愈女声） */
  private config: TTSConfig = {
    rate: 0.9,        // 略慢于正常语速（治愈向）
    pitch: 1.05,      // 略高于中性（温柔感）
    volume: 0.8,      // 中等音量
  }

  /** 可用中文女声列表（按优先级排序） */
  private preferredVoices = [
    // iOS/macOS 中文女声
    'Ting-Ting',       // macOS Ting-Ting
    // Windows 中文女声
    'Huihui',
    'Xiaoxiao',
    // Android 常见中文女声
    'Xiaoyi',
    // 通用匹配关键词
    'Female',
    'Chinese Female',
  ]

  /**
   * 初始化TTS引擎
   * 预加载可用音色列表
   */
  async init(): Promise<boolean> {
    if (!('speechSynthesis' in window)) {
      console.error('[TTSEngine] 浏览器不支持语音合成API')
      this.status = TTSStatus.ERROR
      return false
    }

    // 等待音色列表加载完成
    await this.waitForVoices()

    // 选择最优治愈女声
    this.selectBestVoice()

    console.log('[TTSEngine] ✓ 引擎初始化完成')
    return true
  }

  /**
   * 等待浏览器加载语音列表
   */
  private waitForVoices(): Promise<void> {
    return new Promise((resolve) => {
      const voices = speechSynthesis.getVoices()
      if (voices.length > 0) {
        resolve()
        return
      }
      speechSynthesis.onvoiceschanged = () => resolve()
      setTimeout(resolve, 2000)  // 最多等2秒
    })
  }

  /**
   * 选择最合适的中文女声
   */
  private selectBestVoice(): void {
    const voices = speechSynthesis.getVoices()
    
    for (const name of this.preferredVoices) {
      const voice = voices.find(v =>
        v.name.includes(name) || v.lang.startsWith('zh')
      )
      if (voice) {
        this.config.voiceName = voice.name
        console.log(`[TTSEngine] 选中音色: ${voice.name} (${voice.lang})`)
        return
      }
    }

    // 兜底：选任意中文语音
    const zhVoice = voices.find(v => v.lang.startsWith('zh'))
    if (zhVoice) {
      this.config.voiceName = zhVoice.name
      console.log(`[TTSEngine] 使用备用音色: ${zhVoice.name}`)
    } else {
      console.warn('[TTSEngine] 未找到中文语音，使用默认')
    }
  }

  /**
   * 播报文字
   * @param text 要播报的文本
   * @param overrideConfig 可选覆盖配置
   */
  speak(
    text: string,
    overrideConfig?: TTSConfig,
    onEnd?: () => void,
    onStatusChange?: (status: TTSStatus) => void,
  ): boolean {
    if (!text.trim()) {
      console.warn('[TTSEngine] 空文本，跳过播报')
      return false
    }

    // 如果正在说话，先停止当前播报
    if (this.isSpeaking) {
      this.stop()
    }

    this.onSpeakEndCallback = onEnd || null
    this.onStatusChangeCallback = onStatusChange || null

    // 创建语音实例
    const utterance = new SpeechSynthesisUtterance(text)
    
    // 应用配置
    const finalConfig = { ...this.config, ...overrideConfig }
    utterance.rate = finalConfig.rate ?? 0.9
    utterance.pitch = finalConfig.pitch ?? 1.05
    utterance.volume = finalConfig.volume ?? 0.8

    // 设置语言
    utterance.lang = 'zh-CN'

    // 设置音色
    if (finalConfig.voiceName) {
      const voice = speechSynthesis.getVoices().find(v => v.name === finalConfig.voiceName)
      if (voice) utterance.voice = voice
    }

    // 事件绑定
    utterance.onstart = () => {
      this.isSpeaking = true
      this.setStatus(TTSStatus.SPEAKING)
      console.log(`[TTSEngine] 开始播报: "${text.substring(0, 30)}..."`)
    }

    utterance.onend = () => {
      this.isSpeaking = false
      this.currentUtterance = null
      this.setStatus(TTSStatus.IDLE)
      this.onSpeakEndCallback?.()
      console.log('[TTSEngine] ✓ 播报完成')
    }

    utterance.onerror = (event) => {
      if (event.error !== 'cancelled') {
        console.error('[TTSEngine] 播报错误:', event.error)
        this.setStatus(TTSStatus.ERROR)
      } else {
        // 被打断是正常操作
        this.isSpeaking = false
        this.currentUtterance = null
        this.setStatus(TTSStatus.PAUSED)
      }
    }

    // 边说边打边界事件（用于打断检测）
    utterance.onboundary = () => {
      // 可在此处检测是否需要打断
    }

    // 开始播放
    this.currentUtterance = utterance
    speechSynthesis.speak(utterance)

    return true
  }

  /**
   * 停止当前播报（用户说话时打断）
   */
  stop(): void {
    if (this.isSpeaking) {
      speechSynthesis.cancel()
      this.isSpeaking = false
      this.currentUtterance = null
      this.setStatus(TTSStatus.PAUSED)
      console.log('[TTSEngine] 播报已中断')
    }
  }

  /**
   * 暂停播报（保留位置）
   */
  pause(): void {
    if (this.isSpeaking && !speechSynthesis.paused) {
      speechSynthesis.pause()
      this.setStatus(TTSStatus.PAUSED)
    }
  }

  /**
   * 恢复播报
   */
  resume(): void {
    if (speechSynthesis.paused) {
      speechSynthesis.resume()
      this.setStatus(TTSStatus.SPEAKING)
    }
  }

  /**
   * 是否正在播报
   */
  isCurrentlySpeaking(): boolean {
    return this.isSpeaking
  }

  /**
   * 获取状态
   */
  getStatus(): TTSStatus {
    return this.status
  }

  /**
   * 获取当前配置
   */
  getConfig(): Readonly<TTSConfig> {
    return { ...this.config }
  }

  /**
   * 更新配置（如音量调节）
   */
  updateConfig(partial: Partial<TTSConfig>): void {
    Object.assign(this.config, partial)
  }

  /**
   * 释放资源
   */
  destroy(): void {
    this.stop()
    this.onSpeakEndCallback = null
    this.onStatusChangeCallback = null
    console.log('[TTSEngine] 资源已释放')
  }

  // ==================== 内部 ====================

  private setStatus(status: TTSStatus): void {
    const prev = this.status
    this.status = status
    if (prev !== status) {
      this.onStatusChangeCallback?.(status)
    }
  }
}
