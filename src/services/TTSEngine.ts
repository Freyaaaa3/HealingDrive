/**
 * TTS 语音合成引擎
 *
 * - browser：Web Speech Synthesis（默认）
 * - http：请求本地/内网 RealtimeTTS 配套服务（Edge 神经声线，与仓库内 RealtimeTTS/EdgeEngine 同通道）
 *
 * 启用 http：设置 VITE_TTS_MODE=http 或配置 VITE_TTS_HTTP_URL（如 http://127.0.0.1:5123），
 * 并运行 scripts/realtimetts_edge_server.py。未配置时仍使用浏览器 SpeechSynthesis。
 */
import { TTSStatus, TTSConfig } from '@/types'

function resolveUseHttpTts(): boolean {
  const mode = (import.meta.env.VITE_TTS_MODE || '').toLowerCase().trim()
  if (mode === 'http') return true
  return !!(import.meta.env.VITE_TTS_HTTP_URL || '').trim()
}

function ttsBaseUrl(): string {
  const u = (import.meta.env.VITE_TTS_HTTP_URL || 'http://127.0.0.1:5123').trim()
  return u.replace(/\/$/, '')
}

function defaultEdgeVoice(): string {
  return (import.meta.env.VITE_TTS_EDGE_VOICE || 'zh-CN-XiaoxiaoNeural').trim()
}

export class TTSEngine {
  private status: TTSStatus = TTSStatus.IDLE
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private isSpeaking: boolean = false
  private readonly useHttp: boolean = resolveUseHttpTts()

  private currentAudio: HTMLAudioElement | null = null
  private currentObjectUrl: string | null = null

  private onSpeakEndCallback: (() => void) | null = null
  private onStatusChangeCallback: ((status: TTSStatus) => void) | null = null

  private config: TTSConfig = {
    rate: 0.9,
    pitch: 1.05,
    volume: 0.8,
  }

  private preferredVoices = [
    'Ting-Ting',
    'Huihui',
    'Xiaoxiao',
    'Xiaoyi',
    'Female',
    'Chinese Female',
  ]

  async init(): Promise<boolean> {
    if (this.useHttp) {
      console.log('[TTSEngine] HTTP 模式（RealtimeTTS/Edge 配套服务），跳过浏览器语音列表')
      return true
    }

    if (!('speechSynthesis' in window)) {
      console.error('[TTSEngine] 浏览器不支持语音合成API')
      this.status = TTSStatus.ERROR
      return false
    }

    await this.waitForVoices()
    this.selectBestVoice()
    console.log('[TTSEngine] ✓ 引擎初始化完成（浏览器）')
    return true
  }

  private waitForVoices(): Promise<void> {
    return new Promise((resolve) => {
      const voices = speechSynthesis.getVoices()
      if (voices.length > 0) {
        resolve()
        return
      }
      speechSynthesis.onvoiceschanged = () => resolve()
      setTimeout(resolve, 2000)
    })
  }

  private selectBestVoice(): void {
    const voices = speechSynthesis.getVoices()

    for (const name of this.preferredVoices) {
      const voice = voices.find((v) => v.name.includes(name) || v.lang.startsWith('zh'))
      if (voice) {
        this.config.voiceName = voice.name
        console.log(`[TTSEngine] 选中音色: ${voice.name} (${voice.lang})`)
        return
      }
    }

    const zhVoice = voices.find((v) => v.lang.startsWith('zh'))
    if (zhVoice) {
      this.config.voiceName = zhVoice.name
      console.log(`[TTSEngine] 使用备用音色: ${zhVoice.name}`)
    } else {
      console.warn('[TTSEngine] 未找到中文语音，使用默认')
    }
  }

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

    if (this.isSpeaking) {
      this.stop()
    }

    this.onSpeakEndCallback = onEnd || null
    this.onStatusChangeCallback = onStatusChange || null

    if (this.useHttp) {
      void this.speakHttp(text, overrideConfig)
      return true
    }

    return this.speakBrowser(text, overrideConfig)
  }

  private async speakHttp(text: string, overrideConfig?: TTSConfig): Promise<void> {
    const finalConfig = { ...this.config, ...overrideConfig }
    const voice =
      (finalConfig.voiceName && (finalConfig.voiceName.includes('zh-') || finalConfig.voiceName.includes('Neural')))
        ? finalConfig.voiceName
        : defaultEdgeVoice()

    this.setStatus(TTSStatus.SPEAKING)
    this.isSpeaking = true
    let playbackDone = false  // 防止 onended 后又触发 onerror

    try {
      const res = await fetch(`${ttsBaseUrl()}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice,
          rate: finalConfig.rate,
          volume: finalConfig.volume,
        }),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText)
        console.error('[TTSEngine] HTTP 合成失败', res.status, errText)
        this.fallbackToBrowserTTS(text, overrideConfig)
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      this.currentObjectUrl = url
      const audio = new Audio(url)
      this.currentAudio = audio
      audio.volume = typeof finalConfig.volume === 'number' ? finalConfig.volume : 0.8

      audio.onended = () => {
        if (playbackDone) return
        playbackDone = true
        this.cleanupHttpAudio()
        this.isSpeaking = false
        this.setStatus(TTSStatus.IDLE)
        this.onSpeakEndCallback?.()
        console.log('[TTSEngine] ✓ HTTP 播报完成')
      }

      audio.onerror = () => {
        if (playbackDone) return
        playbackDone = true
        console.warn('[TTSEngine] HTTP 音频播放异常，降级到浏览器 TTS')
        this.cleanupHttpAudio()
        this.fallbackToBrowserTTS(text, overrideConfig)
      }

      await audio.play()
      console.log(`[TTSEngine] HTTP 开始播报: "${text.substring(0, 30)}..."`)
    } catch (e) {
      if (playbackDone) return
      playbackDone = true
      console.warn('[TTSEngine] HTTP 服务不可用，降级到浏览器 TTS:', (e as Error)?.message)
      this.cleanupHttpAudio()
      this.fallbackToBrowserTTS(text, overrideConfig)
    }
  }

  /**
   * HTTP TTS 失败时降级到浏览器 SpeechSynthesis
   */
  private fallbackToBrowserTTS(text: string, overrideConfig?: TTSConfig): void {
    console.warn('[TTSEngine] 降级到浏览器 TTS')
    // 临时切回 browser 模式只播报本次文本
    const savedHttp = this.useHttp
    this.useHttp = false
    this.speakBrowser(text, overrideConfig)
    this.useHttp = savedHttp
  }

  private cleanupHttpAudio(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause()
      } catch {
        /* ignore */
      }
      this.currentAudio.src = ''
      this.currentAudio = null
    }
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl)
      this.currentObjectUrl = null
    }
  }

  private speakBrowser(text: string, overrideConfig?: TTSConfig): boolean {
    const utterance = new SpeechSynthesisUtterance(text)

    const finalConfig = { ...this.config, ...overrideConfig }
    utterance.rate = finalConfig.rate ?? 0.9
    utterance.pitch = finalConfig.pitch ?? 1.05
    utterance.volume = finalConfig.volume ?? 0.8
    utterance.lang = 'zh-CN'

    if (finalConfig.voiceName) {
      const voice = speechSynthesis.getVoices().find((v) => v.name === finalConfig.voiceName)
      if (voice) utterance.voice = voice
    }

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
        this.isSpeaking = false
        this.currentUtterance = null
        this.setStatus(TTSStatus.PAUSED)
      }
    }

    this.currentUtterance = utterance
    speechSynthesis.speak(utterance)
    return true
  }

  stop(): void {
    if (this.useHttp) {
      if (this.isSpeaking || this.currentAudio) {
        this.cleanupHttpAudio()
        this.isSpeaking = false
        this.setStatus(TTSStatus.PAUSED)
        console.log('[TTSEngine] HTTP 播报已中断')
      }
      return
    }

    if (this.isSpeaking) {
      speechSynthesis.cancel()
      this.isSpeaking = false
      this.currentUtterance = null
      this.setStatus(TTSStatus.PAUSED)
      console.log('[TTSEngine] 播报已中断')
    }
  }

  pause(): void {
    if (this.useHttp) {
      if (this.currentAudio && !this.currentAudio.paused) {
        this.currentAudio.pause()
        this.setStatus(TTSStatus.PAUSED)
      }
      return
    }
    if (this.isSpeaking && !speechSynthesis.paused) {
      speechSynthesis.pause()
      this.setStatus(TTSStatus.PAUSED)
    }
  }

  resume(): void {
    if (this.useHttp) {
      void this.currentAudio?.play()
      if (this.currentAudio && !this.currentAudio.paused) {
        this.setStatus(TTSStatus.SPEAKING)
      }
      return
    }
    if (speechSynthesis.paused) {
      speechSynthesis.resume()
      this.setStatus(TTSStatus.SPEAKING)
    }
  }

  isCurrentlySpeaking(): boolean {
    return this.isSpeaking
  }

  getStatus(): TTSStatus {
    return this.status
  }

  getConfig(): Readonly<TTSConfig> {
    return { ...this.config }
  }

  updateConfig(partial: Partial<TTSConfig>): void {
    Object.assign(this.config, partial)
  }

  destroy(): void {
    this.stop()
    this.cleanupHttpAudio()
    this.onSpeakEndCallback = null
    this.onStatusChangeCallback = null
    console.log('[TTSEngine] 资源已释放')
  }

  private setStatus(status: TTSStatus): void {
    const prev = this.status
    this.status = status
    if (prev !== status) {
      this.onStatusChangeCallback?.(status)
    }
  }
}
