/**
 * 科大讯飞「语音听写（流式版）」WebSocket ASR（国内可用，不依赖 Google）
 *
 * 需在 .env 中配置 VITE_IFLYTEK_APP_ID / VITE_IFLYTEK_API_KEY / VITE_IFLYTEK_API_SECRET，
 * 并设置 VITE_ASR_PROVIDER=iflytek。
 *
 * 注意：APISecret 放在前端会暴露在构建产物中，生产环境请改为后端代签。
 */
import { ASRStatus, ASRResult } from '@/types'
import type { IASREngine } from './asrTypes'
import { assembleXfyunIatWsUrlAsync } from './iflytekIatAuth'

const FRAME_BYTES = 1280
const SEND_INTERVAL_MS = 40
const SESSION_RENEW_MS = 52_000
const MIN_RESTART_MS = 400

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    out[i] = s < 0 ? (s * 0x8000) | 0 : (s * 0x7fff) | 0
  }
  return out
}

function resampleFloat32Linear(input: Float32Array, ratio: number): Float32Array {
  if (ratio <= 1.001 && ratio >= 0.999) return input
  const outLen = Math.max(1, Math.floor(input.length / ratio))
  const out = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const srcPos = i * ratio
    const j = Math.floor(srcPos)
    const frac = srcPos - j
    const a = input[j] ?? 0
    const b = input[j + 1] ?? a
    out[i] = a + (b - a) * frac
  }
  return out
}

function int16ToLittleEndianBytes(pcm: Int16Array): Uint8Array {
  const u8 = new Uint8Array(pcm.length * 2)
  const view = new DataView(u8.buffer)
  for (let i = 0; i < pcm.length; i++) {
    view.setInt16(i * 2, pcm[i], true)
  }
  return u8
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const step = 0x8000
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + step)))
  }
  return btoa(binary)
}

function parseIatWsText(result: { ws?: Array<{ cw?: Array<{ w?: string }> }> }): string {
  if (!result?.ws) return ''
  return result.ws
    .map((seg) => (seg.cw?.map((c) => c.w ?? '').join('') ?? ''))
    .join('')
}

export class IFlyTekASREngine implements IASREngine {
  private status: ASRStatus = ASRStatus.IDLE
  private isListeningForInput = false
  private isManualStop = false
  private pageHidden = false

  private appId = ''
  private apiKey = ''
  private apiSecret = ''

  private onFinalResultCallback: ((result: ASRResult) => void) | null = null
  private onInterimCallback: ((text: string) => void) | null = null
  private onErrorCallback: ((error: string) => void) | null = null
  private onStatusChangeCallback: ((status: ASRStatus) => void) | null = null

  private ws: WebSocket | null = null
  private mediaStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private scriptNode: ScriptProcessorNode | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private pcmQueue: Uint8Array[] = []
  private pcmQueueLen = 0

  private sendTimer: ReturnType<typeof setInterval> | null = null
  private renewTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  private firstAudioFrameSent = false
  private snPieces = new Map<number, string>()
  private paused = false

  private readonly onDocumentVisibilityChange = (): void => {
    this.pageHidden = typeof document !== 'undefined' && document.hidden
    if (this.pageHidden) {
      this.clearReconnectTimer()
      if (import.meta.env.DEV) {
        console.log('[IFlyTekASR] 页面不可见，暂停重连')
      }
      return
    }
    if (!this.isListeningForInput || this.status === ASRStatus.ERROR || this.paused) return
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.scheduleReconnect(MIN_RESTART_MS)
    }
  }

  init(): boolean {
    this.appId = import.meta.env.VITE_IFLYTEK_APP_ID || ''
    this.apiKey = import.meta.env.VITE_IFLYTEK_API_KEY || ''
    this.apiSecret = import.meta.env.VITE_IFLYTEK_API_SECRET || ''
    if (!this.appId || !this.apiKey || !this.apiSecret) {
      console.error('[IFlyTekASR] 缺少讯飞凭据，请配置 VITE_IFLYTEK_*')
      this.setStatus(ASRStatus.ERROR)
      return false
    }
    if (typeof document !== 'undefined') {
      this.pageHidden = document.hidden
      document.addEventListener('visibilitychange', this.onDocumentVisibilityChange)
    }
    console.log('[IFlyTekASR] ✓ 引擎初始化完成（讯飞流式听写）')
    return true
  }

  startListening(
    onFinalResult: (result: ASRResult) => void,
    onInterim?: (text: string) => void,
    onError?: (error: string) => void,
    onStatusChange?: (status: ASRStatus) => void,
  ): boolean {
    if (!this.appId) {
      console.error('[IFlyTekASR] 未初始化')
      return false
    }

    this.onFinalResultCallback = onFinalResult
    this.onInterimCallback = onInterim || null
    this.onErrorCallback = onError || null
    this.onStatusChangeCallback = onStatusChange || null

    this.isListeningForInput = true
    this.isManualStop = false
    this.paused = false
    this.setStatus(ASRStatus.LISTENING)

    void this.bootstrapSession()
    return true
  }

  stopListening(): void {
    this.isListeningForInput = false
    this.isManualStop = true
    this.clearTimers()
    this.teardownTransport(false)
    this.setStatus(ASRStatus.IDLE)
    console.log('[IFlyTekASR] 停止倾听')
  }

  pause(): void {
    if (this.status !== ASRStatus.LISTENING) return
    this.paused = true
    this.clearTimers()
    this.teardownTransport(true)
    this.setStatus(ASRStatus.IDLE)
  }

  resume(): void {
    if (!this.isListeningForInput || !this.paused) return
    this.paused = false
    this.setStatus(ASRStatus.LISTENING)
    void this.bootstrapSession()
  }

  getStatus(): ASRStatus {
    return this.status
  }

  isActive(): boolean {
    return this.status === ASRStatus.LISTENING && !this.paused
  }

  destroy(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onDocumentVisibilityChange)
    }
    this.stopListening()
    console.log('[IFlyTekASR] 资源已释放')
  }

  // ---------- internals ----------

  private async bootstrapSession(): Promise<void> {
    if (!this.isListeningForInput || this.paused || this.pageHidden) return

    try {
      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
          },
        })
        this.startAudioGraph()
      }
    } catch (e) {
      console.error('[IFlyTekASR] 麦克风不可用', e)
      this.setStatus(ASRStatus.ERROR)
      this.onErrorCallback?.('麦克风权限不足')
      return
    }

    try {
      await this.openWsAndStream()
    } catch (e) {
      console.error('[IFlyTekASR] 连接失败', e)
      this.onErrorCallback?.('语音识别连接失败')
      if (this.isListeningForInput && !this.isManualStop) {
        this.scheduleReconnect(1200)
      }
    }
  }

  private startAudioGraph(): void {
    if (!this.mediaStream) return
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.audioContext = new Ctx()
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)
    const bufferSize = 4096
    this.scriptNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1)
    const ratio = this.audioContext.sampleRate / 16000

    this.scriptNode.onaudioprocess = (ev) => {
      if (!this.isListeningForInput || this.paused || this.ws?.readyState !== WebSocket.OPEN) return
      const input = ev.inputBuffer.getChannelData(0)
      const resampled = resampleFloat32Linear(input, ratio)
      const pcm = floatTo16BitPCM(resampled)
      const bytes = int16ToLittleEndianBytes(pcm)
      this.enqueuePcm(bytes)
    }

    this.sourceNode.connect(this.scriptNode)
    this.scriptNode.connect(this.audioContext.destination)
  }

  private enqueuePcm(chunk: Uint8Array): void {
    this.pcmQueue.push(chunk)
    this.pcmQueueLen += chunk.length
  }

  private drainPcm(maxBytes: number): Uint8Array | null {
    if (this.pcmQueueLen < maxBytes) return null
    const out = new Uint8Array(maxBytes)
    let offset = 0
    while (offset < maxBytes && this.pcmQueue.length) {
      const head = this.pcmQueue[0]
      const need = maxBytes - offset
      if (head.length <= need) {
        out.set(head, offset)
        offset += head.length
        this.pcmQueue.shift()
        this.pcmQueueLen -= head.length
      } else {
        out.set(head.subarray(0, need), offset)
        this.pcmQueue[0] = head.subarray(need)
        this.pcmQueueLen -= need
        offset = maxBytes
      }
    }
    return out
  }

  private async openWsAndStream(): Promise<void> {
    if (!this.isListeningForInput || this.paused) return

    const url = await assembleXfyunIatWsUrlAsync(this.apiKey, this.apiSecret)
    this.firstAudioFrameSent = false
    this.snPieces.clear()

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url)
      this.ws = ws
      let opened = false

      ws.onopen = () => {
        opened = true
        this.clearReconnectTimer()
        this.startSendLoop()
        this.startRenewTimer()
        resolve()
      }

      ws.onerror = () => {
        if (!opened) reject(new Error('websocket error'))
      }

      ws.onmessage = (evt) => {
        this.handleServerText(String(evt.data))
      }

      ws.onclose = () => {
        if (!opened) {
          reject(new Error('websocket closed before open'))
        }
        if (this.ws === ws) this.ws = null
        this.stopSendLoop()
        this.clearRenewTimer()
        if (this.isListeningForInput && !this.isManualStop && !this.paused && !this.pageHidden) {
          this.scheduleReconnect(MIN_RESTART_MS)
        }
      }
    })
  }

  private handleServerText(raw: string): void {
    let msg: {
      code?: number
      message?: string
      data?: {
        result?: { sn?: number; ls?: boolean; ws?: Array<{ cw?: Array<{ w?: string }> }> }
      }
    }
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }

    if (msg.code !== undefined && msg.code !== 0) {
      console.error('[IFlyTekASR] 服务错误', msg.code, msg.message)
      this.onErrorCallback?.(msg.message || '语音识别服务异常')
      return
    }

    const result = msg.data?.result
    if (!result || result.ws === undefined) return

    const sn = typeof result.sn === 'number' ? result.sn : 0
    const piece = parseIatWsText(result)
    this.snPieces.set(sn, piece)

    const keys = [...this.snPieces.keys()].sort((a, b) => a - b)
    let full = ''
    for (const k of keys) {
      full += this.snPieces.get(k) || ''
    }

    if (!result.ls) {
      this.onInterimCallback?.(full)
    } else {
      const text = full.trim()
      if (text) {
        this.setStatus(ASRStatus.SUCCESS)
        this.onFinalResultCallback?.({
          text,
          isFinal: true,
          confidence: 0.88,
          timestamp: Date.now(),
        })
      }
      this.snPieces.clear()
    }
  }

  private buildAudioJson(status: 0 | 1 | 2, audioB64: string): string {
    if (status === 0 && !this.firstAudioFrameSent) {
      this.firstAudioFrameSent = true
      return JSON.stringify({
        common: { app_id: this.appId },
        business: {
          language: 'zh_cn',
          domain: 'iat',
          accent: 'mandarin',
          eos: 4000,
        },
        data: {
          status: 0,
          format: 'audio/L16;rate=16000',
          encoding: 'raw',
          audio: audioB64,
        },
      })
    }
    return JSON.stringify({
      data: {
        status,
        format: 'audio/L16;rate=16000',
        encoding: 'raw',
        audio: audioB64,
      },
    })
  }

  private startSendLoop(): void {
    this.stopSendLoop()
    this.sendTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
      const chunk = this.drainPcm(FRAME_BYTES)
      if (!chunk) return
      const audioB64 = bytesToBase64(chunk)
      const status: 0 | 1 = this.firstAudioFrameSent ? 1 : 0
      this.ws.send(this.buildAudioJson(status, audioB64))
    }, SEND_INTERVAL_MS)
  }

  private stopSendLoop(): void {
    if (this.sendTimer) {
      clearInterval(this.sendTimer)
      this.sendTimer = null
    }
  }

  private startRenewTimer(): void {
    this.clearRenewTimer()
    this.renewTimer = setTimeout(() => {
      this.renewTimer = null
      if (!this.isListeningForInput || this.paused || this.pageHidden) return
      this.sendEndFrameAndCloseWs()
    }, SESSION_RENEW_MS)
  }

  private clearRenewTimer(): void {
    if (this.renewTimer) {
      clearTimeout(this.renewTimer)
      this.renewTimer = null
    }
  }

  private sendEndFrameAndCloseWs(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            data: {
              status: 2,
              format: 'audio/L16;rate=16000',
              encoding: 'raw',
              audio: '',
            },
          }),
        )
      } catch {
        /* ignore */
      }
      try {
        this.ws.close()
      } catch {
        /* ignore */
      }
    }
    this.ws = null
    this.stopSendLoop()
    this.clearRenewTimer()
    if (this.isListeningForInput && !this.isManualStop && !this.paused && !this.pageHidden) {
      void this.openWsAndStream()
    }
  }

  private scheduleReconnect(ms: number): void {
    if (!this.isListeningForInput || this.isManualStop || this.paused || this.pageHidden) return
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.isListeningForInput || this.isManualStop || this.paused || this.pageHidden) return
      void this.openWsAndStream().catch(() => {
        if (this.isListeningForInput && !this.isManualStop) {
          this.scheduleReconnect(Math.min(10_000, MIN_RESTART_MS * 4))
        }
      })
    }, ms)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private clearTimers(): void {
    this.stopSendLoop()
    this.clearRenewTimer()
    this.clearReconnectTimer()
  }

  /** @param keepMic 暂停时保留麦克风流与 AudioGraph */
  private teardownTransport(keepMic: boolean): void {
    this.clearTimers()
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              data: {
                status: 2,
                format: 'audio/L16;rate=16000',
                encoding: 'raw',
                audio: '',
              },
            }),
          )
        }
      } catch {
        /* ignore */
      }
      try {
        this.ws.close()
      } catch {
        /* ignore */
      }
    }
    this.ws = null
    this.pcmQueue = []
    this.pcmQueueLen = 0
    this.firstAudioFrameSent = false

    if (!keepMic) {
      try {
        this.scriptNode?.disconnect()
      } catch {
        /* ignore */
      }
      try {
        this.sourceNode?.disconnect()
      } catch {
        /* ignore */
      }
      this.scriptNode = null
      this.sourceNode = null
      if (this.audioContext) {
        void this.audioContext.close()
      }
      this.audioContext = null
      this.mediaStream?.getTracks().forEach((t) => t.stop())
      this.mediaStream = null
    }
  }

  private setStatus(status: ASRStatus): void {
    const prev = this.status
    this.status = status
    if (prev !== status) {
      this.onStatusChangeCallback?.(status)
    }
  }
}
