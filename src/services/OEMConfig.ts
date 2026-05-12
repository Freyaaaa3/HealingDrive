/**
 * Module 8: 车企个性化配置管理服务
 *
 * 面向前装车企提供可定制化基础配置能力。
 * Demo版出厂预置默认配置，车企可替换配置后固化到座舱系统。
 * 用户侧无任何配置入口，所有定制内容出厂固化。
 */
import { OEMConfigData, OEMConfigState, OEMTTSVoice, OEMHealingStyle } from '@/types'

/** localStorage 存储键 */
const STORAGE_KEY = 'healing_agent_oem_config'

/** Demo 默认配置 */
const DEFAULT_CONFIG: OEMConfigData = {
  brandName: 'Healing Drive',
  greetingPhrase: '你好呀，我是你的疗愈陪伴小助手。今天开车辛苦了，有什么想跟我聊聊的吗？',
  avatarThemeId: 'healing_gentle_default',
  ttsVoice: OEMTTSVoice.DEFAULT_FEMALE,
  autoExitTimeout: 30_000,
  healingStyle: OEMHealingStyle.GENTLE,
  wakeWord: '小疗同学',
  brandTagline: 'Healing Drive · 智能座舱疗愈陪伴',
}

/** 合法超时值白名单 */
const VALID_TIMEOUTS = [15_000, 30_000, 60_000]

export class OEMConfig {
  private state: OEMConfigState = {
    isLoaded: false,
    isOEM: false,
    config: { ...DEFAULT_CONFIG },
    loadSource: 'demo-default',
  }

  /**
   * 初始化：从 localStorage 读取车企预置配置
   * 配置缺失或非法 → 自动降级为 Demo 默认
   */
  init(): OEMConfigState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<OEMConfigData>
        const validated = this.validateAndMerge(parsed)
        this.state = {
          isLoaded: true,
          isOEM: true,
          config: validated,
          loadSource: 'oem-preset',
        }
        console.log('[OEMConfig] ✓ 车企配置加载成功:', this.state.config.brandName)
      } else {
        this.state = {
          isLoaded: true,
          isOEM: false,
          config: { ...DEFAULT_CONFIG },
          loadSource: 'demo-default',
        }
        console.log('[OEMConfig] 使用 Demo 默认配置')
      }
    } catch (e) {
      console.warn('[OEMConfig] 配置加载失败，使用默认配置:', e)
      this.state = {
        isLoaded: true,
        isOEM: false,
        config: { ...DEFAULT_CONFIG },
        loadSource: 'fallback',
      }
    }
    return this.state
  }

  /** 获取当前配置 */
  getConfig(): OEMConfigData {
    return this.state.config
  }

  /** 获取配置状态 */
  getState(): OEMConfigState {
    return { ...this.state }
  }

  /** 是否为车企定制模式 */
  isOEMMode(): boolean {
    return this.state.isOEM
  }

  /**
   * 车企预置配置写入接口（仅用于出厂烧录/刷机场景）
   * 运行时不可由用户调用
   */
  presetConfig(config: Partial<OEMConfigData>): OEMConfigState {
    const validated = this.validateAndMerge(config)
    this.state = {
      isLoaded: true,
      isOEM: true,
      config: validated,
      loadSource: 'oem-preset',
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validated))
    console.log('[OEMConfig] 车企配置已预置:', validated.brandName)
    return this.state
  }

  /** 重置为 Demo 默认配置（调试用） */
  resetToDefault(): OEMConfigState {
    this.state = {
      isLoaded: true,
      isOEM: false,
      config: { ...DEFAULT_CONFIG },
      loadSource: 'demo-default',
    }
    localStorage.removeItem(STORAGE_KEY)
    console.log('[OEMConfig] 已重置为 Demo 默认配置')
    return this.state
  }

  /** 获取 TTS 音色偏好关键词（用于 TTSEngine 语音选择） */
  getTTSVoicePreference(): { voiceName: string | undefined; ttsConfig: { rate: number; pitch: number; volume: number } } {
    switch (this.state.config.ttsVoice) {
      case OEMTTSVoice.WARM_MALE:
        return { voiceName: undefined, ttsConfig: { rate: 0.85, pitch: 0.85, volume: 0.8 } }
      case OEMTTSVoice.SOFT_FEMALE:
        return { voiceName: undefined, ttsConfig: { rate: 0.85, pitch: 1.1, volume: 0.75 } }
      case OEMTTSVoice.CALM_MALE:
        return { voiceName: undefined, ttsConfig: { rate: 0.8, pitch: 0.8, volume: 0.85 } }
      default:
        return { voiceName: undefined, ttsConfig: { rate: 0.9, pitch: 1.05, volume: 0.8 } }
    }
  }

  /** 验证并合并配置（缺失字段用默认值兜底） */
  private validateAndMerge(partial: Partial<OEMConfigData>): OEMConfigData {
    return {
      brandName: partial.brandName || DEFAULT_CONFIG.brandName,
      greetingPhrase: partial.greetingPhrase || DEFAULT_CONFIG.greetingPhrase,
      avatarThemeId: partial.avatarThemeId || DEFAULT_CONFIG.avatarThemeId,
      ttsVoice: this.isValidEnum(partial.ttsVoice, OEMTTSVoice) ? partial.ttsVoice! : DEFAULT_CONFIG.ttsVoice,
      autoExitTimeout: VALID_TIMEOUTS.includes(partial.autoExitTimeout ?? -1) ? partial.autoExitTimeout! : DEFAULT_CONFIG.autoExitTimeout,
      healingStyle: this.isValidEnum(partial.healingStyle, OEMHealingStyle) ? partial.healingStyle! : DEFAULT_CONFIG.healingStyle,
      wakeWord: partial.wakeWord || DEFAULT_CONFIG.wakeWord,
      brandTagline: partial.brandTagline || DEFAULT_CONFIG.brandTagline,
    }
  }

  private isValidEnum<T>(value: T | undefined, enumObj: Record<string, T>): boolean {
    return value !== undefined && Object.values(enumObj).includes(value)
  }
}
