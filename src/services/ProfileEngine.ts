/**
 * Module 6: 多维度司机画像引擎
 *
 * 在 M4 ProfileManager 基础上增强，新增：
 *   - 双轴性格模型（外向/内向 × 感性/理性）
 *   - 情绪习惯标签（易激怒/易焦虑/易疲劳/路况敏感）
 *   - 交互风格偏好（爱闲聊/沉默倾听/均衡）
 *   - 情绪类型统计、场景触发统计、驾驶时段偏好
 *   - 画像稳定性等级（新用户/形成中/已稳定）
 *   - 向下兼容 M4 DriverProfile
 *
 * 全部数据仅存 localStorage，不上云。
 */
import {
  EmotionType, EmotionIntensity, DrivingScenario,
  EmotionRecord, DriverProfile,
  EnhancedDriverProfile,
  EmotionHabitTag, InteractionStyle, ProfileStability,
  EmotionTypeStats, ScenarioTriggerStats, DrivingTimePreference,
  ProfileEngineCallbacks,
} from '@/types'

const STORAGE_KEY = 'healing_agent_enhanced_profile'

/** 最小交互次数阈值 */
const STABILITY_THRESHOLDS = {
  NEW: 5,
  FORMING: 15,
} as const

/** 性格标签生成所需的最低样本数 */
const MIN_SAMPLE_FOR_PERSONALITY = 5

export class ProfileEngine {
  private profile: EnhancedDriverProfile
  private callbacks: ProfileEngineCallbacks = {}

  constructor() {
    this.profile = this.load()
  }

  // ==================== 公共 API ====================

  /** 获取增强画像（只读副本） */
  getProfile(): EnhancedDriverProfile {
    return { ...this.profile }
  }

  /** 获取 M4 兼容的基础画像 */
  getBaseProfile(): DriverProfile {
    const p = this.profile
    return {
      angerFrequency: p.angerFrequency,
      personalityTags: p.personalityTags,
      totalInteractions: p.totalInteractions,
      lastUpdated: p.lastUpdated,
      emotionHistory: p.emotionHistory,
    }
  }

  /**
   * 记录一次情绪事件并迭代画像
   * 由 EmotionRecognition 或外部调用
   */
  recordEmotion(record: Omit<EmotionRecord, 'id'>, utteranceLength?: number, turnCount?: number): EmotionRecord {
    const fullRecord: EmotionRecord = {
      ...record,
      id: `er_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    }

    // 追加到历史（最多保留50条，比M4的20条更多以支持更准确的画像）
    this.profile.emotionHistory.push(fullRecord)
    if (this.profile.emotionHistory.length > 50) {
      this.profile.emotionHistory = this.profile.emotionHistory.slice(-50)
    }

    // 更新基础统计
    this.profile.totalInteractions++
    this.updateEmotionStats(record.type)
    this.updateScenarioStats(record.scenario)
    this.updateTimePreference()
    if (utteranceLength != null) this.updateUtteranceLength(utteranceLength)
    if (turnCount != null) this.updateTurnCount(turnCount)

    // 迭代画像标签（仅当样本充足时）
    if (this.profile.totalInteractions >= MIN_SAMPLE_FOR_PERSONALITY) {
      this.iteratePersonality()
      this.iterateEmotionHabits()
      this.iterateInteractionStyle()
    }

    // 更新稳定性
    this.updateStability()

    // 更新 M4 兼容字段
    this.syncLegacyTags()

    this.profile.lastUpdated = Date.now()
    this.save()

    // 回调
    this.callbacks.onProfileUpdate?.(this.getProfile())

    return fullRecord
  }

  /** 设置回调 */
  setCallbacks(cbs: ProfileEngineCallbacks): void {
    this.callbacks = { ...this.callbacks, ...cbs }
  }

  /** 重置画像 */
  reset(): void {
    this.profile = this.createDefault()
    this.save()
  }

  // ==================== 内部：画像迭代算法 ====================

  /** 更新情绪类型统计 */
  private updateEmotionStats(type: EmotionType): void {
    const s = this.profile.emotionStats
    s.total++
    switch (type) {
      case EmotionType.ANGER: s.anger++; break
      case EmotionType.ANXIETY: s.anxiety++; break
      case EmotionType.IRRITABILITY: s.irritability++; break
      case EmotionType.FATIGUE: s.fatigue++; break
      case EmotionType.CALM: s.calm++; break
    }

    // 同步更新 M4 的 angerFrequency（最近10次）
    const recent = this.profile.emotionHistory.slice(-10)
    const angerCount = recent.filter(r => r.type === EmotionType.ANGER).length
    this.profile.angerFrequency = Math.round((angerCount / Math.max(1, recent.length)) * 100) / 100
  }

  /** 更新场景触发统计 */
  private updateScenarioStats(scenario: DrivingScenario): void {
    const key = scenario as keyof ScenarioTriggerStats
    if (key in this.profile.scenarioStats) {
      this.profile.scenarioStats[key]++
    }
  }

  /** 更新驾驶时段偏好 */
  private updateTimePreference(): void {
    const hour = new Date().getHours()
    if (hour >= 7 && hour < 9) this.profile.timePreference.morningRush++
    else if (hour >= 17 && hour < 19) this.profile.timePreference.eveningRush++
    else if (hour >= 22 || hour < 6) this.profile.timePreference.nightDrive++
    else this.profile.timePreference.normal++
  }

  /** 更新平均倾诉文本长度 */
  private updateUtteranceLength(length: number): void {
    const total = this.profile.totalInteractions
    const old = this.profile.avgUtteranceLength
    this.profile.avgUtteranceLength = Math.round((old * (total - 1) + length) / total)
  }

  /** 更新平均对话轮次 */
  private updateTurnCount(count: number): void {
    const total = this.profile.totalInteractions
    const old = this.profile.avgTurnCount
    this.profile.avgTurnCount = Math.round((old * (total - 1) + count) / total * 10) / 10
  }

  /**
   * 迭代性格维度
   * 基于倾诉长度判断外向度，基于情绪频率判断感性度
   */
  private iteratePersonality(): void {
    const history = this.profile.emotionHistory
    if (history.length < MIN_SAMPLE_FOR_PERSONALITY) return

    // 外向度：基于平均倾诉长度
    // 短文本（<10字）偏内向，长文本（>30字）偏外向
    const avgLen = this.profile.avgUtteranceLength
    if (avgLen > 0) {
      // sigmoid 映射到 -1 ~ +1
      const normalized = (avgLen - 20) / 15
      this.profile.extroversion = Math.max(-1, Math.min(1, Math.round(normalized * 100) / 100))
    }

    // 感性度：基于负面情绪出现频率
    const s = this.profile.emotionStats
    const negRatio = s.total > 0
      ? (s.anger + s.anxiety + s.irritability + s.fatigue) / s.total
      : 0
    // 负面情绪占比高 → 偏感性
    const normalized = (negRatio - 0.5) * 2
    this.profile.emotionalness = Math.max(-1, Math.min(1, Math.round(normalized * 100) / 100))
  }

  /**
   * 迭代情绪习惯标签
   * 基于各情绪类型在历史中的占比
   */
  private iterateEmotionHabits(): void {
    const s = this.profile.emotionStats
    const total = Math.max(1, s.total)
    const habits: EmotionHabitTag[] = []

    // 易激怒：愤怒占比 > 30%
    if (s.anger / total > 0.3) habits.push(EmotionHabitTag.QUICK_TEMPER)

    // 易焦虑：焦虑占比 > 25%
    if (s.anxiety / total > 0.25) habits.push(EmotionHabitTag.ANXIETY_PRONE)

    // 易疲劳：疲劳占比 > 25%
    if (s.fatigue / total > 0.25) habits.push(EmotionHabitTag.FATIGUE_PRONE)

    // 路况敏感：拥堵场景触发负面情绪占比高
    const ss = this.profile.scenarioStats
    const jamTriggers = ss.traffic_jam
    if (jamTriggers >= 3) {
      habits.push(EmotionHabitTag.TRAFFIC_SENSITIVE)
    }

    this.profile.emotionHabits = habits
  }

  /**
   * 迭代交互风格偏好
   * 基于平均倾诉长度 + 平均对话轮次
   */
  private iterateInteractionStyle(): void {
    const avgLen = this.profile.avgUtteranceLength
    const avgTurns = this.profile.avgTurnCount

    if (avgLen > 25 && avgTurns > 3) {
      this.profile.interactionStyle = InteractionStyle.CHATTY
    } else if (avgLen < 12 && avgTurns < 2.5) {
      this.profile.interactionStyle = InteractionStyle.SILENT
    } else {
      this.profile.interactionStyle = InteractionStyle.MIXED
    }
  }

  /** 更新稳定性等级 */
  private updateStability(): void {
    const n = this.profile.totalInteractions
    if (n < STABILITY_THRESHOLDS.NEW) {
      this.profile.stability = ProfileStability.NEW
    } else if (n < STABILITY_THRESHOLDS.FORMING) {
      this.profile.stability = ProfileStability.FORMING
    } else {
      this.profile.stability = ProfileStability.STABLE
    }
  }

  /**
   * 同步 M4 兼容的 personalityTags
   * 从 M6 增强字段映射回简单标签
   */
  private syncLegacyTags(): void {
    const tags: string[] = []

    // 性格维度标签
    if (this.profile.extroversion > 0.2) tags.push('外向')
    else if (this.profile.extroversion < -0.2) tags.push('内向')

    if (this.profile.emotionalness > 0.2) tags.push('感性')
    else if (this.profile.emotionalness < -0.2) tags.push('理性')

    // 情绪习惯标签映射
    const habitMap: Record<EmotionHabitTag, string> = {
      [EmotionHabitTag.QUICK_TEMPER]: '易激怒',
      [EmotionHabitTag.ANXIETY_PRONE]: '易焦虑',
      [EmotionHabitTag.FATIGUE_PRONE]: '易疲劳',
      [EmotionHabitTag.TRAFFIC_SENSITIVE]: '路况敏感',
    }
    for (const h of this.profile.emotionHabits) {
      tags.push(habitMap[h])
    }

    // 稳定补充
    if (this.profile.totalInteractions >= 5) {
      const s = this.profile.emotionStats
      const negRatio = (s.anger + s.anxiety + s.irritability + s.fatigue) / Math.max(1, s.total)
      if (negRatio < 0.2) tags.push('心态平稳')
    }

    this.profile.personalityTags = tags.length > 0 ? tags : ['通用基准']
  }

  // ==================== 持久化 ====================

  private load(): EnhancedDriverProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // 合并默认值（处理老版本缺少新字段的情况）
        return { ...this.createDefault(), ...parsed }
      }
    } catch (e) {
      console.warn('[ProfileEngine] 画像加载失败，使用默认:', e)
    }
    return this.createDefault()
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile))
    } catch (e) {
      console.warn('[ProfileEngine] 画像保存失败:', e)
    }
  }

  private createDefault(): EnhancedDriverProfile {
    return {
      // M4 兼容字段
      angerFrequency: 0,
      personalityTags: ['通用基准'],
      totalInteractions: 0,
      lastUpdated: Date.now(),
      emotionHistory: [],
      // M6 新增字段
      extroversion: 0,
      emotionalness: 0,
      stability: ProfileStability.NEW,
      emotionHabits: [],
      interactionStyle: InteractionStyle.MIXED,
      emotionStats: { anger: 0, anxiety: 0, irritability: 0, fatigue: 0, calm: 0, total: 0 },
      scenarioStats: { traffic_jam: 0, highway: 0, city: 0, idle: 0, night: 0, general: 0 },
      timePreference: { morningRush: 0, eveningRush: 0, nightDrive: 0, normal: 0 },
      avgUtteranceLength: 20,
      avgTurnCount: 2.0,
    }
  }
}
