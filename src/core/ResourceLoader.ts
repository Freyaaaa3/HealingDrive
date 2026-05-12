/**
 * 资源预加载器
 * 负责2D虚拟形象资源、音色配置、兜底话术库、大模型配置的预加载
 * 支持超时控制和失败降级
 */
import { ResourceLoadState } from '@/types'
import { RESOURCE_LOAD_TIMEOUT } from '@/config/constants'

export class ResourceLoader {
  private loadState: ResourceLoadState = {
    avatarResources: false,
    audioConfig: false,
    fallbackPhrases: false,
    modelConfig: false,
  }

  private cache = new Map<string, any>()

  constructor() {}

  /**
   * 预加载所有资源
   * 返回各资源的加载状态
   */
  async preloadAll(): Promise<ResourceLoadState> {
    console.log('[ResourceLoader] 开始预加载资源...')
    const startTime = Date.now()

    try {
      // 并行加载所有资源，但设置总体超时
      const results = await Promise.race([
        Promise.allSettled([
          this.loadAvatarResources(),
          this.loadAudioConfig(),
          this.loadFallbackPhrases(),
          this.loadModelConfig(),
        ]),
        this.createTimeoutPromise(),
      ])

      // 处理加载结果
      this.processResults(results)

      const duration = Date.now() - startTime
      console.log(`[ResourceLoader] 资源预加载完成 (${duration}ms):`, this.loadState)
      
      return { ...this.loadState }
    } catch (error) {
      console.error('[ResourceLoader] 资源预加载异常:', error)
      return { ...this.loadState }
    }
  }

  /**
   * 加载2D虚拟形象资源
   * Demo版：模拟加载默认治愈系形象资源包
   */
  private async loadAvatarResources(): Promise<boolean> {
    console.log('[ResourceLoader] 正在加载2D虚拟形象资源...')
    
    // TODO: 实际项目中这里会加载真实的图片/SVG/Lottie动画资源
    // Demo版模拟异步加载过程
    await this.simulateDelay(800)
    
    // 模拟资源数据
    this.cache.set('avatar', {
      id: 'default_healing_avatar',
      name: '默认疗愈形象',
      version: '1.0.0',
      assets: {
        idle: '/assets/avatar/idle.json',       // 待机姿态
        listening: '/assets/avatar/listening.json',  // 倾听动效
        speaking: '/assets/avatar/speaking.json',    // 回应动效
        healing: '/assets/avatar/healing.json',      // 疗愈动效
      },
      metadata: {
        style: 'healing_gentle',  // 温柔治愈风格
        resolution: '1080x1920',
      },
    })

    this.loadState.avatarResources = true
    return true
  }

  /**
   * 加载音频配置（音色、TTS参数等）
   */
  private async loadAudioConfig(): Promise<boolean> {
    console.log('[ResourceLoader] 正在加载音色配置...')
    
    await this.simulateDelay(400)
    
    // Demo版音色配置
    this.cache.set('audioConfig', {
      voiceId: 'default_female_gentle',
      voiceName: '温柔治愈女声',
      language: 'zh-CN',
      parameters: {
        pitch: 1.0,         // 音调
        speed: 0.9,         // 语速（稍慢更温柔）
        volume: 0.85,       // 音量
      },
      noiseReduction: {
        enabled: true,      // 座舱降噪开启
        level: 'high',      // 高强度降噪（适配行驶噪音）
      },
    })

    this.loadState.audioConfig = true
    return true
  }

  /**
   * 加载兜底话术库（大模型不可用时使用）
   */
  private async loadFallbackPhrases(): Promise<boolean> {
    console.log('[ResourceLoader] 正在加载兜底话术库...')
    
    await this.simulateDelay(300)

    // Demo版预设兜底话术
    this.cache.set('fallbackPhrases', {
      greeting: '您好，我是小疗同学，您的专属疗愈陪伴。有什么我可以帮助您的吗？',
      emotionAnger: '我感觉到您现在有些激动，请深呼吸，我陪您慢慢说。',
      emotionAnxiety: '别担心，我在这里陪着您。我们一起放松一下。',
      emotionFatigue: '您看起来有些疲惫了，要不先休息一会儿？',
      timeout: '看来您暂时不需要我的帮助。需要时随时呼唤我。',
      error: '抱歉，我刚才没太听清。能再说一遍吗？',
      exit: '好的，祝您一路平安。需要时随时呼唤我。',
    })

    this.loadState.fallbackPhrases = true
    return true
  }

  /**
   * 加载大模型配置（API端点、模型参数等）
   */
  private async loadModelConfig(): Promise<boolean> {
    console.log('[ResourceLoader] 正在加载大模型配置...')
    
    await this.simulateDelay(500)

    // Demo版模型配置
    this.cache.set('modelConfig', {
      provider: 'default',           // 默认提供商
      model: 'healing-assistant-v1',
      endpoint: '',                   // TODO: 实际项目填入真实端点
      maxTokens: 2048,
      temperature: 0.7,              // 较低的温度保证话术稳定
      systemPrompt: `你是一位专业的车载情感疗愈助手"小疗同学"，性格温柔、耐心、善于倾听。
你的职责是通过语音对话安抚司机的负面情绪（特别是愤怒），提供情感支持和实用建议。
对话要求：
1. 使用温柔、共情的语气回应
2. 先认同对方的情绪感受
3. 引导对方表达更多细节
4. 提供合理的情绪疏导建议
5. 必要时建议休息或停车`,
      fallbackEnabled: true,         // 启用兜底机制
    })

    this.loadState.modelConfig = true
    return true
  }

  /**
   * 处理加载结果
   */
  private processResults(results: any): void {
    if (!Array.isArray(results)) {
      // 超时情况，标记未完成的为失败
      console.warn('[ResourceLoader] 资源加载超时')
      return
    }

    results.forEach((result: PromiseSettledResult<boolean>, index: number) => {
      if (result.status === 'rejected') {
        console.error(`[ResourceLoader] 资源${index + 1}加载失败:`, result.reason)
      }
    })
  }

  /**
   * 创建超时Promise
   */
  private createTimeoutPromise(): Promise<never[]> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('资源加载超时')), RESOURCE_LOAD_TIMEOUT)
    }) as Promise<never[]>
  }

  /**
   * 模拟延迟（Demo用途）
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取缓存的资源配置
   */
  getResource<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined
  }

  /**
   * 获取当前资源加载状态
   */
  getLoadState(): ResourceLoadState {
    return { ...this.loadState }
  }

  /**
   * 检查关键资源是否加载完成（至少需要音色+兜底话术才能运行）
   */
  isMinimalReady(): boolean {
    return this.loadState.audioConfig && this.loadState.fallbackPhrases
  }
}
