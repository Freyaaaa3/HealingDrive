/**
 * 语音指令处理器
 * 
 * 解析用户语音输入，识别6条Demo版支持语音指令
 * 所有指令仅语音触发，无界面按钮
 */
import { VoiceCommandType } from '@/types'

/** 指令匹配规则（关键词 + 正则） */
interface CommandPattern {
  type: VoiceCommandType
  keywords: string[]          // 包含任一关键词即匹配
  patterns?: RegExp[]         // 额外正则匹配
  description: string         // 调试用描述
}

export class VoiceCommandHandler {
  /** 指令规则表 */
  private static readonly COMMAND_PATTERNS: CommandPattern[] = [
    {
      type: VoiceCommandType.EXIT_HEALING,
      keywords: ['退出疗愈', '关闭助手', '退出', '关闭', '不用了', '拜拜', '再见'],
      patterns: [/退出|关闭|不用了|拜拜|再见/],
      description: '退出疗愈模式',
    },
    {
      type: VoiceCommandType.PLAY_MUSIC,
      keywords: ['播放音乐', '放点音乐', '来点音乐', '放歌', '播放舒缓音乐', '听歌'],
      description: '播放舒缓音乐',
    },
    {
      type: VoiceCommandType.STOP_MUSIC,
      keywords: ['停止音乐', '关掉音乐', '别放了', '停'],
      description: '停止音乐',
    },
    {
      type: VoiceCommandType.FIND_PARKING,
      keywords: ['停车', '找停车场', '附近停车', '停车位', '哪里可以停', '去哪停'],
      description: '查找附近停车点',
    },
    {
      type: VoiceCommandType.DEEP_BREATH,
      keywords: ['深呼吸', '放松', '呼吸练习', '帮我放松', '静一静', '冷静一下', '平复心情'],
      description: '深呼吸放松引导',
    },
    {
      type: VoiceCommandType.EMOTION_VENT,
      keywords: ['生气', '烦死了', '很烦', '很累', '累死了', '不开心', '难过', '郁闷',
                 '愤怒', '火大', '气死', '崩溃', '受不了', '想哭', '委屈', '压力大'],
      description: '情绪倾诉识别',
    },
  ]

  /** 指令执行回调 */
  private onCommandDetectedCallback: ((command: VoiceCommandType, text: string) => void) | null = null

  /**
   * 解析用户语音文本，检测是否包含语音指令
   * @param input 用户原始语音转写文本
   * @returns 匹配到的指令类型，UNKNOWN表示纯闲聊
   */
  parse(input: string): { command: VoiceCommandType; matchedKeyword: string | null } {
    const text = input.trim().toLowerCase()

    if (!text) {
      return { command: VoiceCommandType.UNKNOWN, matchedKeyword: null }
    }

    // 按优先级遍历指令表
    for (const pattern of VoiceCommandHandler.COMMAND_PATTERNS) {
      // 关键词匹配
      for (const keyword of pattern.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          console.log(`[VoiceCommand] 识别到指令: ${pattern.description} ("${keyword}")`)
          
          this.onCommandDetectedCallback?.(pattern.type, input)
          return { command: pattern.type, matchedKeyword: keyword }
        }
      }

      // 正则匹配（如果配置了）
      if (pattern.patterns) {
        for (const regex of pattern.patterns) {
          if (regex.test(text)) {
            console.log(`[VoiceCommand] 正则匹配到指令: ${pattern.description}`)
            this.onCommandDetectedCallback?.(pattern.type, input)
            return { command: pattern.type, matchedKeyword: regex.source }
          }
        }
      }
    }

    // 未匹配任何指令 → 纯闲聊/普通倾诉
    return { command: VoiceCommandType.UNKNOWN, matchedKeyword: null }
  }

  /**
   * 设置指令检测回调
   */
  onCommandDetected(callback: (command: VoiceCommandType, text: string) => void): void {
    this.onCommandDetectedCallback = callback
  }

  /**
   * 获取所有支持的指令列表（调试面板展示）
   */
  getSupportedCommands(): Array<{ type: VoiceCommandType; description: string }> {
    return VoiceCommandHandler.COMMAND_PATTERNS.map(p => ({
      type: p.type,
      description: p.description,
    }))
  }
}
