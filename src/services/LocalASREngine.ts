/**
 * 本地离线 ASR 引擎（WebSocket + Vosk）
 *
 * 通过 WebSocket 连接本地 Python Vosk 服务（scripts/realtimeasr_server.py），
 * 将浏览器麦克风流式 PCM 音频发送至服务端进行中文语音识别。
 *
 * 无需 Google 语音服务，国内网络环境下可正常使用。
 *
 * 需在 .env 中配置：
 *   VITE_ASR_PROVIDER=local
 *   VITE_ASR_WS_URL=ws://127.0.0.1:5124   （可选，默认值）
 */
import { ASRStatus, ASRResult } from '@/types'
import type { IASREngine } from './asrTypes'

/** WebSocket 重连间隔（ms） */
const RECONNECT_DELAY = 1200

/** PCM 音频帧大小（字节），16bit 16kHz mono → 每秒 32000 字节 */
const FRAME_BYTES = 1280

/** 音频发送间隔（ms），每帧约 40ms 音频 */
const SEND_INTERVAL_MS = 40

/** 会话续期间隔（ms）：Vosk 连续模式约 60s 后需发静音结束 */
const SESSION_RENEW_MS = 55_000

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

export class LocalASREngine implements IASREngine {
  private status: ASRStatus = ASRStatus.IDLE
  private isListeningForInput = false
  private isManualStop = false
  private pageHidden = false

  private wsUrl = 'ws://127.0.0.1:5124'

  private onFinalResultCallback: ((result: ASRResult) => void) | null = null
  private onInterimCallback: ((text: string) => void) | null = null
  private onErrorCallback: ((error: string) => void) | null = null
  private onStatusChangeCallback: ((status: ASRStatus) => void) | null = null

  private ws: WebSocket | null = null
  private mediaStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private workletNode: AudioWorkletNode | null = null
  private scriptNode: ScriptProcessorNode | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private pcmQueue: Uint8Array[] = []
  private pcmQueueLen = 0

  private sendTimer: ReturnType<typeof setInterval> | null = null
  private renewTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  private readonly onDocumentVisibilityChange = (): void => {
    this.pageHidden = typeof document !== 'undefined' && document.hidden
    if (this.pageHidden) {
      this.clearReconnectTimer()
      if (import.meta.env.DEV) {
        console.log('[LocalASR] 页面不可见，暂停重连')
      }
      return
    }
    if (!this.isListeningForInput || this.status === ASRStatus.ERROR) return
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.scheduleReconnect(RECONNECT_DELAY)
    }
  }

  init(): boolean {
    this.wsUrl = import.meta.env.VITE_ASR_WS_URL || 'ws://127.0.0.1:5124'

    if (typeof document !== 'undefined') {
      this.pageHidden = document.hidden
      document.addEventListener('visibilitychange', this.onDocumentVisibilityChange)
    }
    console.log('[LocalASR] ✓ 引擎初始化完成（本地 Vosk ASR）')
    return true
  }

  startListening(
    onFinalResult: (result: ASRResult) => void,
    onInterim?: (text: string) => void,
    onError?: (error: string) => void,
    onStatusChange?: (status: ASRStatus) => void,
  ): boolean {
    this.onFinalResultCallback = onFinalResult
    this.onInterimCallback = onInterim || null
    this.onErrorCallback = onError || null
    this.onStatusChangeCallback = onStatusChange || null

    this.isListeningForInput = true
    this.isManualStop = false
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
    console.log('[LocalASR] 停止倾听')
  }

  pause(): void {
    if (this.status !== ASRStatus.LISTENING) return
    this.isManualStop = true
    this.clearTimers()
    this.teardownTransport(true)
    this.setStatus(ASRStatus.IDLE)
  }

  resume(): void {
    this.isManualStop = false
    this.setStatus(ASRStatus.LISTENING)
    void this.bootstrapSession()
  }

  getStatus(): ASRStatus {
    return this.status
  }

  isActive(): boolean {
    return this.status === ASRStatus.LISTENING
  }

  destroy(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onDocumentVisibilityChange)
    }
    this.stopListening()
    console.log('[LocalASR] 资源已释放')
  }

  // ==================== 内部 ====================

  private async bootstrapSession(): Promise<void> {
    if (!this.isListeningForInput || this.pageHidden) return

    try {
      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
          },
        })
        await this.startAudioGraph()
      }
    } catch (e) {
      console.error('[LocalASR] 麦克风不可用', e)
      this.setStatus(ASRStatus.ERROR)
      this.onErrorCallback?.('麦克风权限不足')
      return
    }

    try {
      await this.openWsAndStream()
    } catch (e) {
      console.error('[LocalASR] 连接失败', e)
      this.onErrorCallback?.('本地ASR服务连接失败，请确认 Vosk 服务已启动')
      if (this.isListeningForInput && !this.isManualStop) {
        this.scheduleReconnect(RECONNECT_DELAY)
      }
    }
  }

  private async startAudioGraph(): Promise<void> {
    if (!this.mediaStream) return
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.audioContext = new Ctx()
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)
    const ratio = this.audioContext.sampleRate / 16000

    // 优先使用 AudioWorklet（无废弃警告），不支持则回退到 ScriptProcessor
    try {
      await this.startAudioWorklet(ratio)
    } catch {
      this.startScriptProcessor(ratio)
    }
  }

  private async startAudioWorklet(ratio: number): Promise<void> {
    if (!this.audioContext || !this.sourceNode) return

    const workletCode = `
      class AudioCaptureProcessor extends AudioWorkletProcessor {
        constructor() { super(); }
        process(inputs) {
          const input = inputs[0];
          if (input && input.length > 0 && input[0].length > 0) {
            this.port.postMessage(input[0].slice());
          }
          return true;
        }
      }
      registerProcessor('audio-capture-processor', AudioCaptureProcessor);
    `

    const blob = new Blob([workletCode], { type: 'application/javascript' })
    const blobUrl = URL.createObjectURL(blob)
    await this.audioContext.audioWorklet.addModule(blobUrl)
    URL.revokeObjectURL(blobUrl)

    const workletNode = new AudioWorkletNode(this.audioContext, 'audio-capture-processor')
    this.workletNode = workletNode

    workletNode.port.onmessage = (ev: MessageEvent<Float32Array>) => {
      if (!this.isListeningForInput || this.ws?.readyState !== WebSocket.OPEN) return
      const resampled = resampleFloat32Linear(ev.data, ratio)
      const pcm = floatTo16BitPCM(resampled)
      const bytes = int16ToLittleEndianBytes(pcm)
      this.enqueuePcm(bytes)
    }

    this.sourceNode.connect(workletNode)
    workletNode.connect(this.audioContext.destination)
  }

  private startScriptProcessor(ratio: number): void {
    if (!this.audioContext || !this.sourceNode) return
    const bufferSize = 4096
    this.scriptNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1)

    this.scriptNode.onaudioprocess = (ev) => {
      if (!this.isListeningForInput || this.ws?.readyState !== WebSocket.OPEN) return
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
    if (!this.isListeningForInput) return

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl)
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
        if (!opened) reject(new Error('WebSocket 连接失败'))
      }

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(String(evt.data))
          if (msg.type === 'final' && msg.text) {
            this.setStatus(ASRStatus.SUCCESS)
            this.onFinalResultCallback?.({
              text: msg.text,
              isFinal: true,
              confidence: 0.85,
              timestamp: Date.now(),
            })
          } else if (msg.type === 'interim' && msg.text) {
            this.onInterimCallback?.(msg.text)
          }
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        if (!opened) {
          reject(new Error('WebSocket 连接关闭'))
        }
        if (this.ws === ws) this.ws = null
        this.stopSendLoop()
        this.clearRenewTimer()
        if (this.isListeningForInput && !this.isManualStop && !this.pageHidden) {
          this.scheduleReconnect(RECONNECT_DELAY)
        }
      }
    })
  }

  private startSendLoop(): void {
    this.stopSendLoop()
    this.sendTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
      const chunk = this.drainPcm(FRAME_BYTES)
      if (!chunk) return
      this.ws.send(chunk)
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
      if (!this.isListeningForInput || this.isManualStop || this.pageHidden) return
      // Vosk 连续模式，发送静音帧保持活跃
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(new ArrayBuffer(0))
      }
    }, SESSION_RENEW_MS)
  }

  private clearRenewTimer(): void {
    if (this.renewTimer) {
      clearTimeout(this.renewTimer)
      this.renewTimer = null
    }
  }

  private scheduleReconnect(ms: number): void {
    if (!this.isListeningForInput || this.isManualStop || this.pageHidden) return
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.isListeningForInput || this.isManualStop || this.pageHidden) return
      void this.openWsAndStream().catch(() => {
        if (this.isListeningForInput && !this.isManualStop) {
          this.scheduleReconnect(Math.min(10_000, RECONNECT_DELAY * 4))
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
      try { this.ws.close() } catch { /* ignore */ }
    }
    this.ws = null
    this.pcmQueue = []
    this.pcmQueueLen = 0

    if (!keepMic) {
      try { this.workletNode?.disconnect() } catch { /* ignore */ }
      try { this.scriptNode?.disconnect() } catch { /* ignore */ }
      try { this.sourceNode?.disconnect() } catch { /* ignore */ }
      this.workletNode = null
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
