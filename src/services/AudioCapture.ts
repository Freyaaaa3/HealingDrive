/**
 * 音频采集与降噪服务
 * 
 * 负责车载麦克风流式音频采集、降噪处理、回声消除
 * Demo版使用 Web Audio API + getUserMedia
 */
export class AudioCapture {
  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private workletNode: AudioWorkletNode | null = null    // 降噪节点（生产级）
  private analyserNode: AnalyserNode | null = null       // 音量分析（Demo用）
  private isCapturing: boolean = false
  private noiseReductionEnabled: boolean = true

  /** 音频数据回调（供ASR使用） */
  private onAudioDataCallback: ((data: Float32Array) => void) | null = null

  /** 音量变化回调 */
  private onVolumeChangeCallback: ((volume: number) => void) | null = null

  /**
   * 初始化麦克风采集
   */
  async init(): Promise<boolean> {
    try {
      console.log('[AudioCapture] 初始化音频采集...')

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,       // 回声消除
          noiseSuppression: true,       // 噪声抑制
          autoGainControl: true,        // 自动增益控制
          sampleRate: 16000,            // 座舱常用采样率
        },
        video: false,
      })

      // 创建AudioContext用于降噪和分析
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      })

      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream)
      
      // 分析器节点：用于检测音量/静音
      this.analyserNode = this.audioContext.createAnalyser()
      this.analyserNode.fftSize = 256
      this.analyserNode.smoothingTimeConstant = 0.3
      
      // 连接节点链
      this.sourceNode.connect(this.analyserNode)

      console.log('[AudioCapture] ✓ 麦克风采集就绪')
      return true
    } catch (error) {
      console.error('[AudioCapture] 初始化失败:', error)
      return false
    }
  }

  /**
   * 开始持续采集音频
   * @param onAudioData 音频数据回调
   * @param onVolumeChange 音量回调
   */
  startCapture(
    onAudioData?: (data: Float32Array) => void,
    onVolumeChange?: (volume: number) => void,
  ): boolean {
    if (!this.stream || !this.audioContext) {
      console.error('[AudioCapture] 未初始化，无法开始采集')
      return false
    }

    if (this.isCapturing) {
      console.warn('[AudioCapture] 已在采集中')
      return true
    }

    this.onAudioDataCallback = onAudioData || null
    this.onVolumeChangeCallback = onVolumeChange || null
    this.isCapturing = true

    // 启动音量监测定时器
    this.startVolumeMonitoring()

    console.log('[AudioCapture] ✓ 开始音频采集')
    return true
  }

  /**
   * 停止采集
   */
  stopCapture(): void {
    if (!this.isCapturing) return

    this.isCapturing = false
    this.stopVolumeMonitoring()

    console.log('[AudioCapture] 停止音频采集')
  }

  /**
   * 暂时暂停采集（音频通道被抢占时）
   */
  pauseCapture(): void {
    if (!this.isCapturing) return
    this.isCapturing = false
    console.log('[AudioCapture] 暂停采集')
  }

  /**
   * 恢复采集
   */
  resumeCapture(): void {
    if (this.stream && this.audioContext && !this.isCapturing) {
      this.isCapturing = true
      this.startVolumeMonitoring()
      console.log('[AudioCapture] 恢复采集')
    }
  }

  /**
   * 获取当前音量级别 (0-1)
   */
  getVolumeLevel(): number {
    if (!this.analyserNode) return 0
    
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount)
    this.analyserNode.getByteFrequencyData(dataArray)

    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i]
    }
    return Math.min(sum / dataArray.length / 255, 1)
  }

  /**
   * 检测是否有语音活动（VAD简易版）
   */
  hasSpeechActivity(): boolean {
    const volume = this.getVolumeLevel()
    return volume > 0.02  // 阈值可调
  }

  /**
   * 获取MediaStream（供外部引擎直接使用）
   */
  getStream(): MediaStream | null {
    return this.stream
  }

  /**
   * 是否正在采集中
   */
  isActive(): boolean {
    return this.isCapturing
  }

  /**
   * 释放所有资源
   */
  destroy(): void {
    this.stopCapture()
    
    this.onAudioDataCallback = null
    this.onVolumeChangeCallback = null

    this.stream?.getTracks().forEach(track => track.stop())
    this.stream = null

    if (this.audioContext?.state !== 'closed') {
      this.audioContext?.close()
    }
    this.audioContext = null
    this.sourceNode = null
    this.workletNode = null
    this.analyserNode = null

    console.log('[AudioCapture] 资源已释放')
  }

  // ==================== 私有方法 ====================

  private volumeTimer: ReturnType<typeof setInterval> | null = null

  private startVolumeMonitoring(): void {
    if (this.volumeTimer) return
    this.volumeTimer = setInterval(() => {
      if (this.isCapturing && this.onVolumeChangeCallback) {
        this.onVolumeChangeCallback(this.getVolumeLevel())
      }
    }, 100)  // 100ms采样率
  }

  private stopVolumeMonitoring(): void {
    if (this.volumeTimer) {
      clearInterval(this.volumeTimer)
      this.volumeTimer = null
    }
  }
}
