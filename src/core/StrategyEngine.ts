/**
 * Module 11: StrategyEngine — 疗愈策略引擎
 *
 * 核心职责：
 * 1. 驾驶情景管理（CRUD + 启停）
 * 2. 情绪×情景二维策略匹配（精准 > 相似 > 降级）
 * 3. 策略缓存机制（同场景同情绪短时缓存）
 * 4. 性格标签二次微调
 */

import type {
  EmotionResult,
  EnhancedDriverProfile,
  StrategyRule,
  StrategyEngineResult,
  StrategyEngineState,
  DrivingScenarioInfo,
  FewShotExample,
} from '@/types'
import { DrivingScenario, EmotionType } from '@/types'
import {
  DEFAULT_SCENARIOS,
  DEFAULT_STRATEGY_RULES,
  SCENARIO_FALLBACK_MAP,
  PERSONALITY_ADJUSTMENTS,
  BASE_SYSTEM_PROMPT,
} from '@/config/strategy-config'
import {
  STRATEGY_CACHE_TTL,
  STRATEGY_CACHE_MAX_SIZE,
  FEWSHOT_MAX_COUNT,
  type StrategyEngineOnChange,
} from '@/config/constants'

/** 缓存条目 */
interface CacheEntry {
  result: StrategyEngineResult
  expireAt: number
}

export class StrategyEngine {
  private scenarios: DrivingScenarioInfo[] = []
  private rules: StrategyRule[] = []
  private cache = new Map<string, CacheEntry>()
  private onChangeCallback: StrategyEngineOnChange | null = null
  private cacheHitCount = 0
  private totalMatchCount = 0
  private _isReady = false
  private lastMatchReason: string | null = null
  private lastMatchMs: number | null = null

  /** 初始化引擎 */
  init(): StrategyEngineState {
    this.scenarios = [...DEFAULT_SCENARIOS]
    this.rules = [...DEFAULT_STRATEGY_RULES]
    this.cache.clear()
    this.cacheHitCount = 0
    this.totalMatchCount = 0
    this._isReady = true
    this.lastMatchReason = null
    this.lastMatchMs = null
    const state = this.getState()
    this.notifyChange()
    console.log(`[StrategyEngine] 初始化完成: ${this.scenarios.length}个情景, ${this.rules.length}条策略规则`)
    return state
  }

  /** 获取引擎状态 */
  getState(): StrategyEngineState {
    return {
      isReady: this._isReady,
      currentRuleId: null,
      currentScenario: DrivingScenario.GENERAL,
      scenarioCount: this.scenarios.length,
      ruleCount: this.rules.length,
      lastMatchMs: this.lastMatchMs,
      lastMatchReason: this.lastMatchReason,
      cacheHitCount: this.cacheHitCount,
      totalMatchCount: this.totalMatchCount,
    }
  }

  /** 注册状态变更回调 */
  onChange(cb: StrategyEngineOnChange): void {
    this.onChangeCallback = cb
  }

  // ==================== 情景管理 ====================

  /** 获取所有情景 */
  getScenarios(): DrivingScenarioInfo[] {
    return [...this.scenarios]
  }

  /** 获取所有策略规则 */
  getRules(): StrategyRule[] {
    return [...this.rules]
  }

  /** 添加/更新情景 */
  upsertScenario(scenario: DrivingScenarioInfo): void {
    const idx = this.scenarios.findIndex(s => s.id === scenario.id)
    if (idx >= 0) {
      this.scenarios[idx] = scenario
    } else {
      this.scenarios.push(scenario)
    }
    this.notifyChange()
  }

  /** 启停情景 */
  toggleScenario(scenarioId: string, enabled: boolean): void {
    const s = this.scenarios.find(s => s.id === scenarioId)
    if (s) {
      s.enabled = enabled
      this.notifyChange()
    }
  }

  /** 添加/更新策略规则 */
  upsertRule(rule: StrategyRule): void {
    const idx = this.rules.findIndex(r => r.id === rule.id)
    if (idx >= 0) {
      this.rules[idx] = rule
    } else {
      this.rules.push(rule)
    }
    // 新增/修改规则后清除相关缓存
    this.cache.clear()
    this.notifyChange()
  }

  /** 启停策略规则 */
  toggleRule(ruleId: string, enabled: boolean): void {
    const r = this.rules.find(r => r.id === ruleId)
    if (r) {
      r.enabled = enabled
      this.cache.clear()
      this.notifyChange()
    }
  }

  // ==================== 核心策略匹配 ====================

  /**
   * 策略匹配入口
   * 输入：情绪结果 + 增强画像
   * 输出：StrategyEngineResult（含匹配规则、最终Prompt、Few-shot）
   */
  match(
    emotionResult: EmotionResult | null,
    enhancedProfile: EnhancedDriverProfile | null,
  ): StrategyEngineResult {
    const startTime = performance.now()
    this.totalMatchCount++

    const scenarioId = emotionResult?.scenario || DrivingScenario.GENERAL
    const emotionType = emotionResult?.emotion || EmotionType.CALM

    // 1. 检查缓存
    const cacheKey = `${scenarioId}_${emotionType}`
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expireAt > Date.now()) {
      this.cacheHitCount++
      // 注入最新的性格微调（缓存只缓存基础规则，性格是实时的）
      const result = this.applyPersonalityAdjustment(cached.result, enhancedProfile)
      this.lastMatchMs = Math.round(performance.now() - startTime)
      this.lastMatchReason = `缓存命中 (${cacheKey})`
      this.notifyChange()
      return result
    }

    // 2. 精准匹配
    const exactRule = this.findEnabledRule(scenarioId, emotionType)
    if (exactRule) {
      const result = this.buildResult(exactRule, scenarioId, emotionType, false, enhancedProfile)
      this.setCache(cacheKey, result)
      this.lastMatchMs = Math.round(performance.now() - startTime)
      this.lastMatchReason = `精准匹配 (${exactRule.id})`
      this.notifyChange()
      return result
    }

    // 3. 相似情景降级
    const fallbackScenarios = SCENARIO_FALLBACK_MAP[scenarioId] || []
    for (const fallbackScenarioId of fallbackScenarios) {
      const fallbackRule = this.findEnabledRule(fallbackScenarioId, emotionType)
      if (fallbackRule) {
        const result = this.buildResult(
          fallbackRule, scenarioId, emotionType, false, enhancedProfile,
          `降级匹配: ${scenarioId} → ${fallbackScenarioId}`
        )
        this.setCache(cacheKey, result)
        this.lastMatchMs = Math.round(performance.now() - startTime)
        this.lastMatchReason = `相似场景降级 (${fallbackRule.id})`
        this.notifyChange()
        return result
      }
    }

    // 4. 通用兜底
    const genericRule = this.findEnabledRule(DrivingScenario.GENERAL, emotionType)
    if (genericRule) {
      const result = this.buildResult(
        genericRule, scenarioId, emotionType, true, enhancedProfile,
        `兜底匹配: ${scenarioId} → 通用`
      )
      this.setCache(cacheKey, result)
      this.lastMatchMs = Math.round(performance.now() - startTime)
      this.lastMatchReason = `通用兜底 (${genericRule.id})`
      this.notifyChange()
      return result
    }

    // 5. 终极兜底（不应到达，但防御性编程）
    this.lastMatchMs = Math.round(performance.now() - startTime)
    this.lastMatchReason = '无匹配策略，使用内置基础提示词'
    this.notifyChange()
    return {
      ruleId: '_builtin_fallback',
      scenarioId,
      emotionType,
      systemPrompt: this.getBuiltinFallbackPrompt(emotionType),
      fewShots: [],
      matchReason: '无匹配策略，使用内置基础提示词',
      isFallback: true,
      injectedVars: {},
    }
  }

  // ==================== 内部方法 ====================

  private findEnabledRule(scenarioId: string, emotionType: EmotionType): StrategyRule | undefined {
    return this.rules.find(
      r => r.scenarioId === scenarioId && r.emotionType === emotionType && r.enabled
    )
  }

  private buildResult(
    rule: StrategyRule,
    scenarioId: string,
    emotionType: EmotionType,
    isFallback: boolean,
    enhancedProfile: EnhancedDriverProfile | null,
    fallbackReason?: string,
  ): StrategyEngineResult {
    const result: StrategyEngineResult = {
      ruleId: rule.id,
      scenarioId,
      emotionType,
      systemPrompt: rule.systemPrompt,
      fewShots: rule.fewShots.slice(0, FEWSHOT_MAX_COUNT),
      matchReason: fallbackReason || `精准匹配 (${rule.id}: ${rule.description})`,
      isFallback: !!fallbackReason || isFallback,
      injectedVars: {},
    }

    // 注入性格微调
    return this.applyPersonalityAdjustment(result, enhancedProfile)
  }

  /** 注入性格标签微调 */
  private applyPersonalityAdjustment(
    result: StrategyEngineResult,
    enhancedProfile: EnhancedDriverProfile | null,
  ): StrategyEngineResult {
    if (!enhancedProfile) return result

    const tags = enhancedProfile.emotionHabits || []
    const adjustments: string[] = []

    // 性格维度标签
    if (enhancedProfile.extroversion > 0.3) adjustments.push('extroverted')
    if (enhancedProfile.extroversion < -0.3) adjustments.push('introverted')
    if (enhancedProfile.emotionalness > 0.3) adjustments.push('emotional')
    if (enhancedProfile.emotionalness < -0.3) adjustments.push('rational')

    // 情绪习惯标签
    for (const tag of tags) {
      if (tag === 'quick_temper') adjustments.push('quick_temper')
      if (tag === 'anxiety_prone') adjustments.push('anxiety_prone')
      if (tag === 'fatigue_prone') adjustments.push('fatigue_prone')
      if (tag === 'route_sensitive') adjustments.push('route_sensitive')
    }

    // 去重
    const uniqueAdjustments = [...new Set(adjustments)]

    if (uniqueAdjustments.length > 0) {
      const personalityPrompt = uniqueAdjustments
        .map(tag => PERSONALITY_ADJUSTMENTS[tag])
        .filter(Boolean)
        .join('\n')

      if (personalityPrompt) {
        result.systemPrompt += personalityPrompt
        result.injectedVars.personalityTags = uniqueAdjustments.join(', ')
      }
    }

    return result
  }

  private getBuiltinFallbackPrompt(emotionType: EmotionType): string {
    const emotionPrompts: Record<string, string> = {
      [EmotionType.ANGER]: '当前司机处于愤怒状态，请优先共情安抚，不要说"冷静"或"别生气"。',
      [EmotionType.ANXIETY]: '当前司机处于焦虑状态，请用平静稳定的语气安抚。',
      [EmotionType.IRRITABILITY]: '当前司机有些烦躁，请用轻松的方式回应。',
      [EmotionType.FATIGUE]: '当前司机很疲惫，请表达关心，适当提醒安全。',
      [EmotionType.CALM]: '',
    }
    const extra = emotionPrompts[emotionType] || ''
    return BASE_SYSTEM_PROMPT + (extra ? '\n\n' + extra : '')
  }

  private setCache(key: string, result: StrategyEngineResult): void {
    if (this.cache.size >= STRATEGY_CACHE_MAX_SIZE) {
      // FIFO淘汰最早的一条
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }
    this.cache.set(key, {
      result,
      expireAt: Date.now() + STRATEGY_CACHE_TTL,
    })
  }

  private notifyChange(): void {
    this.onChangeCallback?.(this.getState())
  }

  /** 清除缓存 */
  clearCache(): void {
    this.cache.clear()
    this.cacheHitCount = 0
    this.notifyChange()
  }

  destroy(): void {
    this.cache.clear()
    this.onChangeCallback = null
    this._isReady = false
  }
}
