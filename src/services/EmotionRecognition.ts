/**
 * Module 4: 多维度情绪识别引擎
 *
 * 融合5大维度数据进行综合情绪判定：
 *   1. 语音语义&语气分析（接入M3对话文本）
 *   2. 面部表情特征采集（Demo版模拟）
 *   3. 驾驶行为数据分析（Demo版模拟）
 *   4. 心率监测（Demo版模拟）
 *   5. 司机性格画像（本地存储）
 *
 * 设计原则：
 *   - 仅主动唤醒后触发（不被动监测）
 *   - 所有维度并行采集，≤2s响应
 *   - 缺失维度自动降级重加权
 *   - 本地数据沉淀，不上云
 */
import {
  EmotionType,
  EmotionIntensity,
  DrivingScenario,
  DimensionAvailability,
  VoiceFeature,
  FacialFeature,
  DrivingFeature,
  HeartRateFeature,
  DriverProfile,
  EmotionRecord,
  DimensionScores,
  EmotionResult,
  EmotionRecognitionCallbacks,
  EnhancedDriverProfile,
} from '@/types'
import { ProfileEngine } from './ProfileEngine'

// ==================== 常量 & 配置 ====================

/** 默认维度权重配置 */
const DEFAULT_DIMENSION_WEIGHTS: DimensionScores = {
  voice: 35,      // 语音：核心权重
  facial: 20,     // 面部：辅助权重
  driving: 25,    // 驾驶行为：核心权重
  heartRate: 10,  // 心率：辅助权重
  profile: 10,    // 画像：辅助权重
}

/** 最大处理耗时 ms */
const MAX_PROCESSING_TIME = 2000

/** 本地存储 key 前缀 */
const STORAGE_KEYS = {
  PROFILE: 'healing_agent_driver_profile',
  EMOTION_HISTORY: 'healing_agent_emotion_history',
}

// ==================== Demo 模拟配置 ====================

/** 情绪化关键词库 */
const EMOTION_KEYWORDS: Record<string, string[]> = {
  anger: [
    '生气', '火大', '气死', '愤怒', '烦死', '混蛋', '傻逼', '他妈',
    '有病', '会不会开车', '急什么', '找死', '神经病', '脑残',
    '靠', '操', '滚', '变态', '垃圾', '废物',
  ],
  anxiety: [
    '紧张', '担心', '怕', '焦虑', '不安', '慌', '来不及',
    '赶时间', '要迟到了', '怎么办', '害怕',
  ],
  irritability: [
    '烦躁', '不耐烦', '啰嗦', '废话', '吵死了', '堵死了',
    '慢死了', '怎么这么', '又', '天天', '每次都',
  ],
  fatigue: [
    '累', '疲惫', '困', '好累', '累死', '没精神', '哈欠',
    '开不动', '想休息', '眼皮打架',
  ],
}

// ==================== 内部工具函数 ====================

function generateId(): string {
  return `emo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback
  try { return JSON.parse(json) as T } catch { return fallback }
}

// ==================== 子模块：语音语义分析器 ====================

class VoiceAnalyzer {
  /**
   * 分析语音文本的语义和语气特征
   * 从M3对话文本中提取情绪信号
   */
  static analyze(text: string): VoiceFeature {
    const lowerText = text.toLowerCase()

    // 关键词匹配
    const emotionKeywords: string[] = []
    for (const [category, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      const matched = keywords.filter(kw => lowerText.includes(kw))
      if (matched.length > 0) {
        emotionKeywords.push(...matched.map(k => `${category}:${k}`))
      }
    }

    // 语义情感分计算（基于关键词和文本长度）
    let sentimentScore = 0
    if (emotionKeywords.length > 0) {
      const angerKws = emotionKeywords.filter(k => k.startsWith('anger')).length
      const anxietyKws = emotionKeywords.filter(k => k.startsWith('anxiety')).length
      const irritabilityKws = emotionKeywords.filter(k => k.startsWith('irritability')).length
      const fatigueKws = emotionKeywords.filter(k => k.startsWith('fatigue')).length

      sentimentScore = -(angerKws * 0.25 + anxietyKws * 0.18 + irritabilityKws * 0.12 - fatigueKws * 0.08)
      sentimentScore = Math.max(-1, Math.min(1, sentimentScore))
    }

    // 语速估算（基于标点和文本长度比）
    const punctuationCount = (text.match(/[！？!？。、，,.]/g) || []).length
    const speakingRate = Math.min(1, text.length / 40 + punctuationCount * 0.05)

    // 语调变化（基于感叹号和问号）
    const exclamationCount = (text.match(/[！!]/g) || []).length
    const pitchVariation = Math.min(1, exclamationCount * 0.2 + text.length * 0.01)

    // 音量起伏（基于重复字符和连续感叹）
    const repeatPattern = /(.)\1{2,}/g.test(text) ? 0.6 : 0.2
    const volumeVariation = Math.min(1, repeatPattern + exclamationCount * 0.15)

    return {
      text,
      speakingRate: Math.round(speakingRate * 100) / 100,
      pitchVariation: Math.round(pitchVariation * 100) / 100,
      volumeVariation: Math.round(volumeVariation * 100) / 100,
      emotionKeywords,
      sentimentScore: Math.round(sentimentScore * 100) / 100,
    }
  }

  /**
   * 将VoiceFeature转换为0-100的情绪分数
   */
  static toScore(feature: VoiceFeature): number {
    let score = 50 // 基准分

    // 负面关键词加分（提高负面情绪概率）
    score += feature.emotionKeywords.filter(k => k.startsWith('anger') || k.startsWith('irritability')).length * 8
    score += feature.emotionKeywords.filter(k => k.startsWith('anxiety')).length * 5
    score += feature.emotionKeywords.filter(k => k.startsWith('fatigue')).length * 3

    // 语义情感分影响
    score -= feature.sentimentScore * 25

    // 语速快+语调变化大 → 更可能负面
    if (feature.speakingRate > 0.7) score += 10
    if (feature.pitchVariation > 0.5) score += 8
    if (feature.volumeVariation > 0.6) score += 6

    return Math.max(0, Math.min(100, Math.round(score)))
  }
}

// ==================== 子模块：面部表情分析器（Demo模拟）====================

class FacialAnalyzer {
  /**
   * Demo版：模拟面部表情检测结果
   * 真实环境需接入摄像头 + ML模型
   */
  static analyze(_videoStream?: MediaProvider): FacialFeature {
    // Demo版：生成合理的随机模拟值
    // 实际应从摄像头帧中提取特征
    const baseIntensity = 0.2 + Math.random() * 0.3

    return {
      frownIntensity: Math.round((baseIntensity + Math.random() * 0.2) * 100) / 100,
      mouthDroop: Math.round((baseIntensity * 0.8 + Math.random() * 0.15) * 100) / 100,
      faceTension: Math.round((baseIntensity * 0.9 + Math.random() * 0.2) * 100) / 100,
      microExpression: Math.random() > 0.7 ? ['disgust', 'contempt', 'tense'][Math.floor(Math.random() * 3)] : null,
      confidence: Math.round((0.65 + Math.random() * 0.25) * 100) / 100,
    }
  }

  static toScore(feature: FacialFeature): number {
    return Math.round(
      (feature.frownIntensity * 30 +
       feature.mouthDroop * 25 +
       feature.faceTension * 30 +
       (feature.microExpression ? 15 : 0)) *
      feature.confidence
    )
  }
}

// ==================== 子模块：驾驶行为分析器（Demo模拟）====================

class DrivingBehaviorAnalyzer {
  /**
   * Demo版：模拟驾驶行为数据
   * 真实环境需接入车载CAN总线/OBD接口
   */
  static analyze(): DrivingFeature {
    // Demo版：生成模拟驾驶压力指标
    const stressLevel = Math.random()
    return {
      currentSpeed: Math.floor(20 + Math.random() * 100),
      hardBrakeCount: stressLevel > 0.6 ? Math.floor(Math.random() * 4) : 0,
      laneChangeFreq: Math.round(stressLevel * 2 * 10) / 10,
      sharpTurnCount: stressLevel > 0.7 ? Math.floor(Math.random() * 3) : 0,
      followingDistance: stressLevel > 0.5 ? Math.floor(Math.random() * 2) : 2,
      stressIndicator: Math.round(stressLevel * 100) / 100,
    }
  }

  /** 推断驾驶场景 */
  static inferScenario(driving: DrivingFeature): DrivingScenario {
    if (driving.currentSpeed > 80) return DrivingScenario.HIGHWAY
    if (driving.stressIndicator > 0.65 && driving.currentSpeed < 30) return DrivingScenario.TRAFFIC_JAM
    if (driving.currentSpeed < 5) return DrivingScenario.IDLE
    if (driving.currentSpeed < 50) return DrivingScenario.CITY
    return DrivingScenario.GENERAL
  }

  static toScore(feature: DrivingFeature): number {
    let score = 30 // 基准分

    // 急刹增加压力感
    score += feature.hardBrakeCount * 12
    // 变道频繁增加焦虑感
    score += feature.laneChangeFreq * 8
    // 急转弯增加愤怒诱因
    score += feature.sharpTurnCount * 10
    // 跟车距离近增加压力
    if (feature.followingDistance <= 0) score += 15
    else if (feature.followingDistance === 1) score += 8
    // 综合压力指标
    score += feature.stressIndicator * 20

    return Math.max(0, Math.min(100, Math.round(score)))
  }
}

// ==================== 子模块：心率分析器（Demo模拟）====================

class HeartRateAnalyzer {
  /**
   * Demo版：模拟心率数据
   * 真实环境需对接车载健康监测硬件/可穿戴设备
   */
  static analyze(): HeartRateFeature {
    // Demo版：60%概率无心率硬件，返回不可用
    if (Math.random() > 0.4) {
      return { currentBPM: 0, variability: 0, trend: 'stable', available: false }
    }

    const baseBPM = 68 + Math.floor(Math.random() * 25)
    return {
      currentBPM: baseBPM,
      variability: Math.round((Math.random() * 15) * 100) / 100,
      trend: baseBPM > 85 ? 'rising' : baseBPM < 70 ? 'falling' : 'stable',
      available: true,
    }
  }

  static toScore(feature: HeartRateFeature): number {
    if (!feature.available) return 50 // 不可用时返回中性分

    let score = 40
    if (feature.currentBPM > 90) score += 25
    else if (feature.currentBPM > 80) score += 12
    if (feature.variability > 10) score += 15
    if (feature.trend === 'rising') score += 10

    return Math.max(0, Math.min(100, score))
  }
}

// ==================== 子模块：司机画像管理器 ====================

class ProfileManager {
  private profile: DriverProfile

  constructor() {
    this.profile = this.loadProfile()
  }

  /** 加载或初始化画像 */
  private loadProfile(): DriverProfile {
    const stored = localStorage.getItem(STORAGE_KEYS.PROFILE)
    if (stored) {
      return safeJsonParse<DriverProfile>(stored, this.createDefaultProfile())
    }
    return this.createDefaultProfile()
  }

  /** 创建默认画像 */
  private createDefaultProfile(): DriverProfile {
    return {
      angerFrequency: 0.3,
      personalityTags: ['通用基准'],
      totalInteractions: 0,
      lastUpdated: Date.now(),
      emotionHistory: [],
    }
  }

  /** 获取当前画像 */
  getProfile(): DriverProfile {
    return { ...this.profile }
  }

  /** 记录一次情绪事件并更新画像 */
  recordEmotion(record: Omit<EmotionRecord, 'id'>): EmotionRecord {
    const fullRecord: EmotionRecord = {
      ...record,
      id: generateId(),
    }

    // 追加到历史（最多保留20条）
    this.profile.emotionHistory.push(fullRecord)
    if (this.profile.emotionHistory.length > 20) {
      this.profile.emotionHistory = this.profile.emotionHistory.slice(-20)
    }

    // 更新统计
    this.profile.totalInteractions++
    if (record.type === EmotionType.ANGER) {
      // 滑动平均更新易怒频次（最近10次中的愤怒占比）
      const recent = this.profile.emotionHistory.slice(-10)
      const angerCount = recent.filter(r => r.type === EmotionType.ANGER).length
      this.profile.angerFrequency = Math.round((angerCount / recent.length) * 100) / 100
    }

    // 更新性格标签
    this.updatePersonalityTags()

    this.profile.lastUpdated = Date.now()

    // 持久化
    this.saveProfile()

    return fullRecord
  }

  /** 根据历史情绪更新性格标签 */
  private updatePersonalityTags(): void {
    const tags: string[] = []

    // 易怒判断
    if (this.profile.angerFrequency > 0.5) tags.push('易怒')
    else if (this.profile.angerFrequency > 0.3) tags.push('偶发易怒')

    // 情绪类型偏好
    const types = this.profile.emotionHistory.map(r => r.type)
    const angerPct = types.filter(t => t === EmotionType.ANGER).length / Math.max(1, types.length)
    const anxietyPct = types.filter(t => t === EmotionType.ANXIETY).length / Math.max(1, types.length)
    const fatiguePct = types.filter(t => t === EmotionType.FATIGUE).length / Math.max(1, types.length)

    if (angerPct > 0.4) tags.push('路怒倾向')
    if (anxietyPct > 0.3) tags.push('容易紧张')
    if (fatiguePct > 0.3) tags.push('常感疲劳')
    if (this.profile.totalInteractions > 5 && angerPct < 0.15 && anxietyPct < 0.15) {
      tags.push('心态平稳')
    }

    this.profile.personalityTags = tags.length > 0 ? tags : ['通用基准']
  }

  /** 将画像转为0-100分数 */
  toScore(): number {
    let score = 45 // 基准分

    // 易怒频次影响
    score += this.profile.angerFrequency * 25

    // 历史情绪加权
    const recentHistory = this.profile.emotionHistory.slice(-5)
    for (const record of recentHistory) {
      switch (record.intensity) {
        case EmotionIntensity.HIGH: score += 6; break
        case EmotionIntensity.MEDIUM: score += 3; break
        case EmotionIntensity.LOW: score += 1; break
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /** 持久化到 localStorage */
  private saveProfile(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(this.profile))
    } catch (e) {
      console.warn('[Emotion] 无法保存画像到localStorage:', e)
    }
  }

  /** 重置画像（调试用） */
  reset(): void {
    this.profile = this.createDefaultProfile()
    this.saveProfile()
  }
}

// ==================== 主类：多维度融合打分引擎 ====================

export class EmotionRecognitionEngine {
  private profileManager: ProfileManager
  private profileEngine: ProfileEngine | null = null   // M6: 增强画像引擎
  private callbacks: EmotionRecognitionCallbacks = {}
  private isProcessing: boolean = false
  /** 当前会话是否已做过情绪识别（PRD：仅首次倾诉做完整识别） */
  private sessionAnalyzed: boolean = false

  constructor() {
    this.profileManager = new ProfileManager()
  }

  // ==================== M6: 增强画像集成 ====================

  /** 注入增强画像引擎 */
  setProfileEngine(engine: ProfileEngine): void {
    this.profileEngine = engine
    console.log('[Emotion] M6 增强画像引擎已集成')
  }

  /** 获取增强画像（M6） */
  getEnhancedProfile(): EnhancedDriverProfile | null {
    return this.profileEngine?.getProfile() || null
  }

  // ==================== 公共 API ====================

  /**
   * 执行多维度情绪识别
   *
   * @param userText 用户倾诉文本（来自M3 ASR转写结果）
   * @param callbacks 识别事件回调
   * @returns Promise<EmotionResult> 识别结果
   */
  async recognize(
    userText: string,
    callbacks?: EmotionRecognitionCallbacks,
  ): Promise<EmotionResult> {
    if (!userText?.trim()) {
      throw new Error('[Emotion] 识别失败：用户文本为空')
    }
    if (this.isProcessing) {
      console.warn('[Emotion] 上次识别仍在进行中，跳过本次请求')
      throw new Error('[Emotion] 识别进行中，请稍后再试')
    }

    this.callbacks = { ...this.callbacks, ...callbacks }
    this.isProcessing = true
    const startTime = Date.now()
    this.callbacks.onStart?.()

    console.log(`[Emotion] 🔍 开始多维度情绪识别，输入: "${userText.substring(0, 40)}..."`)

    try {
      // ===== 并行采集所有维度 =====
      const [
        voiceFeature,
        facialFeature,
        drivingFeature,
        heartRateFeature,
        profile,
      ] = await Promise.all([
        Promise.resolve(VoiceAnalyzer.analyze(userText)),
        Promise.resolve(FacialAnalyzer.analyze()),
        Promise.resolve(DrivingBehaviorAnalyzer.analyze()),
        Promise.resolve(HeartRateAnalyzer.analyze()),
        Promise.resolve(this.profileManager.getProfile()),
      ])

      // 各维度可用性
      const availability: DimensionAvailability = {
        voice: true,
        facial: true,
        driving: true,
        heartRate: heartRateFeature.available,
        profile: profile.totalInteractions > 0 || true,  // 有默认画像，始终可用
      }

      // ===== 各维度转分数 (0-100) =====
      const rawScores: DimensionScores = {
        voice: VoiceAnalyzer.toScore(voiceFeature),
        facial: FacialAnalyzer.toScore(facialFeature),
        driving: DrivingBehaviorAnalyzer.toScore(drivingFeature),
        heartRate: HeartRateAnalyzer.toScore(heartRateFeature),
        profile: this.profileManager.toScore(),
      }

      // ===== 动态权重调整（缺失维度重分配）=====
      const adjustedWeights = this.adjustWeights(availability)
      const weightedScores = this.applyWeights(rawScores, adjustedWeights)

      // ===== 融合判定 =====
      const totalScore = Object.values(weightedScores).reduce((a, b) => a + b, 0)
      const { emotion, intensity } = this.determineEmotion(
        totalScore, voiceFeature, rawScores, drivingFeature,
      )
      const scenario = DrivingBehaviorAnalyzer.inferScenario(drivingFeature)

      // ===== 构建最终结果 =====
      const result: EmotionResult = {
        emotion,
        intensity,
        confidence: this.calculateConfidence(rawScores, availability),
        scenario,
        weightedScores,
        usedDimensions: availability,
        processingTimeMs: Date.now() - startTime,
        timestamp: Date.now(),
      }

      // ===== 本地记录情绪事件 =====
      this.profileManager.recordEmotion({
        type: emotion,
        intensity,
        scenario,
        timestamp: result.timestamp,
        summary: userText.substring(0, 60),
        dimensionScores: rawScores,
      })

      // M6: 同步记录到增强画像引擎
      if (this.profileEngine) {
        this.profileEngine.recordEmotion(
          {
            type: emotion,
            intensity,
            scenario,
            timestamp: result.timestamp,
            summary: userText.substring(0, 60),
            dimensionScores: rawScores,
          },
          userText.length,  // 倾诉文本长度
        )
      }

      console.log(
        `[Emotion] ✓ 识别完成 [${result.processingTimeMs}ms]: ` +
        `${EmotionType[emotion]}(${EmotionIntensity[intensity]}) ` +
        `场景=${DrivingScenario[scenario]} 置信度=${result.confidence}`
      )

      this.isProcessing = false
      this.callbacks.onComplete?.(result)
      return result
    } catch (error) {
      this.isProcessing = false
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error(`[Emotion] ✗ 识别失败: ${errMsg}`)
      this.callbacks.onError?.(errMsg)

      // 兜底：返回平稳情绪（PRD要求超时/错误仍正常输出）
      return this.fallbackResult(Date.now() - startTime)
    }
  }

  // ==================== 判断是否需要执行情绪识别 ====================

  /** 当前会话是否已做过识别 */
  isSessionAnalyzed(): boolean {
    return this.sessionAnalyzed
  }

  /** 标记会话已分析（新唤醒时重置） */
  markSessionAnalyzed(analyzed: boolean): void {
    this.sessionAnalyzed = analyzed
  }

  /** 新会话开始时调用 */
  resetForNewSession(): void {
    this.sessionAnalyzed = false
  }

  // ==================== 融合判定逻辑 ====================

  /**
   * 根据综合分数和各维度特征确定情绪类型与强度
   */
  private determineEmotion(
    totalScore: number,
    voice: VoiceFeature,
    rawScores: DimensionScores,
    driving: DrivingFeature,
  ): { emotion: EmotionType; intensity: EmotionIntensity } {
    let emotion: EmotionType
    let intensity: EmotionIntensity

    // ---- 愤怒判断（优先级最高）----
    const angerSignals = voice.emotionKeywords.filter(k =>
      k.startsWith('anger') || k.startsWith('irritability')
    ).length
    const highDrivingStress = rawScores.driving > 60
    const highVoiceNegativity = rawScores.voice > 60

    if (
      (totalScore >= 62 && angerSignals >= 1) ||
      (totalScore >= 55 && angerSignals >= 2) ||
      (highVoiceNegativity && highDrivingStress && angerSignals >= 1)
    ) {
      emotion = EmotionType.ANGER
      intensity = totalScore >= 75 ? EmotionIntensity.HIGH :
                 totalScore >= 65 ? EmotionIntensity.MEDIUM :
                 EmotionIntensity.LOW
    }
    // ---- 疲劳判断 ----
    else if (
      voice.emotionKeywords.some(k => k.startsWith('fatigue')) &&
      rawScores.voice < 58 && driving.stressIndicator < 0.4
    ) {
      emotion = EmotionType.FATIGUE
      intensity = EmotionIntensity.LOW
    }
    // ---- 焦虑判断 ----
    else if (
      voice.emotionKeywords.some(k => k.startsWith('anxiety')) ||
      (voice.speakingRate > 0.75 && voice.pitchVariation > 0.5)
    ) {
      emotion = EmotionType.ANXIETY
      intensity = totalScore >= 60 ? EmotionIntensity.MEDIUM : EmotionIntensity.LOW
    }
    // ---- 烦躁判断 ----
    else if (
      voice.emotionKeywords.some(k => k.startsWith('irritability')) ||
      (totalScore >= 52 && totalScore < 62)
    ) {
      emotion = EmotionType.IRRITABILITY
      intensity = EmotionIntensity.LOW
    }
    // ---- 平稳兜底 ----
    else {
      emotion = EmotionType.CALM
      intensity = EmotionIntensity.LOW
    }

    return { emotion, intensity }
  }

  /**
   * 动态调整权重（缺失维度按比例重分配给其他可用维度）
   */
  private adjustWeights(available: DimensionAvailability): DimensionScores {
    const weights = { ...DEFAULT_DIMENSION_WEIGHTS }
    let missingWeightSum = 0
    let availableDimCount = 0

    if (!available.facial) { missingWeightSum += weights.facial; weights.facial = 0 }
    else availableDimCount++
    if (!available.driving) { missingWeightSum += weights.driving; weights.driving = 0 }
    else availableDimCount++
    if (!available.heartRate) { missingWeightSum += weights.heartRate; weights.heartRate = 0 }
    else availableDimCount++

    // 将缺失权重均分给可用维度
    if (missingWeightSum > 0 && availableDimCount > 0) {
      const redistribution = Math.round(missingWeightSum / availableDimCount)
      if (available.facial) weights.facial += redistribution
      if (available.driving) weights.driving += redistribution
      if (available.heartRate) weights.heartRate += redistribution
      // voice 和 profile 始终可用
      weights.voice += Math.round(missingWeightSum * 0.4)
      weights.profile += Math.round(missingWeightSum * 0.1)
    }

    return weights
  }

  /**
   * 应用权重计算各维度加权分数
   */
  private applyWeights(scores: DimensionScores, weights: DimensionScores): DimensionScores {
    const maxPossible =
      weights.voice + weights.facial + weights.driving +
      weights.heartRate + weights.profile

    return {
      voice: Math.round((scores.voice * weights.voice / maxPossible) * 100) / 100,
      facial: Math.round((scores.facial * weights.facial / Math.max(1, maxPossible)) * 100) / 100,
      driving: Math.round((scores.driving * weights.driving / Math.max(1, maxPossible)) * 100) / 100,
      heartRate: Math.round((scores.heartRate * weights.heartRate / Math.max(1, maxPossible)) * 100) / 100,
      profile: Math.round((scores.profile * weights.profile / maxPossible) * 100) / 100,
    }
  }

  /**
   * 计算整体置信度（基于维度覆盖率和内部一致性）
   */
  private calculateConfidence(scores: DimensionAvailability, availability: DimensionAvailability): number {
    let confidence = 0.6 // 基础置信度

    const dimCount = Object.values(availability).filter(Boolean).confidence
    confidence += dimCount * 0.06 // 每多一个维度+6%

    // 心率和面部数据提升可信度
    if (availability.heartRate) confidence += 0.08
    if (availability.facial) confidence += 0.06

    // 有画像数据时更可信
    if (this.profileManager.getProfile().totalInteractions > 3) {
      confidence += 0.06
    }

    return Math.min(1, Math.round(confidence * 100) / 100)
  }

  /**
   * 降级兜底结果
   */
  private fallbackResult(elapsedMs: number): EmotionResult {
    return {
      emotion: EmotionType.CALM,
      intensity: EmotionIntensity.LOW,
      confidence: 0.3,
      scenario: DrivingScenario.GENERAL,
      weightedScores: { voice: 20, facial: 0, driving: 0, heartRate: 0, profile: 0 },
      usedDimensions: { voice: true, facial: false, driving: false, heartRate: false, profile: false },
      processingTimeMs: elapsedMs,
      timestamp: Date.now(),
    }
  }

  // ==================== 画像查询 ====================

  /** 获取当前司机画像（供外部读取） */
  getDriverProfile(): DriverProfile {
    return this.profileManager.getProfile()
  }

  /** 获取情绪历史记录 */
  getEmotionHistory(): EmotionRecord[] {
    return this.profileManager.getProfile().emotionHistory
  }

  /** 重置画像（调试用） */
  resetProfile(): void {
    this.profileManager.reset()
    this.profileEngine?.reset()
    console.log('[Emotion] 司机画像已重置（含M6增强画像）')
  }

  // ==================== 清理 ====================

  destroy(): void {
    this.isProcessing = false
    this.callbacks = {}
    this.sessionAnalyzed = false
    console.log('[Emotion] 引擎资源已释放')
  }
}
