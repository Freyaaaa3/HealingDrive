/**
 * Module 5+6: 情绪感知共情对话回复生成器
 *
 * 基于 M4 情绪结果 + M6 增强画像 + M6 个性化话术风格生成回复。
 * M6 升级：画像深度参与话术选择（语气/共情度/详略度/风格分支）。
 */
import {
  EmotionType, EmotionIntensity, DrivingScenario,
  EmotionResult, DriverProfile, EnhancedDriverProfile, PersonalizedStyle,
  OEMHealingStyle,
} from '@/types'
import { StyleAdapter } from './StyleAdapter'

/** 回复生成上下文 */
export interface ResponseContext {
  emotion: EmotionResult | null
  profile: DriverProfile | null
  enhancedProfile?: EnhancedDriverProfile | null
  style?: PersonalizedStyle | null
  /** M8: 车企话术风格（gentle=温柔治愈, calm=沉稳理性） */
  oemStyle?: OEMHealingStyle
}

/** 话术库：按 (情绪类型, 强度) 二级分类 */
const RESPONSE_LIBRARY: Record<string, Record<string, string[]>> = {
  [EmotionType.ANGER]: {
    [EmotionIntensity.HIGH]: [
      '我能感受到你现在的愤怒，这在堵车的时候确实很难控制。不过请相信，你现在的安全比什么都重要。我们一起来慢慢平复一下心情好吗？',
      '这么生气的时候开车确实很辛苦，你的感受我完全理解。先做个深呼吸，我陪你一起慢慢来，安全到目的地才是最重要的。',
      '你的情绪完全可以理解，遇到这种路况确实让人火大。但你的安全我一直很担心，让我陪你放松一下，好吗？',
    ],
    [EmotionIntensity.MEDIUM]: [
      '感觉你有些不高兴呢。路上的确总有一些让人心烦的事情，不过别让它们影响了你安全驾驶的心情哦。',
      '我能理解你的心情，开车的时候遇到不顺心的事情确实容易烦躁。不过你已经做得很棒了，再坚持一下好吗？',
      '嗯嗯，这种心情我理解。深呼吸一下，慢慢来，我就在这里陪着你。',
    ],
    [EmotionIntensity.LOW]: [
      '看起来你稍微有点小情绪，不过没关系，路程还长，慢慢来就好。',
      '遇到了一些不愉快的事情吧？别太在意，我来陪你说说话。',
    ],
  },
  [EmotionType.ANXIETY]: {
    [EmotionIntensity.HIGH]: [
      '你现在的紧张感我完全能感受到。请试着放松肩膀和双手，深呼吸一下。不管有什么担心的事情，安全到达才是最重要的。',
      '听起来你现在非常焦虑。没关系，我们一起做几次深呼吸，慢慢把心静下来。你已经很努力了，不要给自己太大压力。',
    ],
    [EmotionIntensity.MEDIUM]: [
      '感觉你有些紧张和不安。慢慢来就好，不用着急赶路。路上的时间也可以是用来放松的。',
      '我理解你现在有些焦虑。试着放松一下，听听音乐或者做几次深呼吸，会舒服很多的。',
    ],
    [EmotionIntensity.LOW]: [
      '有点小紧张吗？别担心，一切都会顺利的。',
      '放轻松，你开得很好呢。',
    ],
  },
  [EmotionType.IRRITABILITY]: {
    [EmotionIntensity.HIGH]: [
      '烦躁的时候真的很难静下心来。不过深呼吸几次，让身体慢慢放松下来，你会发现心情会好很多。我一直在这里陪着你的。',
      '我能感受到你的烦躁。这种路况确实让人很无奈，但发泄情绪的同时也要注意安全。我们来做点放松的事情吧？',
    ],
    [EmotionIntensity.MEDIUM]: [
      '有些烦躁了吧？要不我们听一首舒缓的音乐，帮你平复一下心情？',
      '嗯，我能感受到你现在有点不耐烦。没关系，慢慢来就好，不用急。',
    ],
    [EmotionIntensity.LOW]: [
      '稍微有点不耐烦了？放轻松，快到目的地了。',
      '别着急，我们慢慢来。',
    ],
  },
  [EmotionType.FATIGUE]: {
    [EmotionIntensity.HIGH]: [
      '你看起来真的非常疲惫了。安全第一，如果条件允许的话，建议找个安全的地方休息一会儿。我帮你找找附近有没有合适的停车点？',
      '辛苦了，连续开这么久的车真的很不容易。你的身体和精神都需要休息。要不要我帮你找附近的服务区歇一歇？',
    ],
    [EmotionIntensity.MEDIUM]: [
      '感觉你有些累了。开长途确实很消耗精力，注意安全。要不要播放一些放松的音乐帮你提提神？',
      '辛苦啦！开了一段路了吧？如果觉得累，适当休息一下，安全比什么都重要。',
    ],
    [EmotionIntensity.LOW]: [
      '有一点点累了吧？再坚持一会儿，快到了哦。',
      '长途驾驶辛苦了，记得注意休息。',
    ],
  },
  [EmotionType.CALM]: {
    [EmotionIntensity.LOW]: [
      '今天心情不错呢！有什么想聊的吗？我一直在这里陪你。',
      '嗯嗯，看起来你今天状态不错。路上的风景还好看吗？',
    ],
    [EmotionIntensity.MEDIUM]: [
      '感觉你今天心情挺好的，这趟出行应该很顺利吧？有什么开心的事情想分享吗？',
      '很高兴看到你心情不错。有什么我可以帮到你的吗？',
    ],
    [EmotionIntensity.HIGH]: [
      '哇，你今天心情特别好呀！保持好心情，安全驾驶哦。',
    ],
  },
}

/** M6 个性化话术变体：不同风格对应不同语气的前缀/后缀 */

/** 安静陪伴型后缀（内向用户） */
const QUIET_COMPANION_SUFFIXES = [
  ' 不想说也没关系，我会安静地陪着你。',
  ' 我在这里，什么时候想说都可以。',
]

/** 轻松闲聊型后缀（外向用户） */
const CHATTY_SUFFIXES = [
  ' 要不要聊点别的话题换换心情？',
  ' 我看你平时也挺开朗的，今天怎么啦？',
]

/** 高共情后缀（易激怒/感性用户） */
const HIGH_EMPATHY_SUFFIXES = [
  ' 我知道你平时不是这样的人，一定是有特别烦心的事情。',
  ' 谁遇到这种情况都会不高兴的，你已经处理得很好了。',
]

/** 路况敏感专属安抚 */
const TRAFFIC_SENSITIVE_SUFFIXES = [
  ' 这种路况确实让人心烦，不过别让它影响了你的好心情。',
  ' 路上总有不顺的时候，到了目的地就好了。',
]

/** 问候话术（分风格） */
const GREETING_RESPONSES: Record<string, string[]> = {
  chatty: [
    '你好呀！我是小疗，很高兴能陪你这趟旅程。今天路上怎么样呀？有什么想聊的吗？',
    '嗨～今天开哪条路线？有什么有趣的事情想分享吗？我一直在这里陪你呢。',
  ],
  quiet: [
    '你好，我在这里。',
    '嗯，你好。需要我的时候随时告诉我。',
  ],
  default: [
    '你好呀！我是小疗，很高兴能陪伴你这段旅程。有什么想聊的吗？',
    '嗨～今天路上怎么样？有什么我可以帮你的吗？',
  ],
}

/** 通用闲聊话术（分详略度） */
const CASUAL_RESPONSES_VERBOSE = [
  '嗯嗯，我明白你的意思。谢谢你愿意跟我分享这些，我一直在这里听着呢。还有什么想聊的吗？',
  '说得对呢！你觉得我说得有没有道理？我们继续聊吧～',
  '好的好的，我在认真听哦。你说的这些我都有在理解，请继续说吧。',
]

const CASUAL_RESPONSES_CONCISE = [
  '嗯，我在听。',
  '好的。',
  '我明白了。',
]

const CASUAL_RESPONSES_DEFAULT = [
  '嗯嗯，我明白你的意思。还有什么想聊的吗？',
  '谢谢你愿意告诉我这些，我一直在这里听着呢。',
  '说得对呢，我们继续聊吧～',
  '好的，我在认真听哦，请继续说。',
  '嗯嗯，你说的有道理。还有什么想说的吗？',
]

/** 基于驾驶场景的附加安抚 */
const SCENARIO_SUFFIXES: Partial<Record<DrivingScenario, string[]>> = {
  [DrivingScenario.TRAFFIC_JAM]: [
    '堵车的时候确实容易让人心烦，但这也是一个放慢节奏、调整心态的机会哦。',
    '虽然现在走走停停的，但安全最重要。不如趁这个时间放松一下？',
  ],
  [DrivingScenario.NIGHT]: [
    '夜间开车容易疲劳，一定要注意休息哦。',
    '天黑了更要集中注意力，但也不要太过紧张。',
  ],
  [DrivingScenario.HIGHWAY]: [
    '高速上开车要保持好车距，安全第一。',
    '长途驾驶辛苦了，记得定期休息一下。',
  ],
}

export class EmpatheticResponder {
  private styleAdapter = new StyleAdapter()

  /**
   * 生成共情回复
   */
  generate(userText: string, ctx: ResponseContext): string {
    if (!ctx.emotion) {
      return this.generateBasicResponse(userText, ctx)
    }

    const { emotion, intensity } = ctx.emotion

    if (emotion === EmotionType.CALM) {
      return this.generateCalmResponse(ctx)
    }

    const emotionLib = RESPONSE_LIBRARY[emotion]
    if (!emotionLib) {
      return this.generateCasualResponse(ctx)
    }

    const intensityLib = emotionLib[intensity] || emotionLib[EmotionIntensity.MEDIUM]
    let base = this.pickRandom(intensityLib || emotionLib[EmotionIntensity.LOW] || CASUAL_RESPONSES_DEFAULT)

    // M6: 根据个性化风格调整话术详略
    if (ctx.style) {
      base = this.applyVerbosity(base, ctx.style)
    }

    // M8: 车企话术风格微调
    if (ctx.oemStyle === OEMHealingStyle.CALM) {
      base = this.applyCalmStyle(base)
    }

    // M6: 画像驱动的个性化后缀
    const suffix = this.generateProfileSuffix(ctx)

    // 场景附加安抚（30%概率）
    const scenarioSuffix = this.maybeAddScenarioSuffix(ctx.emotion.scenario)

    return base + suffix + scenarioSuffix
  }

  /**
   * 生成指令确认回复（同样受画像影响）
   */
  generateCommandResponse(command: string, ctx?: ResponseContext): string {
    const map: Record<string, string[]> = {
      music: [
        '好的，为你播放一首舒缓的音乐，希望能让你放松一些。',
        '来了，这首音乐应该能帮你平复一下心情。',
      ],
      stop_music: [
        '好的，音乐已经停了。还有什么需要的吗？',
      ],
      parking: [
        '好的，让我帮你看一下附近的停车点信息...',
      ],
      breath_start: [
        '好呀，让我们一起做几次深呼吸放松一下吧。跟着我的节奏来。',
      ],
      breath_stop: [
        '好的，呼吸引导已停止。感觉是不是好了一些？',
      ],
      exit: [
        '好的，那我就不打扰你了。需要的时候随时叫我「小疗同学」哦。',
        '好的，祝你一路平安！有需要随时唤醒我。',
      ],
    }
    const list = map[command] || CASUAL_RESPONSES_DEFAULT
    return this.pickRandom(list)
  }

  /**
   * 获取 StyleAdapter 实例（供外部推算风格）
   */
  getStyleAdapter(): StyleAdapter {
    return this.styleAdapter
  }

  // ==================== 私有方法 ====================

  /** 基础回复（无情绪上下文） */
  private generateBasicResponse(text: string, ctx: ResponseContext): string {
    const lower = text.toLowerCase()
    if (/你好|嗨|hello|hi|在吗/.test(lower)) {
      return this.generateCalmResponse(ctx)
    }
    return this.generateCasualResponse(ctx)
  }

  /** 平稳/问候回复（分风格） */
  private generateCalmResponse(ctx: ResponseContext): string {
    const styleKey = ctx.style?.chattyStyle ? 'chatty'
      : ctx.style?.quietStyle ? 'quiet'
      : 'default'
    const list = GREETING_RESPONSES[styleKey] || GREETING_RESPONSES.default
    return this.pickRandom(list)
  }

  /** 闲聊回复（根据详略度选择） */
  private generateCasualResponse(ctx: ResponseContext): string {
    if (ctx.style) {
      if (ctx.style.verbosity >= 0.7) {
        return this.pickRandom(CASUAL_RESPONSES_VERBOSE)
      }
      if (ctx.style.verbosity <= 0.35) {
        return this.pickRandom(CASUAL_RESPONSES_CONCISE)
      }
    }
    return this.pickRandom(CASUAL_RESPONSES_DEFAULT)
  }

  /**
   * M6: 根据个性化风格调整话术详略
   * 详略度高时保留完整话术，低时截取前半段
   */
  private applyVerbosity(text: string, style: PersonalizedStyle): string {
    if (style.verbosity >= 0.65) return text
    if (style.verbosity <= 0.35) {
      // 取第一句话
      const firstSentence = text.match(/[^。！？]+[。！？]/)
      if (firstSentence) return firstSentence[0]
    }
    return text
  }

  /**
   * M8: 沉稳理性风格调整
   * 去除语气词、缩短表达，使话术更简洁冷静
   */
  private applyCalmStyle(text: string): string {
    return text
      .replace(/呀|哦|呢|～/g, '')
      .replace(/好好好/g, '好')
      .replace(/让我来帮你/g, '我来')
      .replace(/我们一起/g, '请')
  }

  /**
   * M6: 画像驱动的个性化后缀生成
   * 根据增强画像的特征选择合适的附加话术
   */
  private generateProfileSuffix(ctx: ResponseContext): string {
    if (!ctx.profile && !ctx.enhancedProfile) return ''

    let suffix = ''
    const ep = ctx.enhancedProfile
    const emotion = ctx.emotion?.emotion
    const intensity = ctx.emotion?.intensity

    // 高频易怒 + 愤怒高强度 → 高共情后缀
    if (ctx.profile?.angerFrequency > 0.5 && emotion === EmotionType.ANGER && intensity === EmotionIntensity.HIGH) {
      suffix = ' ' + this.pickRandom(HIGH_EMPATHY_SUFFIXES)
    }
    // 内向标签 + 愤怒 → 安静陪伴
    else if (ctx.profile?.personalityTags.includes('内向') && emotion === EmotionType.ANGER) {
      suffix = ' ' + this.pickRandom(QUIET_COMPANION_SUFFIXES)
    }

    // M6 增强画像更多维度
    if (ep && !suffix) {
      // 外向 + 任意负面情绪 → 闲聊转移
      if (ep.extroversion > 0.3 && emotion && emotion !== EmotionType.CALM) {
        if (Math.random() < 0.4) {
          suffix = ' ' + this.pickRandom(CHATTY_SUFFIXES)
        }
      }
      // 路况敏感 + 拥堵/市区场景
      else if (ep.emotionHabits.includes('traffic_sensitive' as any) &&
        ctx.emotion?.scenario === DrivingScenario.TRAFFIC_JAM) {
        suffix = ' ' + this.pickRandom(TRAFFIC_SENSITIVE_SUFFIXES)
      }
      // 易疲劳 + 疲劳情绪 → 简短关怀
      else if (ep.emotionHabits.includes('fatigue_prone' as any) &&
        emotion === EmotionType.FATIGUE && intensity === EmotionIntensity.HIGH) {
        suffix = ' 你的身体比任何目的地都重要，别硬撑着。'
      }
    }

    return suffix
  }

  /** 概率附加场景安抚语 */
  private maybeAddScenarioSuffix(scenario: DrivingScenario): string {
    if (scenario === DrivingScenario.GENERAL || Math.random() > 0.3) return ''
    const suffixes = SCENARIO_SUFFIXES[scenario]
    if (!suffixes) return ''
    return ' ' + this.pickRandom(suffixes)
  }

  private pickRandom(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)]
  }
}
