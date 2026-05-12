/**
 * 应用全局状态管理
 * 管理初始化流程 + Module 2面板/形象/超时状态
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  InitPhase, 
  RunMode, 
  PermissionState, 
  ResourceLoadState, 
  WakeStatus,
  AppState,
  // Module 2 类型
  AvatarState,
  PanelVisibility,
  AutoExitStatus,
  // Module 3 类型
  ASRStatus,
  TTSStatus,
  ConversationPhase,
  DialogueMessage,
  ConversationSession,
  VoiceInteractionState,
  // Module 4 类型
  EmotionType,
  EmotionIntensity,
  DrivingScenario,
  EmotionResult,
  DriverProfile,
  EmotionRecord,
  // Module 5 类型
  HealingServiceState,
  MusicPlayerState,
  BreathGuideState,
  ParkingSpot,
  HealingStrategyMatch,
  // Module 6 类型
  EnhancedDriverProfile,
  PersonalizedStyle,
  // Module 7 类型
  DataStoreState,
  ClearConfirmState,
  // Module 8 类型
  OEMConfigState,
  OEMConfigData,
  // Module 9 类型
  GlobalErrorState,
  AudioChannelState,
} from '@/types'

export const useAppStore = defineStore('app', () => {
  // ==================== Module 1: 基础状态 ====================
  
  const initPhase = ref<InitPhase>(InitPhase.IDLE)
  const runMode = ref<RunMode>(RunMode.FULL)
  const isReady = ref(false)
  const permissions = ref<PermissionState[]>([])
  const resourceState = ref<ResourceLoadState>({
    avatarResources: false,
    audioConfig: false,
    fallbackPhrases: false,
    modelConfig: false,
  })
  const wakeStatus = ref<WakeStatus>(WakeStatus.INACTIVE)
  const error = ref<string | null>(null)
  const startTime = ref<number | null>(null)

  // ==================== Module 2: 面板 & 形象状态 ====================
  
  /** 面板可见性 */
  const panelVisibility = ref<PanelVisibility>(PanelVisibility.HIDDEN)
  
  /** 虚拟形象动画状态 */
  const avatarAnimState = ref<AvatarState>(AvatarState.HIDDEN)
  
  /** 自动退出计时器状态 */
  const autoExitStatus = ref<AutoExitStatus>(AutoExitStatus.IDLE)
  
  /** 最后交互时间戳 */
  const lastInteractionTime = ref<number | null>(null)
  
  /** 是否显示底部状态文字 */
  const showPanelStatusText = ref(true)
  
  /** 状态文字内容 */
  const panelStatusText = ref('')
  
  /** 是否显示"我在听"提示语 */
  const showHintText = ref(true)
  
  /** 当前是否正在交互（用于暂停自动退出计时） */
  const isInteracting = ref(false)

  // ==================== Module 3: 语音交互状态 ====================
  
  /** ASR识别状态 */
  const asrStatus = ref<ASRStatus>(ASRStatus.IDLE)
  
  /** TTS合成状态 */
  const ttsStatus = ref<TTSStatus>(TTSStatus.IDLE)
  
  /** 对话阶段 */
  const conversationPhase = ref<ConversationPhase>(ConversationPhase.IDLE)
  
  /** 当前会话数据 */
  const currentSession = ref<ConversationSession | null>(null)
  
  /** 最后ASR结果（实时显示用） */
  const lastAsrText = ref('')
  
  /** 当前正在显示的Agent回复文本（面板展示） */
  const agentResponseText = ref('')
  
  /** 用户语音输入的中间结果（实时打字效果） */
  const userInterimText = ref('')
  
  /** 音频通道是否被占用 */
  const audioChannelBusy = ref(false)

  // ==================== Module 4: 情绪识别状态 ====================
  
  /** 最新情绪识别结果 */
  const emotionResult = ref<EmotionResult | null>(null)
  
  /** 是否正在执行情绪识别 */
  const isRecognizing = ref(false)
  
  /** 司机性格画像 */
  const driverProfile = ref<DriverProfile | null>(null)
  
  /** 历史情绪记录 */
  const emotionHistory = ref<EmotionRecord[]>([])

  // ==================== Module 5: 核心疗愈服务状态 ====================

  /** 疗愈服务完整状态 */
  const healingServiceState = ref<HealingServiceState>({
    currentStrategy: null,
    music: { status: 'stopped', currentTrack: null, volume: 0.3, trackIndex: 0 },
    breath: { phase: 'idle', currentCycle: 0, totalCycles: 3, elapsedSeconds: 0 },
    lastParkingSpots: [],
  })

  // ==================== Module 6: 增强画像状态 ====================

  /** 增强司机画像 */
  const enhancedProfile = ref<EnhancedDriverProfile | null>(null)

  /** 当前个性化话术风格 */
  const personalizedStyle = ref<PersonalizedStyle | null>(null)

  // ==================== Module 7: 数据存储状态 ====================

  /** 数据存储管理状态 */
  const dataStoreState = ref<DataStoreState>({
    isReady: false,
    totalEntries: 0,
    emotionEventCount: 0,
    sessionLogCount: 0,
    lastWriteTime: null,
    lastClearTime: null,
    writeQueueLength: 0,
  })

  /** 数据清空确认状态 */
  const clearConfirmState = ref<ClearConfirmState>(ClearConfirmState.IDLE)

  // ==================== Module 8: 车企配置状态 ====================

  /** 车企个性化配置状态 */
  const oemConfigState = ref<OEMConfigState>({
    isLoaded: false,
    isOEM: false,
    config: {
      brandName: 'Healing Drive',
      greetingPhrase: '',
      avatarThemeId: 'healing_gentle_default',
      ttsVoice: 'default_female' as any,
      autoExitTimeout: 30_000,
      healingStyle: 'gentle' as any,
      wakeWord: '小疗同学',
      brandTagline: 'Healing Drive · 智能座舱疗愈陪伴',
    },
    loadSource: 'demo-default',
  })

  // ==================== Module 1 Actions ====================

  function setInitPhase(phase: InitPhase) {
    initPhase.value = phase
  }

  function setRunMode(mode: RunMode) {
    runMode.value = mode
  }

  function setReady(ready: boolean) {
    isReady.value = ready
  }

  function setPermissions(states: PermissionState[]) {
    permissions.value = states
  }
  
  function setPermissionStates(states: PermissionState[]) {
    permissions.value = states
  }

  function setResourceState(state: ResourceLoadState) {
    resourceState.value = state
  }

  function setWakeStatus(status: WakeStatus) {
    wakeStatus.value = status
  }

  function setError(err: string | null) {
    error.value = err
  }

  function setStartTime(time: number) {
    startTime.value = time
  }

  // ==================== Module 2 Actions：面板控制 ====================

  /**
   * 显示面板（唤醒时调用）
   */
  function showPanel() {
    console.log('[AppStore] 显示疗愈面板')
    panelVisibility.value = PanelVisibility.ENTERING
    avatarAnimState.value = AvatarState.IDLE
    showHintText.value = true
    isInteracting.value = false
  }

  /**
   * 面板进入动画完成回调
   */
  function onPanelEnterComplete() {
    if (panelVisibility.value === PanelVisibility.ENTERING) {
      panelVisibility.value = PanelVisibility.VISIBLE
      console.log('[AppStore] 面板进入完成')
    }
  }

  /**
   * 隐藏面板（退出时调用）
   */
  function hidePanel() {
    console.log('[AppStore] 隐藏疗愈面板')
    if (panelVisibility.value !== PanelVisibility.HIDDEN) {
      panelVisibility.value = PanelVisibility.EXITING
    }
  }

  /**
   * 面板退出动画完成回调
   */
  function onPanelLeaveComplete() {
    if (panelVisibility.value === PanelVisibility.EXITING) {
      panelVisibility.value = PanelVisibility.HIDDEN
      avatarAnimState.value = AvatarState.HIDDEN
      resetPanelInteraction()
      console.log('[AppStore] 面板已完全隐藏')
    }
  }

  /**
   * 检查面板是否可见（含动画中）
   */
  function isPanelVisible(): boolean {
    return panelVisibility.value !== PanelVisibility.HIDDEN
  }

  // ==================== Module 2 Actions：形象状态 ====================

  /**
   * 切换形象到指定状态
   */
  function setAvatarState(state: AvatarState) {
    const prev = avatarAnimState.value
    avatarAnimState.value = state
    
    // 根据状态更新文字提示
    updateStatusForState(state)
    
    console.log(`[AppStore] 形象状态: ${prev} -> ${state}`)
  }

  /** 进入倾听态 */
  function startListening() {
    setAvatarState(AvatarState.LISTENING)
    setInteracting(true)  // 对话开始，暂停自动退出
    recordInteraction()
  }

  /** 进入说话态 */
  function startSpeaking(text?: string) {
    setAvatarState(AvatarState.SPEAKING)
    if (text) {
      panelStatusText.value = text
      showPanelStatusText.value = true
    }
    setInteracting(true)
    recordInteraction()
  }

  /** 进入疗愈态 */
  function startHealing() {
    setAvatarState(AvatarState.HEALING)
    setInteracting(true)
    recordInteraction()
  }

  /** 回到待机态 */
  function backToIdle() {
    setAvatarState(AvatarState.IDLE)
    setInteracting(false)  // 对话暂停，恢复自动退出计时
    showHintText.value = true
    recordInteraction()
  }

  // ==================== Module 2 Actions：自动退出管理 ====================

  /**
   * 记录一次用户交互（重置自动退出计时）
   */
  function recordInteraction() {
    lastInteractionTime.value = Date.now()
    autoExitStatus.value = AutoExitStatus.COUNTING
  }

  /**
   * 设置是否正在交互（影响自动退出计时）
   */
  function setInteracting(active: boolean) {
    isInteracting.value = active
    if (active) {
      autoExitStatus.value = AutoExitStatus.PAUSED
    } else {
      autoExitStatus.value = AutoExitStatus.COUNTING
      lastInteractionTime.value = Date.now()
    }
  }

  /**
   * 更新自动退出状态
   */
  function setAutoExitStatus(status: AutoExitStatus) {
    autoExitStatus.value = status
  }

  /**
   * 触发自动退出流程
   */
  function triggerAutoExit() {
    autoExitStatus.value = AutoExitStatus.EXPIRED
    hidePanel()
  }

  /**
   * 重置面板所有交互状态
   */
  function resetPanelInteraction() {
    isInteracting.value = false
    showPanelStatusText.value = true
    panelStatusText.value = ''
    showHintText.value = true
    lastInteractionTime.value = null
    autoExitStatus.value = AutoExitStatus.IDLE
  }

  // ==================== 内部工具方法 ====================

  /**
   * 根据形象状态更新状态文字
   */
  function updateStatusForState(state: AvatarState) {
    switch (state) {
      case AvatarState.IDLE:
        panelStatusText.value = ''
        showPanelStatusText.value = false
        showHintText.value = true
        break
      case AvatarState.LISTENING:
        panelStatusText.value = '聆听中...'
        showPanelStatusText.value = true
        showHintText.value = false
        break
      case AvatarState.SPEAKING:
        // 文字由外部传入，此处不覆盖
        showHintText.value = false
        break
      case AvatarState.HEALING:
        panelStatusText.value = '正在疗愈'
        showPanelStatusText.value = true
        showHintText.value = false
        break
      default:
        showPanelStatusText.value = false
        showHintText.value = state === AvatarState.IDLE
    }
  }

  // ==================== Module 3 Actions：语音交互状态 ====================

  /** 更新ASR状态 */
  function setAsrStatus(status: ASRStatus) {
    asrStatus.value = status
  }

  /** 更新TTS状态 */
  function setTtsStatus(status: TTSStatus) {
    ttsStatus.value = status
  }

  /** 更新对话阶段 */
  function setConversationPhase(phase: ConversationPhase) {
    conversationPhase.value = phase
  }

  /** 设置当前会话 */
  function setCurrentSession(session: ConversationSession | null) {
    currentSession.value = session
  }

  /** 设置最后ASR文本（中间结果实时显示） */
  function setLastAsrText(text: string) {
    lastAsrText.value = text
  }

  /** 设置Agent回复文本 */
  function setAgentResponseText(text: string) {
    agentResponseText.value = text
  }

  /** 设置用户输入中间结果 */
  function setUserInterimText(text: string) {
    userInterimText.value = text
  }

  /** 设置音频通道占用 */
  function setAudioChannelBusy(busy: boolean) {
    audioChannelBusy.value = busy
  }

  /** 获取完整语音交互状态快照 */
  function getVoiceInteractionState(): VoiceInteractionState {
    return {
      asrStatus: asrStatus.value,
      ttsStatus: ttsStatus.value,
      conversationPhase: conversationPhase.value,
      currentSession: currentSession.value,
      lastAsrResult: lastAsrText.value ? { text: lastAsrText.value, isFinal: true, confidence: 1, timestamp: Date.now() } : null,
      audioChannelBusy: audioChannelBusy.value,
      busyPriority: null,
    }
  }

  // ==================== Module 4 Actions：情绪识别 ====================

  /** 设置情绪识别结果 */
  function setEmotionResult(result: EmotionResult | null) {
    emotionResult.value = result
  }

  /** 设置识别进行中状态 */
  function setRecognizing(recognizing: boolean) {
    isRecognizing.value = recognizing
  }

  /** 更新司机画像 */
  function setDriverProfile(profile: DriverProfile) {
    driverProfile.value = profile
  }

  /** 更新情绪历史记录 */
  function setEmotionHistory(history: EmotionRecord[]) {
    emotionHistory.value = history
  }

  /**
   * 根据情绪结果自动切换形象状态
   * 愤怒→疗愈态 / 焦虑→倾听态 / 其他→待机态
   */
  function applyEmotionToAvatar(emotionType: EmotionType): void {
    switch (emotionType) {
      case EmotionType.ANGER:
        startHealing()
        break
      case EmotionType.ANXIETY:
      case EmotionType.IRRITABILITY:
        startListening()
        break
      case EmotionType.FATIGUE:
        startHealing()  // 疲劳也用疗愈动效（柔和光效安抚）
        break
      default:
        backToIdle()
        break
    }
  }

  // ==================== Module 5 Actions：核心疗愈服务 ====================

  /** 更新疗愈服务状态 */
  function setHealingServiceState(state: HealingServiceState) {
    healingServiceState.value = state
  }

  // ==================== Module 6 Actions：增强画像 ====================

  /** 更新增强画像 */
  function setEnhancedProfile(profile: EnhancedDriverProfile) {
    enhancedProfile.value = profile
    // 同步更新 M4 兼容的 driverProfile
    setDriverProfile({
      angerFrequency: profile.angerFrequency,
      personalityTags: profile.personalityTags,
      totalInteractions: profile.totalInteractions,
      lastUpdated: profile.lastUpdated,
      emotionHistory: profile.emotionHistory,
    })
    setEmotionHistory(profile.emotionHistory)
  }

  /** 更新个性化风格 */
  function setPersonalizedStyle(style: PersonalizedStyle) {
    personalizedStyle.value = style
  }

  // ==================== Module 7 Actions：数据存储 ====================

  /** 更新数据存储状态 */
  function setDataStoreState(state: DataStoreState) {
    dataStoreState.value = state
  }

  /** 设置清空确认状态 */
  function setClearConfirmState(state: ClearConfirmState) {
    clearConfirmState.value = state
  }

  // ==================== Module 8 Actions：车企配置 ====================

  /** 更新车企配置状态 */
  function setOEMConfigState(state: OEMConfigState) {
    oemConfigState.value = state
  }

  // ==================== Module 9 Actions：全局异常&音频通道 ====================

  /** 全局异常处理状态 */
  const globalErrorState = ref<GlobalErrorState>({
    errorLogs: [],
    degradationActions: [],
    degradedModules: {} as any,
    stats: { total: 0, bySeverity: { low: 0, medium: 0, high: 0 }, bySource: {} },
  })

  /** 音频通道状态 */
  const audioChannelState = ref<AudioChannelState>({
    isBusy: false,
    busySource: null,
    busyPriority: null,
  })

  function setGlobalErrorState(state: GlobalErrorState) {
    globalErrorState.value = state
  }

  function setAudioChannelState(state: AudioChannelState) {
    audioChannelState.value = state
    audioChannelBusy.value = state.isBusy
    busyPriority.value = state.busyPriority
  }

  // ==================== Getters ====================

  const isFullMode = (): boolean => runMode.value === RunMode.FULL
  
  const hasCameraSupport = (): boolean => 
    runMode.value !== RunMode.NO_CAMERA && runMode.value !== RunMode.VOICE_ONLY && runMode.value !== RunMode.MINIMAL

  const hasMapSupport = (): boolean =>
    runMode.value === RunMode.FULL || runMode.value === RunMode.NO_CAMERA

  const canInteract = (): boolean => 
    isReady.value && runMode.value !== RunMode.MINIMAL

  /** 面板当前是否完全可见（非动画中）*/
  const isPanelFullyVisible = computed(() => 
    panelVisibility.value === PanelVisibility.VISIBLE
  )

  /** 获取初始化进度描述 */
  function getPhaseDescription(): string {
    switch (initPhase.value) {
      case InitPhase.IDLE:
        return '待启动'
      case InitPhase.STARTING:
        return '正在启动...'
      case InitPhase.PERMISSION_CHECK:
        return '正在校验权限...'
      case InitPhase.RESOURCE_LOADING:
        return '正在加载资源...'
      case InitPhase.WAKE_LISTENING:
        return '已就绪，等待唤醒'
      case InitPhase.DEGRADED:
        return '降级运行中'
      case InitPhase.ERROR:
        return `错误: ${error.value}`
      default:
        return '未知状态'
    }
  }

  return {
    // ===== Module 1 State =====
    initPhase,
    runMode,
    isReady,
    permissions,
    resourceState,
    wakeStatus,
    error,
    startTime,
    
    // ===== Module 2 State =====
    panelVisibility,
    avatarAnimState,
    autoExitStatus,
    lastInteractionTime,
    showPanelStatusText,
    panelStatusText,
    showHintText,
    isInteracting,

    // ===== Module 3 State =====
    asrStatus,
    ttsStatus,
    conversationPhase,
    currentSession,
    lastAsrText,
    agentResponseText,
    userInterimText,
    audioChannelBusy,

    // ===== Module 4 State: 情绪识别 =====
    emotionResult,
    isRecognizing,
    driverProfile,
    emotionHistory,

    // ===== Module 5 State: 核心疗愈服务 =====
    healingServiceState,

    // ===== Module 6 State: 增强画像 =====
    enhancedProfile,
    personalizedStyle,

    // ===== Module 7 State: 数据存储 =====
    dataStoreState,
    clearConfirmState,

    // ===== Module 8 State: 车企配置 =====
    oemConfigState,

    // ===== Module 9 State: 全局异常&音频通道 =====
    globalErrorState,
    audioChannelState,

    // ===== Module 1 Actions =====
    setInitPhase,
    setRunMode,
    setReady,
    setPermissions,
    setPermissionStates,
    setResourceState,
    setWakeStatus,
    setError,
    setStartTime,

    // ===== Module 2 Actions: 面板 =====
    showPanel,
    onPanelEnterComplete,
    hidePanel,
    onPanelLeaveComplete,
    isPanelVisible,

    // ===== Module 2 Actions: 形象 =====
    setAvatarState,
    startListening,
    startSpeaking,
    startHealing,
    backToIdle,

    // ===== Module 2 Actions: 自动退出 =====
    recordInteraction,
    setInteracting,
    setAutoExitStatus,
    triggerAutoExit,
    resetPanelInteraction,

    // ===== Module 3 Actions: 语音交互 =====
    setAsrStatus,
    setTtsStatus,
    setConversationPhase,
    setCurrentSession,
    setLastAsrText,
    setAgentResponseText,
    setUserInterimText,
    setAudioChannelBusy,
    getVoiceInteractionState,

    // ===== Module 4 Actions: 情绪识别 =====
    setEmotionResult,
    setRecognizing,
    setDriverProfile,
    setEmotionHistory,
    applyEmotionToAvatar,

    // ===== Module 5 Actions: 核心疗愈服务 =====
    setHealingServiceState,

    // ===== Module 6 Actions: 增强画像 =====
    setEnhancedProfile,
    setPersonalizedStyle,

    // ===== Module 7 Actions: 数据存储 =====
    setDataStoreState,
    setClearConfirmState,

    // ===== Module 8 Actions: 车企配置 =====
    setOEMConfigState,

    // ===== Module 9 Actions =====
    setGlobalErrorState,
    setAudioChannelState,

    // ===== Getters =====
    isFullMode,
    hasCameraSupport,
    hasMapSupport,
    canInteract,
    isPanelFullyVisible,
    getPhaseDescription,
  }
})
