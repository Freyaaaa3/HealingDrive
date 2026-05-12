/**
 * Module 6: 个性化话术风格适配器
 *
 * 根据增强画像自动推算话术风格配置，
 * 供 EmpatheticResponder 和 HealingService 使用。
 */
import {
  EnhancedDriverProfile,
  PersonalizedStyle,
  ProfileStability,
  InteractionStyle,
} from '@/types'

export class StyleAdapter {
  /**
   * 根据增强画像推算个性化话术风格
   */
  adapt(profile: EnhancedDriverProfile): PersonalizedStyle {
    // 新用户使用默认基准风格
    if (profile.stability === ProfileStability.NEW) {
      return this.defaultStyle()
    }

    const style: PersonalizedStyle = {
      tone: '温柔陪伴',
      empathyLevel: 0.5,
      verbosity: 0.5,
      chattyStyle: false,
      quietStyle: false,
    }

    // ===== 1. 外向/内向 → 话术风格 =====
    if (profile.extroversion > 0.3) {
      // 外向用户 → 轻松闲聊式
      style.tone = '轻松闲聊'
      style.chattyStyle = true
      style.verbosity = Math.min(0.8, style.verbosity + 0.2)
    } else if (profile.extroversion < -0.3) {
      // 内向用户 → 安静温柔共情
      style.tone = '安静共情'
      style.quietStyle = true
      style.verbosity = Math.max(0.3, style.verbosity - 0.15)
    }

    // ===== 2. 感性/理性 → 共情程度 =====
    if (profile.emotionalness > 0.3) {
      // 感性 → 偏情感共鸣
      style.empathyLevel = Math.min(0.95, style.empathyLevel + 0.25)
      style.tone = style.quietStyle ? '温柔共情' : '感性共鸣'
    } else if (profile.emotionalness < -0.3) {
      // 理性 → 偏冷静疏导
      style.empathyLevel = Math.max(0.3, style.empathyLevel - 0.15)
      style.verbosity = Math.max(0.3, style.verbosity - 0.1)
      style.tone = '冷静疏导'
    }

    // ===== 3. 情绪习惯标签 → 微调 =====
    const habits = profile.emotionHabits

    if (habits.some(h => h === 'quick_temper')) {
      // 易激怒 → 共情度拉高，话术更耐心
      style.empathyLevel = Math.min(0.95, style.empathyLevel + 0.15)
      style.verbosity = Math.min(0.85, style.verbosity + 0.1)
    }

    if (habits.some(h => h === 'fatigue_prone')) {
      // 易疲劳 → 话术更简短温柔
      style.verbosity = Math.max(0.3, style.verbosity - 0.1)
      style.tone = '温柔关怀'
    }

    if (habits.some(h => h === 'traffic_sensitive')) {
      // 路况敏感 → 共情度适度提升
      style.empathyLevel = Math.min(0.9, style.empathyLevel + 0.1)
    }

    // ===== 4. 交互风格覆盖 =====
    if (profile.interactionStyle === InteractionStyle.SILENT) {
      style.quietStyle = true
      style.chattyStyle = false
      style.verbosity = Math.max(0.25, style.verbosity - 0.15)
    } else if (profile.interactionStyle === InteractionStyle.CHATTY) {
      style.chattyStyle = true
      style.quietStyle = false
      style.verbosity = Math.min(0.85, style.verbosity + 0.15)
    }

    // 稳定用户微调幅度更小
    if (profile.stability === ProfileStability.STABLE) {
      // 已形成稳定性格，保持当前风格不做大变
    }

    return style
  }

  /** 默认基准风格 */
  private defaultStyle(): PersonalizedStyle {
    return {
      tone: '温柔陪伴',
      empathyLevel: 0.5,
      verbosity: 0.5,
      chattyStyle: false,
      quietStyle: false,
    }
  }
}
