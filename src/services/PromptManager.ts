/**
 * Module 11: PromptManager — 提示词工程管理器
 *
 * 核心职责：
 * 1. 根据策略匹配结果组装最终LLM入参（systemPrompt + fewShots + history）
 * 2. 变量注入（情绪强度、性格标签、时间、车企风格等）
 * 3. 情绪上下文注入
 * 4. Few-shot 样本格式化
 */

import type {
  PromptBuildContext,
  StrategyEngineResult,
  LLMMessage,
  EmotionResult,
  EnhancedDriverProfile,
  PersonalizedStyle,
} from '@/types'
import { DrivingScenario, EmotionType, EmotionIntensity } from '@/types'
import {
  CONVERSATION_HISTORY_MAX_TURNS,
  FEWSHOT_MAX_COUNT,
} from '@/config/constants'
import { OEM_STYLE_PROMPT_OVERRIDES } from '@/config/strategy-config'

/** 情绪类型中文映射 */
const EMOTION_LABEL_MAP: Record<string, string> = {
  [EmotionType.ANGER]: '愤怒',
  [EmotionType.ANXIETY]: '焦虑',
  [EmotionType.IRRITABILITY]: '烦躁',
  [EmotionType.FATIGUE]: '疲劳',
  [EmotionType.CALM]: '平稳',
}

/** 情绪强度中文映射 */
const INTENSITY_LABEL_MAP: Record<string, string> = {
  [EmotionIntensity.HIGH]: '高强度',
  [EmotionIntensity.MEDIUM]: '中等',
  [EmotionIntensity.LOW]: '轻微',
}

/** 驾驶场景中文映射 */
const SCENARIO_LABEL_MAP: Record<string, string> = {
  [DrivingScenario.TRAFFIC_JAM]: '拥堵路段',
  [DrivingScenario.HIGHWAY]: '高速公路',
  [DrivingScenario.CITY]: '市区通勤',
  [DrivingScenario.IDLE]: '怠速等待',
  [DrivingScenario.NIGHT]: '夜间长途',
  [DrivingScenario.GENERAL]: '通用场景',
}

export class PromptManager {
  /**
   * 构建完整的 LLM 对话消息列表
   *
   * 组装顺序：
   * 1. system prompt（策略引擎匹配的模板 + 变量注入 + 性格微调 + 车企风格）
   * 2. few-shot 示例（策略匹配的样本，user/assistant交替）
   * 3. 对话历史（最近N轮）
   *
   * 注意：当前用户消息由调用方在最后追加，不包含在此方法中
   */
  buildMessages(
    strategyResult: StrategyEngineResult,
    context: PromptBuildContext,
  ): LLMMessage[] {
    const messages: LLMMessage[] = []

    // 1. 系统提示词（策略模板 + 动态变量注入）
    const systemPrompt = this.buildSystemPrompt(strategyResult, context)
    messages.push({ role: 'system', content: systemPrompt })

    // 2. Few-shot 示例
    const fewShots = this.buildFewShotMessages(strategyResult.fewShots)
    messages.push(...fewShots)

    // 3. 对话历史
    const historyMessages = this.buildHistoryMessages(context.conversationHistory)
    messages.push(...historyMessages)

    return messages
  }

  /**
   * 仅构建系统提示词（用于不需要完整消息列表的场景）
   */
  buildSystemPrompt(
    strategyResult: StrategyEngineResult,
    context: PromptBuildContext,
  ): string {
    let prompt = strategyResult.systemPrompt

    // 注入情绪上下文
    if (context.emotionResult) {
      const emotion = context.emotionResult
      const emotionLabel = EMOTION_LABEL_MAP[emotion.emotion] || emotion.emotion
      const intensityLabel = INTENSITY_LABEL_MAP[emotion.intensity] || emotion.intensity

      prompt += `\n\n当前司机情绪状态：${emotionLabel}（${intensityLabel}），置信度${Math.round((emotion.confidence || 0) * 100)}%`

      // 如果情绪强度为高，额外强调
      if (emotion.intensity === EmotionIntensity.HIGH) {
        prompt += '\n⚠ 司机情绪强度较高，请更加注意语气，优先共情，避免任何可能激化情绪的表达。'
      }
    }

    // 注入驾驶场景
    const scenarioLabel = SCENARIO_LABEL_MAP[context.scenario] || context.scenario
    prompt += `\n\n当前驾驶场景：${scenarioLabel}`

    // 注入时间感知
    const hour = context.currentTime.getHours()
    const timeGreeting = this.getTimeGreeting(hour)
    prompt += `\n当前时间：${timeGreeting}（${hour}点）`

    // 注入个性化风格
    if (context.personalizedStyle) {
      const style = context.personalizedStyle
      if (style.empathyLevel > 0.7) {
        prompt += '\n风格要求：请使用高度共情的语言，展现深入的理解和关怀'
      }
      if (style.verbosity < 0.3) {
        prompt += '\n风格要求：回复保持简短精炼，不要超过30字'
      }
      if (style.chattyStyle) {
        prompt += '\n风格要求：可以适度闲聊，活跃氛围'
      }
      if (style.quietStyle) {
        prompt += '\n风格要求：安静陪伴式语气，多倾听少建议'
      }
    }

    // 注入车企风格叠加
    if (context.oemStyle && OEM_STYLE_PROMPT_OVERRIDES[context.oemStyle]) {
      prompt += OEM_STYLE_PROMPT_OVERRIDES[context.oemStyle]
    }

    // 注入画像稳定性提示（新用户额外说明）
    if (context.enhancedProfile && context.enhancedProfile.stability === 'new') {
      prompt += '\n注意：这是新用户的早期交互，请使用通用温和风格，不要做过度个性化假设。'
    }

    return prompt
  }

  /**
   * 构建 Few-shot 示例消息
   */
  buildFewShotMessages(fewShots: { user: string; assistant: string }[]): LLMMessage[] {
    if (!fewShots || fewShots.length === 0) return []

    const messages: LLMMessage[] = []
    const shots = fewShots.slice(0, FEWSHOT_MAX_COUNT)

    // 添加 few-shot 引导说明
    messages.push({
      role: 'system',
      content: '以下是几个对话示例，请参考这些示例的风格和方式来回复用户：',
    })

    for (const shot of shots) {
      messages.push({ role: 'user', content: shot.user })
      messages.push({ role: 'assistant', content: shot.assistant })
    }

    return messages
  }

  /**
   * 构建对话历史消息
   */
  buildHistoryMessages(history: LLMMessage[]): LLMMessage[] {
    if (!history || history.length === 0) return []

    // 取最近N轮（一问一答为一轮），过滤掉 system 消息
    const userAssistantMessages = history.filter(
      m => m.role === 'user' || m.role === 'assistant'
    )

    const recentMessages = userAssistantMessages.slice(-CONVERSATION_HISTORY_MAX_TURNS)

    if (recentMessages.length === 0) return []

    // 添加历史引导说明
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `以下是最近的对话记录（${recentMessages.length}条消息），请保持上下文连贯：`,
      },
      ...recentMessages,
    ]

    return messages
  }

  // ==================== 辅助方法 ====================

  private getTimeGreeting(hour: number): string {
    if (hour >= 5 && hour < 9) return '早晨'
    if (hour >= 9 && hour < 12) return '上午'
    if (hour >= 12 && hour < 14) return '中午'
    if (hour >= 14 && hour < 18) return '下午'
    if (hour >= 18 && hour < 21) return '傍晚'
    return '深夜'
  }
}
