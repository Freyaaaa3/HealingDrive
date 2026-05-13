// ==================== 权限类型 ====================

/** 系统权限枚举 */
export enum PermissionType {
  MICROPHONE = 'microphone',      // 麦克风权限
  CAMERA = 'camera',              // 摄像头权限
  MAP = 'map',                    // 地图权限
}

/** 权限状态 */
export enum PermissionStatus {
  GRANTED = 'granted',            // 已授权
  DENIED = 'denied',              // 已拒绝
  NOT_AVAILABLE = 'not_available' // 不可用（硬件缺失）
}

export interface PermissionState {
  type: PermissionType
  status: PermissionStatus
}

// ==================== 系统状态类型 ====================

/** 应用初始化阶段 */
export enum InitPhase {
  IDLE = 'idle',                  // 未启动
  STARTING = 'starting',          // 启动中
  PERMISSION_CHECK = 'permission_check',  // 权限校验中
  RESOURCE_LOADING = 'resource_loading',  // 资源加载中
  WAKE_LISTENING = 'wake_listening',      // 唤醒监听就绪
  DEGRADED = 'degraded',          // 降级运行
  ERROR = 'error',                // 异常状态
}

/** 运行模式 */
export enum RunMode {
  FULL = 'full',                  // 完整模式（所有能力可用）
  NO_CAMERA = 'no_camera',        // 无摄像头降级
  NO_MAP = 'no_map',             // 无地图降级
  VOICE_ONLY = 'voice_only',      // 仅语音模式
  MINIMAL = 'minimal',            // 最小化模式
}

// ==================== 资源类型 ====================

/** 预加载资源状态 */
export interface ResourceLoadState {
  avatarResources: boolean        // 2D虚拟形象资源
  audioConfig: boolean           // 音色配置
  fallbackPhrases: boolean       // 兜底话术库
  modelConfig: boolean           // 大模型配置
}

// ==================== 唤醒词相关 ====================

/** 唤醒监听状态 */
export enum WakeStatus {
  ACTIVE = 'active',              // 监听中
  INACTIVE = 'inactive',          // 未激活
  DETECTED = 'detected',          // 检测到唤醒词
  ERROR = 'error',                // 错误
}

// ==================== 虚拟形象 & 面板类型（Module 2）====================

/** 虚拟形象动画状态 */
export enum AvatarState {
  HIDDEN = 'hidden',              // 隐藏（未唤醒/已收起）
  IDLE = 'idle',                  // 待机（呼吸浮动）
  LISTENING = 'listening',        // 倾听（点头/侧耳）
  SPEAKING = 'speaking',          // 说话（嘴部微动+肢体）
  HEALING = 'healing',            // 疗愈中（柔和光效）
}

/** 疗愈面板可见性 */
export enum PanelVisibility {
  HIDDEN = 'hidden',              // 隐藏
  ENTERING = 'entering',          // 进入动画中
  VISIBLE = 'visible',            // 可见
  EXITING = 'exiting',            // 退出动画中
}

/** 超时计时器状态 */
export enum AutoExitStatus {
  IDLE = 'idle',                  // 未计时
  COUNTING = 'counting',          // 计时中
  PAUSED = 'paused',              // 已暂停（对话进行中）
  EXPIRED = 'expired',            // 超时触发
}

// ==================== UI设计令牌（Module 2 UI风格PRD）====================

/** 设计系统色彩 */
export interface DesignTokens {
  colors: {
    primary: string               // 柔和雾霾蓝（主色）
    primaryLight: string          // 主色浅色
    primaryGlow: string           // 主色发光效果
    bgGlass: string               // 毛玻璃背景
    bgGlassHover: string           // 毛玻璃悬浮态
    textPrimary: string           // 文字主色
    textSecondary: string         // 文字次要色
    textMuted: string             // 弱化文字
    stateIdle: string             // 待机态颜色
    stateListening: string        // 倾听态颜色
    stateSpeaking: string         // 说话态颜色
    stateHealing: string          // 疗愈态颜色
  }
  radius: {
    panel: string                 // 面板圆角 28dp
    card: string                  // 卡片圆角 16dp
    button: string                // 按钮/标签圆角 12dp
  }
  blur: {
    glass: string                 // 毛玻璃模糊强度
  }
  shadow: {
    panel: string                 // 面板阴影
  }
}

/** 虚拟形象配置接口 */
export interface AvatarConfig {
  id: string
  name: string
  style: 'healing_gentle' | string
  size: { width: number; height: number }
  animations: {
    idle: AnimationConfig
    listening: AnimationConfig
    speaking: AnimationConfig
    healing: AnimationConfig
  }
}

export interface AnimationConfig {
  duration: number                // 动画周期(ms)
  easing: string                  // 缓动函数
}

/** 疗愈面板状态 */
export interface PanelState {
  visibility: PanelVisibility
  avatarState: AvatarState
  autoExitStatus: AutoExitStatus
  lastInteractionTime: number | null
  showStatusText: boolean
  statusText: string
}

// ==================== 语音交互类型（Module 3）====================

/** ASR识别状态 */
export enum ASRStatus {
  IDLE = 'idle',                    // 空闲
  LISTENING = 'listening',          // 正在倾听（唤醒后连续监听）
  RECOGNIZING = 'recognizing',      // 正在识别中
  SUCCESS = 'success',              // 识别成功
  ERROR = 'error',                  // 识别错误
}

/** TTS合成状态 */
export enum TTSStatus {
  IDLE = 'idle',                    // 空闲
  SPEAKING = 'speaking',            // 正在播报
  PAUSED = 'paused',                // 已暂停（被打断）
  ERROR = 'error',                  // 合成错误
}

/** 对话轮次状态 */
export enum ConversationPhase {
  IDLE = 'idle',                    // 未对话
  AWAITING_INPUT = 'awaiting_input',// 等待用户输入
  PROCESSING = 'processing',        // 处理中（ASR+情绪+大模型）
  RESPONDING = 'responding',        // Agent回复中（TTS播报）
}

/** 音频通道优先级 */
export enum AudioPriority {
  PHONE_CALL = 0,                   // 蓝牙通话（最高）
  NAVIGATION = 1,                   // 导航播报
  HEALING_AGENT = 2,                // 疗愈语音
  MUSIC = 3,                        // 车载音乐（最低）
}

/** 语音指令枚举 */
export enum VoiceCommandType {
  EXIT_HEALING = 'exit_healing',           // 退出疗愈
  PLAY_MUSIC = 'play_music',               // 播放舒缓音乐
  STOP_MUSIC = 'stop_music',               // 停止音乐
  FIND_PARKING = 'find_parking',           // 找附近停车点
  DEEP_BREATH = 'deep_breath',             // 深呼吸放松
  EMOTION_VENT = 'emotion_vent',           // 情绪倾诉
  UNKNOWN = 'unknown',                     // 未知指令/闲聊
}

/** ASR识别结果 */
export interface ASRResult {
  text: string                         // 转写文本
  isFinal: boolean                     // 是否最终结果
  confidence: number                   // 置信度 0-1
  timestamp: number                    // 时间戳
}

/** TTS播报配置 */
export interface TTSConfig {
  voiceName?: string                   // 指定音色名称
  rate?: number                        // 语速 (0.5-2, 默认0.9)
  pitch?: number                       // 音调 (0-2, 默认1.0)
  volume?: number                      // 音量 (0-1, 默认0.8)
}

/** 单条对话消息 */
export interface DialogueMessage {
  id: string                           // 唯一ID
  role: 'user' | 'agent' | 'system'   // 角色
  content: string                      // 内容文本
  timestamp: number                    // 时间戳
  /** 关联的语音指令（如果有） */
  command?: VoiceCommandType
  /** ASR中间识别结果（实时显示用） */
  interimText?: string
}

/** 对话会话 */
export interface ConversationSession {
  id: string                           // 会话ID
  messages: DialogueMessage[]          // 对话历史
  startedAt: number                    // 开始时间
  lastActivityAt: number               // 最后活跃时间
  turnCount: number                    // 轮次数
}

/** 语音交互完整状态 */
export interface VoiceInteractionState {
  asrStatus: ASRStatus
  ttsStatus: TTSStatus
  conversationPhase: ConversationPhase
  currentSession: ConversationSession | null
  lastAsrResult: ASRResult | null
  audioChannelBusy: boolean            // 音频通道是否被占用
  busyPriority: AudioPriority | null   // 占用的优先级来源
}

// ==================== 多维度情绪识别类型（Module 4）====================

/** 情绪类型枚举 */
export enum EmotionType {
  ANGER = 'anger',             // 愤怒（核心优先级）
  ANXIETY = 'anxiety',         // 焦虑
  IRRITABILITY = 'irritability', // 烦躁
  FATIGUE = 'fatigue',         // 疲劳
  CALM = 'calm',               // 平稳/无负面情绪
}

/** 情绪强度 */
export enum EmotionIntensity {
  HIGH = 'high',               // 高强度
  MEDIUM = 'medium',           // 中等强度
  LOW = 'low',                 // 低强度
}

/** 驾驶场景标签 */
export enum DrivingScenario {
  TRAFFIC_JAM = 'traffic_jam',     // 拥堵
  HIGHWAY = 'highway',            // 高速
  CITY = 'city',                  // 市区
  IDLE = 'idle',                  // 怠速
  NIGHT = 'night',                // 夜间
  GENERAL = 'general',            // 通用（无法判断时）
}

/** 数据采集维度可用性 */
export interface DimensionAvailability {
  voice: boolean       // 语音维度（必须）
  facial: boolean      // 面部表情
  driving: boolean     // 驾驶行为
  heartRate: boolean   // 心率监测
  profile: boolean     // 性格画像
}

// ---- 各维度特征数据 ----

/** 语音语义&语气特征 */
export interface VoiceFeature {
  text: string                     // 倾诉文本
  speakingRate: number             // 语速 (0-1, 相对值)
  pitchVariation: number           // 语调变化幅度 (0-1)
  volumeVariation: number          // 音量起伏 (0-1)
  emotionKeywords: string[]        // 匹配到的情绪化关键词
  sentimentScore: number           // 语义情感分 (-1到+1, 负=负面)
}

/** 面部表情特征（Demo版模拟） */
export interface FacialFeature {
  frownIntensity: number           // 眉头紧锁程度 (0-1)
  mouthDroop: number              // 嘴角下沉程度 (0-1)
  faceTension: number             // 面部紧绷度 (0-1)
  microExpression: string | null  // 检测到的微表情类型
  confidence: number              // 检测置信度 (0-1)
}

/** 驾驶行为特征（Demo版模拟） */
export interface DrivingFeature {
  currentSpeed: number             // 当前车速 km/h
  hardBrakeCount: number          // 急刹频次（最近5分钟）
  laneChangeFreq: number          // 变道频率（次/分钟）
  sharpTurnCount: number          // 急转弯次数
  followingDistance: number       // 跟车距离等级 (0-3)
  stressIndicator: number         // 综合驾驶压力指标 (0-1)
}

/** 心率特征（Demo版模拟，可选硬件） */
export interface HeartRateFeature {
  currentBPM: number              // 当前心率
  variability: number             // 心率波动幅度
  trend: 'rising' | 'stable' | 'falling'  // 趋势
  available: boolean              // 是否有有效数据
}

/** 司机性格画像 */
export interface DriverProfile {
  angerFrequency: number           // 易怒频次 (0-1)
  personalityTags: string[]       // 性格标签 ['内向','感性'...]
  totalInteractions: number       // 总交互次数
  lastUpdated: number             // 最后更新时间戳
  emotionHistory: EmotionRecord[] // 历史情绪记录（最近20条）
}

/** 单条情绪记录 */
export interface EmotionRecord {
  id: string
  type: EmotionType
  intensity: EmotionIntensity
  scenario: DrivingScenario
  timestamp: number
  summary: string                 // 对话摘要
  dimensionScores: DimensionScores // 各维度原始分数
}

/** 各维度原始分数 */
export interface DimensionScores {
  voice: number                   // 语音分 (0-100)
  facial: number                  // 面部分 (0-100)
  driving: number                 // 驾驶分 (0-100)
  heartRate: number               // 心率分 (0-100)
  profile: number                 // 画像分 (0-100)
}

// ---- 最终输出 ----

/** 情绪识别完整结果 */
export interface EmotionResult {
  /** 主导情绪类型 */
  emotion: EmotionType
  /** 情绪强度 */
  intensity: EmotionIntensity
  /** 综合置信度 (0-1) */
  confidence: number
  /** 驾驶场景 */
  scenario: DrivingScenario
  /** 各维度加权后的贡献分 */
  weightedScores: DimensionScores
  /** 实际使用的维度 */
  usedDimensions: DimensionAvailability
  /** 处理耗时 ms */
  processingTimeMs: number
  /** 时间戳 */
  timestamp: number
}

/** 情绪识别回调 */
export interface EmotionRecognitionCallbacks {
  /** 识别完成 */
  onComplete?: (result: EmotionResult) => void
  /** 识别失败 */
  onError?: (error: string) => void
  /** 识别开始 */
  onStart?: () => void
}

// ==================== 核心疗愈服务类型（Module 5）====================

/** 音乐播放状态 */
export enum MusicPlayState {
  STOPPED = 'stopped',
  PLAYING = 'playing',
  PAUSED = 'paused',
}

/** 音乐曲目信息 */
export interface MusicTrack {
  id: string
  name: string
  /** Demo版使用 Web Audio 合成参数 */
  frequency: number
  waveType: OscillatorType
  /** 舒缓程度 0-1 */
  calmness: number
}

/** 音乐播放器状态 */
export interface MusicPlayerState {
  status: MusicPlayState
  currentTrack: MusicTrack | null
  volume: number
  /** 曲目列表索引 */
  trackIndex: number
}

/** 呼吸引导阶段 */
export enum BreathPhase {
  IDLE = 'idle',
  INHALE = 'inhale',         // 吸气 4s
  HOLD = 'hold',             // 屏息 4s
  EXHALE = 'exhale',         // 呼气 6s
  COMPLETE = 'complete',     // 全部完成
}

/** 呼吸引导配置 */
export interface BreathGuideConfig {
  inhaleDuration: number     // 吸气秒数 (默认4)
  holdDuration: number       // 屏息秒数 (默认4)
  exhaleDuration: number     // 呼气秒数 (默认6)
  cycles: number             // 循环次数 (默认3)
}

/** 呼吸引导状态 */
export interface BreathGuideState {
  phase: BreathPhase
  currentCycle: number
  totalCycles: number
  elapsedSeconds: number
}

/** 停车点信息 */
export interface ParkingSpot {
  id: string
  name: string
  /** 距离(米) */
  distance: number
  /** 方位描述 */
  direction: string
  /** 停车类型 */
  type: 'service_area' | 'roadside' | 'parking_lot' | 'rest_area'
  /** 是否推荐 */
  recommended: boolean
}

/** 疗愈策略类型 */
export enum HealingStrategy {
  EMPATHETIC_DIALOG = 'empathetic_dialog',
  SOOTHING_MUSIC = 'soothing_music',
  BREATH_GUIDE = 'breath_guide',
  PARKING_RECOMMEND = 'parking_recommend',
}

/** 疗愈策略匹配结果 */
export interface HealingStrategyMatch {
  primary: HealingStrategy
  optional: HealingStrategy[]
  reason: string
}

/** 疗愈服务状态总览 */
export interface HealingServiceState {
  /** 疗愈策略匹配 */
  currentStrategy: HealingStrategyMatch | null
  /** 音乐播放 */
  music: MusicPlayerState
  /** 呼吸引导 */
  breath: BreathGuideState
  /** 停车推荐结果 */
  lastParkingSpots: ParkingSpot[]
}

// ==================== 司机性格画像类型（Module 6）====================

/** 性格维度：外向/内向 */
export enum PersonalityDimension {
  EXTROVERT = 'extrovert',   // 外向
  INTROVERT = 'introvert',   // 内向
}

/** 感性/理性维度 */
export enum RationalDimension {
  EMOTIONAL = 'emotional',   // 感性
  RATIONAL = 'rational',     // 理性
}

/** 情绪习惯标签 */
export enum EmotionHabitTag {
  QUICK_TEMPER = 'quick_temper',       // 易激怒
  ANXIETY_PRONE = 'anxiety_prone',     // 易焦虑
  FATIGUE_PRONE = 'fatigue_prone',     // 易疲劳
  TRAFFIC_SENSITIVE = 'traffic_sensitive', // 路况敏感
}

/** 交互风格偏好 */
export enum InteractionStyle {
  CHATTY = 'chatty',           // 爱闲聊
  SILENT = 'silent',           // 沉默倾听型
  MIXED = 'mixed',             // 均衡型
}

/** 情绪触发场景偏好（统计各类场景触发频次） */
export interface ScenarioTriggerStats {
  traffic_jam: number      // 拥堵触发次数
  highway: number          // 高速触发次数
  city: number             // 市区触发次数
  idle: number             // 怠速触发次数
  night: number            // 夜间触发次数
  general: number          // 通用场景
}

/** 情绪类型统计 */
export interface EmotionTypeStats {
  anger: number             // 愤怒次数
  anxiety: number           // 焦虑次数
  irritability: number      // 烦躁次数
  fatigue: number           // 疲劳次数
  calm: number              // 平稳次数
  total: number             // 总次数
}

/** 驾驶时段偏好 */
export interface DrivingTimePreference {
  morningRush: number       // 早高峰(7-9)次数
  eveningRush: number       // 晚高峰(17-19)次数
  nightDrive: number        // 夜间(22-6)次数
  normal: number            // 其他时段
}

/** 画像稳定性等级 */
export enum ProfileStability {
  NEW = 'new',               // 新用户（<5次交互）
  FORMING = 'forming',       // 形成中（5-15次）
  STABLE = 'stable',         // 已稳定（>15次）
}

/** 完整司机画像（M6增强版，向下兼容M4的DriverProfile） */
export interface EnhancedDriverProfile extends DriverProfile {
  // ===== M6 新增字段 =====

  /** 性格维度：外向/内向（-1内向 ~ +1外向） */
  extroversion: number
  /** 感性/理性维度（-1理性 ~ +1感性） */
  emotionalness: number
  /** 画像稳定性 */
  stability: ProfileStability
  /** 情绪习惯标签 */
  emotionHabits: EmotionHabitTag[]
  /** 交互风格偏好 */
  interactionStyle: InteractionStyle
  /** 情绪类型统计 */
  emotionStats: EmotionTypeStats
  /** 场景触发统计 */
  scenarioStats: ScenarioTriggerStats
  /** 驾驶时段偏好 */
  timePreference: DrivingTimePreference
  /** 平均倾诉文本长度（用于判断性格外向度） */
  avgUtteranceLength: number
  /** 连续对话平均轮次 */
  avgTurnCount: number
}

/** 画像引擎回调 */
export interface ProfileEngineCallbacks {
  /** 画像更新完成 */
  onProfileUpdate?: (profile: EnhancedDriverProfile) => void
}

/** 个性化话术风格配置 */
export interface PersonalizedStyle {
  /** 语气描述 */
  tone: string
  /** 共情程度 (0-1) */
  empathyLevel: number
  /** 话术详细程度 (0-1, 越高话术越长) */
  verbosity: number
  /** 是否偏闲聊式 */
  chattyStyle: boolean
  /** 是否偏安静陪伴式 */
  quietStyle: boolean
}

// ==================== 本地数据存储&隐私类型（Module 7）====================

/** 数据存储分类 */
export enum DataCategory {
  EMOTION_EVENT = 'emotion_event',       // 情绪事件
  SESSION_LOG = 'session_log',           // 交互日志
  DRIVER_PROFILE = 'driver_profile',     // 司机画像
  HEALING_PREFERENCE = 'healing_preference', // 疗愈偏好
}

/** 数据过滤结果 */
export interface FilteredData {
  category: DataCategory
  data: Record<string, unknown>
  timestamp: number
}

/** 会话日志条目（脱敏后） */
export interface SessionLogEntry {
  id: string
  sessionId: string
  startedAt: number
  endedAt: number
  turnCount: number
  emotionDetected: EmotionType | null
  emotionIntensity: EmotionIntensity | null
  scenario: DrivingScenario
  /** 使用的疗愈策略 */
  strategiesUsed: string[]
}

/** 疗愈偏好记录 */
export interface HealingPreference {
  /** 常用指令频率 */
  commandFrequency: Record<string, number>
  /** 偏好疗愈方式排名 */
  preferredStrategies: string[]
  /** 音乐使用次数 */
  musicUsageCount: number
  /** 呼吸引导使用次数 */
  breathUsageCount: number
  /** 最后更新时间 */
  lastUpdated: number
}

/** 数据存储状态 */
export interface DataStoreState {
  /** 存储是否就绪 */
  isReady: boolean
  /** 总存储条目数 */
  totalEntries: number
  /** 情绪事件数 */
  emotionEventCount: number
  /** 会话日志数 */
  sessionLogCount: number
  /** 上次写入时间 */
  lastWriteTime: number | null
  /** 上次清空时间 */
  lastClearTime: number | null
  /** 写入队列长度 */
  writeQueueLength: number
}

/** 数据清空确认状态 */
export enum ClearConfirmState {
  IDLE = 'idle',
  PENDING = 'pending',     // 等待用户确认
  CONFIRMED = 'confirmed', // 已确认
  CANCELLED = 'cancelled', // 已取消
}

// ==================== 车企个性化配置类型（Module 8）====================

/** 疗愈话术风格（车企可选） */
export enum OEMHealingStyle {
  GENTLE = 'gentle',       // 温柔治愈风
  CALM = 'calm',           // 沉稳理性风
}

/** TTS音色预设（车企可选） */
export enum OEMTTSVoice {
  DEFAULT_FEMALE = 'default_female',   // 默认治愈女声
  WARM_MALE = 'warm_male',             // 温暖男声
  SOFT_FEMALE = 'soft_female',         // 柔和女声
  CALM_MALE = 'calm_male',             // 沉稳男声
}

/** 车企个性化配置（全部出厂固化，用户不可修改） */
export interface OEMConfigData {
  /** 品牌名 */
  brandName: string
  /** 品牌开场问候语（唤醒后首次问候） */
  greetingPhrase: string
  /** 2D虚拟形象主题ID（车企可替换资源包） */
  avatarThemeId: string
  /** TTS疗愈音色 */
  ttsVoice: OEMTTSVoice
  /** 无交互超时时长 (ms)，15s/30s/60s */
  autoExitTimeout: number
  /** 疗愈话术风格 */
  healingStyle: OEMHealingStyle
  /** 唤醒词 */
  wakeWord: string
  /** 品牌slogan（就绪页副标题） */
  brandTagline: string
}

/** OEMConfig 加载状态 */
export interface OEMConfigState {
  /** 配置是否已加载 */
  isLoaded: boolean
  /** 是否使用车企配置（false = 使用Demo默认） */
  isOEM: boolean
  /** 当前生效配置 */
  config: OEMConfigData
  /** 加载来源说明 */
  loadSource: string
}

// ==================== 全局交互&异常处理类型（Module 9）====================

/** 异常严重等级 */
export enum ErrorSeverity {
  /** 静默降级，不影响功能 */
  LOW = 'low',
  /** 功能受限，自动降级运行 */
  MEDIUM = 'medium',
  /** 关键功能不可用 */
  HIGH = 'high',
}

/** 异常来源模块 */
export type ErrorSource =
  | 'asr' | 'tts' | 'audio' | 'emotion'
  | 'healing' | 'music' | 'breath' | 'parking'
  | 'profile' | 'datastore' | 'oem' | 'lifecycle'
  | 'avatar' | 'interaction' | 'global'
  | 'llm'

/** 单条异常记录 */
export interface ErrorLogEntry {
  /** 唯一ID */
  id: string
  /** 发生时间 */
  timestamp: number
  /** 严重等级 */
  severity: ErrorSeverity
  /** 来源模块 */
  source: ErrorSource
  /** 错误摘要 */
  message: string
  /** 是否已自动降级 */
  degraded: boolean
  /** 降级策略描述 */
  degradation: string
}

/** 降级策略描述 */
export interface DegradationAction {
  /** 策略名称 */
  strategy: string
  /** 影响的模块 */
  affectedModules: ErrorSource[]
  /** 策略描述 */
  description: string
  /** 触发时间 */
  triggeredAt: number
}

/** 全局异常处理状态（Module 9） */
export interface GlobalErrorState {
  /** 异常日志（最近50条） */
  errorLogs: ErrorLogEntry[]
  /** 已执行的降级策略 */
  degradationActions: DegradationAction[]
  /** 各模块降级标记 */
  degradedModules: Record<ErrorSource, boolean>
  /** 错误统计 */
  stats: {
    total: number
    bySeverity: Record<ErrorSeverity, number>
    bySource: Partial<Record<ErrorSource, number>>
  }
}

/** 音频优先级事件类型 */
export enum AudioChannelEvent {
  /** 通道被高优先级源占用 */
  OCCUPIED = 'occupied',
  /** 通道释放 */
  RELEASED = 'released',
}

/** 音频通道状态 */
export interface AudioChannelState {
  /** 是否被占用 */
  isBusy: boolean
  /** 占用来源 */
  busySource: string | null
  /** 占用优先级（0=最高） */
  busyPriority: AudioPriority | null
}

// ==================== 大模型调度类型（Module 10）====================

/** 模型提供商标识 */
export enum LLMProvider {
  OLLAMA = 'ollama',
  OPENAI = 'openai',
  DEEPSEEK = 'deepseek',
  DOUBAO = 'doubao',
  QWEN = 'qwen',
  MOONSHOT = 'moonshot',
  ANTHROPIC = 'anthropic',
}

/** 模型状态 */
export enum LLMModelStatus {
  /** 可用 */
  AVAILABLE = 'available',
  /** 本地模型加载中 */
  LOADING = 'loading',
  /** 使用中 */
  ACTIVE = 'active',
  /** 不可用（无API Key / 服务未就绪） */
  UNAVAILABLE = 'unavailable',
  /** 模型切换中 */
  SWITCHING = 'switching',
}

/** 模型信息 */
export interface LLMModelInfo {
  /** 模型唯一ID（如 gpt-4o、deepseek-chat） */
  id: string
  /** 显示名称 */
  name: string
  /** 提供商 */
  provider: LLMProvider
  /** 是否为本地模型 */
  isLocal: boolean
  /** 模型状态 */
  status: LLMModelStatus
  /** 简要描述 */
  description: string
  /** API Key环境变量名（本地模型为空） */
  envKey: string
  /** 参数量描述（如 7B、175B） */
  paramSize?: string
}

/** 统一对话消息（OpenAI格式兼容） */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** 统一对话入参 */
export interface LLMChatRequest {
  /** 模型ID */
  model: string
  /** 对话上下文 */
  messages: LLMMessage[]
  /** 温度参数 (0-1, 默认0.7) */
  temperature?: number
  /** 最大生成token数 */
  maxTokens?: number
}

/** 统一对话出参 */
export interface LLMChatResponse {
  /** 状态码 */
  code: number
  /** 生成的回复文本 */
  content: string
  /** 实际使用的模型 */
  model: string
  /** 是否为本地模型 */
  isLocal: boolean
  /** 耗时ms */
  elapsedMs: number
  /** 错误信息（失败时） */
  error?: string
}

/** 模型切换状态 */
export interface LLMModelState {
  /** 当前使用的模型ID */
  currentModelId: string
  /** 当前模型状态 */
  currentStatus: LLMModelStatus
  /** 所有可用模型列表 */
  models: LLMModelInfo[]
  /** Ollama服务是否可用 */
  ollamaReady: boolean
  /** 各API Key配置状态（是否已填） */
  apiKeysConfigured: Record<string, boolean>
  /** 最近一次请求耗时 */
  lastRequestMs: number | null
  /** 最近一次请求时间 */
  lastRequestTime: number | null
}

// ==================== 疗愈策略&提示词工程类型（Module 11）====================

/** 驾驶情景信息 */
export interface DrivingScenarioInfo {
  /** 情景ID（对应 DrivingScenario 枚举值） */
  id: string
  /** 情景名称（如：早高峰拥堵、夜间长途） */
  name: string
  /** 情景描述 */
  description: string
  /** 是否启用 */
  enabled: boolean
}

/** Few-shot 示例对话 */
export interface FewShotExample {
  /** 用户输入 */
  user: string
  /** 助手回复 */
  assistant: string
}

/** 策略规则定义 */
export interface StrategyRule {
  /** 策略唯一ID（如 anger_traffic_jam） */
  id: string
  /** 情景ID（对应 DrivingScenario） */
  scenarioId: string
  /** 情绪类型 */
  emotionType: EmotionType
  /** 策略专属系统提示词 */
  systemPrompt: string
  /** 策略专属 Few-shot 示例 */
  fewShots: FewShotExample[]
  /** 性格适配标签（该策略偏好什么性格的用户） */
  personalityTags?: string[]
  /** 是否启用 */
  enabled: boolean
  /** 策略描述 */
  description: string
}

/** 策略引擎匹配结果 */
export interface StrategyEngineResult {
  /** 匹配到的策略规则ID */
  ruleId: string
  /** 匹配到的情景ID */
  scenarioId: string
  /** 匹配到的情绪类型 */
  emotionType: EmotionType
  /** 最终生成的系统提示词 */
  systemPrompt: string
  /** 最终注入的 Few-shot 示例 */
  fewShots: FewShotExample[]
  /** 匹配原因说明 */
  matchReason: string
  /** 是否使用了降级兜底 */
  isFallback: boolean
  /** 提示词变量快照（已注入的变量值） */
  injectedVars: Record<string, string>
}

/** 提示词构建上下文（PromptManager 输入） */
export interface PromptBuildContext {
  /** 当前情绪结果 */
  emotionResult: EmotionResult | null
  /** 当前驾驶情景 */
  scenario: DrivingScenario
  /** 增强画像 */
  enhancedProfile: EnhancedDriverProfile | null
  /** 个性化风格 */
  personalizedStyle: PersonalizedStyle | null
  /** 车企话术风格 */
  oemStyle: OEMHealingStyle
  /** 对话历史（最近N轮） */
  conversationHistory: LLMMessage[]
  /** 当前时间（用于时间感知提示） */
  currentTime: Date
  /** 是否为车企模式 */
  isOEM: boolean
}

/** 策略引擎状态（供 Store 使用） */
export interface StrategyEngineState {
  /** 是否已初始化 */
  isReady: boolean
  /** 当前匹配的策略ID */
  currentRuleId: string | null
  /** 当前驾驶情景 */
  currentScenario: string
  /** 已注册的情景数量 */
  scenarioCount: number
  /** 已注册的策略规则数量 */
  ruleCount: number
  /** 最近一次匹配耗时(ms) */
  lastMatchMs: number | null
  /** 最近一次匹配结果摘要 */
  lastMatchReason: string | null
  /** 缓存命中次数 */
  cacheHitCount: number
  /** 总匹配次数 */
  totalMatchCount: number
}

// ==================== Agent上下文记忆&对话管理类型（Module 12）====================

/** 上下文统计信息 */
export interface ContextStats {
  /** 会话ID */
  sessionId: string | null
  /** 消息总数 */
  messageCount: number
  /** 对话轮次（user+assistant算一轮） */
  turnCount: number
  /** 总字符数 */
  totalChars: number
  /** 是否已压缩 */
  hasCompressed: boolean
  /** 压缩摘要 */
  compressedSummary: string | null
  /** 轮次阈值 */
  maxTurns: number
  /** 字符阈值 */
  maxChars: number
  /** 是否已超过阈值 */
  isExceeded: boolean
}

/** ContextManager状态（供 Store 使用） */
export interface ContextManagerState {
  /** 是否有活跃会话 */
  isReady: boolean
  /** 当前会话ID */
  sessionId: string | null
  /** 消息总数 */
  messageCount: number
  /** 对话轮次 */
  turnCount: number
  /** 总字符数 */
  totalChars: number
  /** 是否已压缩 */
  hasCompressed: boolean
  /** 最近一次压缩时间 */
  lastCompressTime: number | null
}

// ==================== 应用全局状态 ====================

export interface AppState {
  /** 当前初始化阶段 */
  initPhase: InitPhase
  /** 当前运行模式 */
  runMode: RunMode
  /** 是否已完全就绪 */
  isReady: boolean
  /** 权限状态列表 */
  permissions: PermissionState[]
  /** 资源加载状态 */
  resourceState: ResourceLoadState
  /** 唤醒监听状态 */
  wakeStatus: WakeStatus
  /** 错误信息 */
  error: string | null
  /** 启动时间戳 */
  startTime: number | null
}
