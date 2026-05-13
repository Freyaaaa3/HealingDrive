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

// ==================== Module 10: 大模型调度常量 ====================

/** Ollama服务基础URL */
export const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434'

/** 大模型推理超时时长 (ms) */
export const LLM_REQUEST_TIMEOUT = 60_000

/** 模型切换超时时长 (ms) */
export const LLM_SWITCH_TIMEOUT = 120_000

/** Ollama服务检测超时 (ms) */
export const OLLAMA_HEALTH_CHECK_TIMEOUT = 5_000

/** 大模型默认温度参数 */
export const LLM_DEFAULT_TEMPERATURE = 0.7

/** 大模型默认最大token数 */
export const LLM_DEFAULT_MAX_TOKENS = 1024

/** 预设模型列表（本地模型，从Ollama动态获取） */
export const OLLAMA_DEFAULT_MODELS: string[] = ['qwen2.5:7b', 'llama3.2:3b', 'gemma2:2b']

/** API模型密钥环境变量映射 */
export const LLM_API_KEY_ENV_MAP: Record<string, string> = {
  openai: 'VITE_OPENAI_API_KEY',
  deepseek: 'VITE_DEEPSEEK_API_KEY',
  doubao: 'VITE_DOUBAO_API_KEY',
  qwen: 'VITE_QWEN_API_KEY',
  moonshot: 'VITE_MOONSHOT_API_KEY',
  anthropic: 'VITE_ANTHROPIC_API_KEY',
} as const

// ==================== Module 11: 疗愈策略&提示词工程常量 ====================

/** 策略引擎匹配超时 (ms) */
export const STRATEGY_MATCH_TIMEOUT = 500

/** 策略缓存过期时间 (ms) — 同场景同情绪短时缓存 */
export const STRATEGY_CACHE_TTL = 60_000

/** 策略缓存最大条数 */
export const STRATEGY_CACHE_MAX_SIZE = 20

/** Few-shot 最大注入数量（防止超出上下文窗口） */
export const FEWSHOT_MAX_COUNT = 5

/** 对话历史最大轮数（注入到LLM上下文） */
export const CONVERSATION_HISTORY_MAX_TURNS = 10

/** 策略引擎状态变更回调类型 */
export type StrategyEngineOnChange = (state: import('@/types').StrategyEngineState) => void

// ==================== Module 12: Agent上下文记忆&对话管理常量 ====================

/** 上下文轮次阈值（默认8轮） */
export const CONTEXT_MAX_TURNS = 8

/** 上下文字符阈值（默认1500字符） */
export const CONTEXT_MAX_CHARS = 1500

/** 上下文压缩Prompt模板 */
export const CONTEXT_COMPRESS_PROMPT = `你是一个专业的对话摘要助手。请对以下对话进行摘要提炼，要求：
1. 提炼用户核心情绪（愤怒/焦虑/烦躁/疲劳/平稳）
2. 提炼触发原因（如：堵车、工作压力大、疲劳驾驶等）
3. 提炼关键诉求（如：需要安慰、需要建议、需要分散注意力等）
4. 提炼对话主旨（用户在倾诉什么方面的话题）
5. 不保留冗余闲聊和口语化表达
6. 摘要长度控制在100-200字

输出格式：
情绪：[核心情绪]
原因：[触发原因]
诉求：[关键诉求]
主旨：[对话主旨]`

/** 压缩后保留最近N轮对话 */
export const CONTEXT_PRESERVE_RECENT_TURNS = 3

/** 压缩后的摘要最大长度 */
export const CONTEXT_COMPRESS_MAX_LENGTH = 300
