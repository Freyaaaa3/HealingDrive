/** 固定唤醒词 - Demo版仅支持单一唤醒词 */
export const WAKE_WORD = '小疗同学'

/** 默认唤醒词备选列表（用于扩展） */
export const WAKE_WORD_ALTERNATIVES: string[] = [
  '小疗同学',
]

/** 无交互自动退出时长 (ms) */
export const AUTO_EXIT_TIMEOUT = 30_000

/** 情绪识别超时时长 (ms) */
export const EMOTION_RECOGNITION_TIMEOUT = 2_000

/** 资源预加载超时 (ms) */
export const RESOURCE_LOAD_TIMEOUT = 10_000

/** 初始化延迟时间 - 系统资源不足时 (ms) */
export const INIT_DELAY_ON_LOW_RESOURCE = 3_000

/** 后台重启监听间隔 (ms) - 进程被查杀时 */
export const RESTART_LISTEN_INTERVAL = 5_000

/** 降级策略配置 */
export const DEGRADE_STRATEGY = {
  /** 缺少麦克风：关闭所有交互能力 */
  NO_MICROPHONE: RunMode.MINIMAL,
  /** 缺少摄像头：剔除面部识别维度 */
  NO_CAMERA: RunMode.NO_CAMERA,
  /** 缺少地图：关闭停车推荐 */
  NO_MAP: RunMode.NO_MAP,
  /** 资源加载失败：仅保留语音 */
  RESOURCE_FAIL: RunMode.VOICE_ONLY,
} as const

// ==================== Module 9: 全局交互&异常处理常量 ====================

/** 全局异常日志最大条数 */
export const MAX_ERROR_LOG_COUNT = 50

/** 降级策略超时阈值（ms）：模块异常后多久标记为已降级 */
export const DEGRADE_CONFIRM_TIMEOUT = 3_000

/** 音频通道冲突检测间隔（ms） */
export const AUDIO_CONFLICT_CHECK_INTERVAL = 1_000

/** M9: 全局统一降级兜底话术 */
export const FALLBACK_RESPONSES = {
  /** ASR识别失败 */
  asr_failed: '没听清呢，可以再说一遍吗？',
  /** 大模型响应超时 */
  llm_timeout: '让我想想怎么陪你更好。',
  /** 通用安抚 */
  general_comfort: '我一直在你身边。',
  /** 音乐播放失败 */
  music_failed: '暂时无法播放音乐，我们先聊一会儿吧。',
  /** 停车推荐无数据 */
  parking_unavailable: '暂时没有找到附近的停车点，你还好吗？',
  /** TTS播报异常 */
  tts_failed: '',
} as const

// 引入RunMode类型（循环依赖解决）
import { RunMode } from '@/types'
