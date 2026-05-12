/**
 * Module 7: 本地数据存储&隐私管理服务
 *
 * 核心规则：
 *   - 全部数据仅本地存储，不上云、不上报
 *   - 轻量加密存储（XOR + Base64）
 *   - 数据最小化：不存原始音视频、面部图像、心率原始值、地理位置
 *   - 会话结束后台静默写入
 *   - 串行写入队列避免并发冲突
 *   - 语音指令"清除我的情绪记录" + 二次确认
 *   - 清空部分失败则整体回滚
 */
import {
  DataCategory, FilteredData, SessionLogEntry, HealingPreference,
  DataStoreState, ClearConfirmState,
  EmotionType, EmotionIntensity, DrivingScenario,
  EmotionResult, ConversationSession,
} from '@/types'

// ==================== 存储键 ====================

const STORAGE_PREFIX = 'healing_agent_'
const KEY_ENCRYPTED = STORAGE_PREFIX + 'data_vault'
const KEY_SESSION_LOGS = STORAGE_PREFIX + 'session_logs'
const KEY_HEALING_PREF = STORAGE_PREFIX + 'healing_preference'
const KEY_PROFILE = STORAGE_PREFIX + 'enhanced_profile'
const KEY_DATA_STATE = STORAGE_PREFIX + 'data_store_state'

// ==================== 加密工具 ====================

const ENCRYPTION_KEY = 'HealingDrive_2026_Cabin'

/** XOR 加密 → Base64 */
function encrypt(plain: string): string {
  const encoded = encodeURIComponent(plain)
  let result = ''
  for (let i = 0; i < encoded.length; i++) {
    result += String.fromCharCode(
      encoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    )
  }
  return btoa(result)
}

/** Base64 → XOR 解密 */
function decrypt(cipher: string): string {
  try {
    const decoded = atob(cipher)
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      )
    }
    return decodeURIComponent(result)
  } catch {
    console.warn('[DataStore] 解密失败，返回空字符串')
    return ''
  }
}

// ==================== 数据过滤 ====================

/**
 * 从情绪结果中提取可存储的非敏感字段
 * 禁止存储：原始文本、面部特征、心率原始值、地理位置
 */
function filterEmotionEvent(result: EmotionResult): Record<string, unknown> {
  return {
    emotion: result.emotion,
    intensity: result.intensity,
    confidence: result.confidence,
    scenario: result.scenario,
    processingTimeMs: result.processingTimeMs,
    timestamp: result.timestamp,
    // 仅保留加权分数，不保留原始维度特征
    weightedScores: result.weightedScores,
  }
}

/**
 * 从对话会话中提取脱敏日志
 * 禁止存储：用户原始语音文本、ASR中间结果
 */
function filterSessionLog(session: ConversationSession, emotionResult?: EmotionResult | null): SessionLogEntry {
  return {
    id: `slog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sessionId: session.id,
    startedAt: session.startedAt,
    endedAt: Date.now(),
    turnCount: session.turnCount,
    emotionDetected: emotionResult?.emotion ?? null,
    emotionIntensity: emotionResult?.intensity ?? null,
    scenario: emotionResult?.scenario ?? DrivingScenario.GENERAL,
    strategiesUsed: [], // 由外部填充
  }
}

// ==================== 回调 ====================

export interface DataStoreCallbacks {
  onStateChange?: (state: DataStoreState) => void
  onClearPending?: () => void       // 进入等待二次确认
  onClearComplete?: (success: boolean) => void
}

// ==================== DataStore ====================

export class DataStore {
  private writeQueue: Array<() => Promise<void>> = []
  private isProcessingQueue = false
  private callbacks: DataStoreCallbacks = {}
  private clearConfirmState: ClearConfirmState = ClearConfirmState.IDLE
  private clearConfirmTimer: ReturnType<typeof setTimeout> | null = null

  /** 缓存的运行时状态 */
  private state: DataStoreState = {
    isReady: false,
    totalEntries: 0,
    emotionEventCount: 0,
    sessionLogCount: 0,
    lastWriteTime: null,
    lastClearTime: null,
    writeQueueLength: 0,
  }

  // ==================== 公共 API ====================

  /** 初始化：加载本地已有数据 */
  init(): DataStoreState {
    this.loadState()
    this.countEntries()
    this.state.isReady = true
    console.log('[DataStore] ✓ 本地数据存储初始化完成')
    this.notifyStateChange()
    return { ...this.state }
  }

  /** 设置回调 */
  setCallbacks(cbs: DataStoreCallbacks): void {
    this.callbacks = { ...this.callbacks, ...cbs }
  }

  /** 获取当前状态 */
  getState(): DataStoreState {
    return { ...this.state }
  }

  /**
   * 会话结束时调用：异步写入本次会话数据
   * 不阻塞交互流程
   */
  recordSessionEnd(session: ConversationSession, emotionResult?: EmotionResult | null, strategies?: string[]): void {
    if (!this.state.isReady) return

    const log = filterSessionLog(session, emotionResult)
    if (strategies) log.strategiesUsed = strategies

    this.enqueueWrite(async () => {
      this.appendSessionLog(log)
      this.state.lastWriteTime = Date.now()
      this.state.writeQueueLength = this.writeQueue.length
      this.saveState()
      this.notifyStateChange()
    })
  }

  /** 记录一条情绪事件（脱敏后） */
  recordEmotionEvent(result: EmotionResult): void {
    if (!this.state.isReady) return

    const filtered = filterEmotionEvent(result)

    this.enqueueWrite(async () => {
      this.appendToVault({
        category: DataCategory.EMOTION_EVENT,
        data: filtered,
        timestamp: Date.now(),
      })
      this.state.emotionEventCount++
      this.state.lastWriteTime = Date.now()
      this.state.writeQueueLength = this.writeQueue.length
      this.saveState()
      this.notifyStateChange()
    })
  }

  /** 更新疗愈偏好（指令使用频率等） */
  updateHealingPreference(command: string): void {
    this.enqueueWrite(async () => {
      const pref = this.loadHealingPreference()
      pref.commandFrequency[command] = (pref.commandFrequency[command] || 0) + 1
      pref.lastUpdated = Date.now()
      this.saveHealingPreference(pref)
      this.state.lastWriteTime = Date.now()
      this.saveState()
    })
  }

  /** 更新疗愈策略使用记录 */
  recordStrategyUsage(strategy: string): void {
    this.enqueueWrite(async () => {
      const pref = this.loadHealingPreference()
      pref.preferredStrategies.push(strategy)
      // 只保留最近50条记录用于排名
      if (pref.preferredStrategies.length > 50) {
        pref.preferredStrategies = pref.preferredStrategies.slice(-50)
      }
      pref.lastUpdated = Date.now()
      this.saveHealingPreference(pref)
    })
  }

  /**
   * 发起数据清空请求（语音指令触发）
   * 需要二次确认
   */
  requestClear(): { confirmed: boolean; message: string } {
    if (this.clearConfirmState === ClearConfirmState.PENDING) {
      // 已在等待确认，不能重复发起
      return { confirmed: false, message: '已有待确认的清空请求' }
    }

    this.clearConfirmState = ClearConfirmState.PENDING
    this.callbacks.onClearPending?.()

    // 15秒超时自动取消
    this.clearConfirmTimer = setTimeout(() => {
      if (this.clearConfirmState === ClearConfirmState.PENDING) {
        this.clearConfirmState = ClearConfirmState.IDLE
        console.log('[DataStore] 清空请求超时，自动取消')
      }
    }, 15000)

    return { confirmed: false, message: '确认清除吗？请回答"确认"或"取消"' }
  }

  /**
   * 二次确认清空
   * @returns true=已执行清空，false=取消或无效
   */
  confirmClear(userConfirmed: boolean): boolean {
    if (this.clearConfirmState !== ClearConfirmState.PENDING) {
      return false
    }

    if (this.clearConfirmTimer) {
      clearTimeout(this.clearConfirmTimer)
      this.clearConfirmTimer = null
    }

    if (!userConfirmed) {
      this.clearConfirmState = ClearConfirmState.CANCELLED
      this.callbacks.onClearComplete?.(false)
      console.log('[DataStore] 用户取消清空')
      // 恢复IDLE
      setTimeout(() => { this.clearConfirmState = ClearConfirmState.IDLE }, 100)
      return false
    }

    this.clearConfirmState = ClearConfirmState.CONFIRMED
    return this.executeClear()
  }

  /** 获取清空确认状态 */
  getClearConfirmState(): ClearConfirmState {
    return this.clearConfirmState
  }

  /** 获取所有会话日志 */
  getSessionLogs(): SessionLogEntry[] {
    try {
      const raw = localStorage.getItem(KEY_SESSION_LOGS)
      if (!raw) return []
      const decrypted = decrypt(raw)
      return JSON.parse(decrypted) || []
    } catch {
      return []
    }
  }

  /** 获取疗愈偏好 */
  getHealingPreference(): HealingPreference {
    return this.loadHealingPreference()
  }

  /** 导出所有本地数据（调试用） */
  exportData(): Record<string, unknown> {
    return {
      sessionLogs: this.getSessionLogs(),
      healingPreference: this.loadHealingPreference(),
      dataStoreState: this.state,
      storageKeys: this.listAllStorageKeys(),
    }
  }

  /** 获取所有疗愈Agent相关的 localStorage 键 */
  listAllStorageKeys(): string[] {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) {
        keys.push(key)
      }
    }
    return keys
  }

  /** 销毁 */
  destroy(): void {
    if (this.clearConfirmTimer) {
      clearTimeout(this.clearConfirmTimer)
    }
    this.writeQueue = []
    this.isProcessingQueue = false
    console.log('[DataStore] 已销毁')
  }

  // ==================== 内部：串行写入队列 ====================

  private enqueueWrite(fn: () => Promise<void>): void {
    this.writeQueue.push(fn)
    this.state.writeQueueLength = this.writeQueue.length
    this.processQueue()
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.writeQueue.length === 0) return
    this.isProcessingQueue = true

    while (this.writeQueue.length > 0) {
      const task = this.writeQueue.shift()!
      try {
        await task()
      } catch (e) {
        console.warn('[DataStore] 写入任务失败:', e)
      }
    }

    this.isProcessingQueue = false
    this.state.writeQueueLength = 0
  }

  // ==================== 内部：数据读写 ====================

  /** 追加到加密数据保险箱 */
  private appendToVault(entry: FilteredData): void {
    try {
      const existing = this.loadVault()
      existing.push(entry)
      // 最多保留200条情绪事件
      if (existing.length > 200) {
        // 仅清理 EMOTION_EVENT 类型的旧数据
        const emotionEvents = existing.filter(e => e.category === DataCategory.EMOTION_EVENT)
        const others = existing.filter(e => e.category !== DataCategory.EMOTION_EVENT)
        const trimmed = others.concat(emotionEvents.slice(-200))
        this.saveVault(trimmed)
      } else {
        this.saveVault(existing)
      }
    } catch (e) {
      console.warn('[DataStore] 写入数据保险箱失败:', e)
    }
  }

  private loadVault(): FilteredData[] {
    try {
      const raw = localStorage.getItem(KEY_ENCRYPTED)
      if (!raw) return []
      const decrypted = decrypt(raw)
      return JSON.parse(decrypted) || []
    } catch {
      return []
    }
  }

  private saveVault(data: FilteredData[]): void {
    try {
      const json = JSON.stringify(data)
      localStorage.setItem(KEY_ENCRYPTED, encrypt(json))
    } catch (e) {
      console.warn('[DataStore] 加密存储失败:', e)
    }
  }

  private appendSessionLog(log: SessionLogEntry): void {
    try {
      const logs = this.getSessionLogs()
      logs.push(log)
      // 最多保留100条会话日志
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100)
      }
      const json = JSON.stringify(logs)
      localStorage.setItem(KEY_SESSION_LOGS, encrypt(json))
      this.state.sessionLogCount = logs.length
    } catch (e) {
      console.warn('[DataStore] 写入会话日志失败:', e)
    }
  }

  private loadHealingPreference(): HealingPreference {
    try {
      const raw = localStorage.getItem(KEY_HEALING_PREF)
      if (!raw) return this.createDefaultPreference()
      const decrypted = decrypt(raw)
      return { ...this.createDefaultPreference(), ...JSON.parse(decrypted) }
    } catch {
      return this.createDefaultPreference()
    }
  }

  private saveHealingPreference(pref: HealingPreference): void {
    try {
      localStorage.setItem(KEY_HEALING_PREF, encrypt(JSON.stringify(pref)))
    } catch (e) {
      console.warn('[DataStore] 保存疗愈偏好失败:', e)
    }
  }

  private createDefaultPreference(): HealingPreference {
    return {
      commandFrequency: {},
      preferredStrategies: [],
      musicUsageCount: 0,
      breathUsageCount: 0,
      lastUpdated: Date.now(),
    }
  }

  // ==================== 内部：状态管理 ====================

  private loadState(): void {
    try {
      const raw = localStorage.getItem(KEY_DATA_STATE)
      if (raw) {
        const parsed = JSON.parse(raw)
        this.state = { ...this.state, ...parsed, isReady: false }
      }
    } catch {
      // 使用默认状态
    }
  }

  private saveState(): void {
    try {
      localStorage.setItem(KEY_DATA_STATE, JSON.stringify(this.state))
    } catch (e) {
      console.warn('[DataStore] 保存状态失败:', e)
    }
  }

  private countEntries(): void {
    this.state.emotionEventCount = this.loadVault()
      .filter(e => e.category === DataCategory.EMOTION_EVENT).length
    this.state.sessionLogCount = this.getSessionLogs().length
    this.state.totalEntries = this.state.emotionEventCount + this.state.sessionLogCount
  }

  private notifyStateChange(): void {
    this.callbacks.onStateChange?.({ ...this.state })
  }

  // ==================== 内部：清空逻辑 ====================

  /**
   * 执行数据清空（事务式）
   * 任何步骤失败则整体回滚
   */
  private executeClear(): boolean {
    console.log('[DataStore] 开始执行数据清空...')

    // 1. 备份所有数据（用于回滚）
    const backup: Record<string, string | null> = {}
    const keysToClear = this.listAllStorageKeys()
    for (const key of keysToClear) {
      backup[key] = localStorage.getItem(key)
    }

    // 2. 逐个清空
    let allSuccess = true
    for (const key of keysToClear) {
      try {
        localStorage.removeItem(key)
      } catch (e) {
        console.warn(`[DataStore] 清空 ${key} 失败:`, e)
        allSuccess = false
        break
      }
    }

    // 3. 部分失败则回滚
    if (!allSuccess) {
      console.warn('[DataStore] 清空部分失败，执行回滚')
      for (const [key, value] of Object.entries(backup)) {
        if (value !== null) {
          try { localStorage.setItem(key, value) } catch { /* ignore */ }
        }
      }
      this.clearConfirmState = ClearConfirmState.IDLE
      this.callbacks.onClearComplete?.(false)
      return false
    }

    // 4. 重置状态
    this.state.emotionEventCount = 0
    this.state.sessionLogCount = 0
    this.state.totalEntries = 0
    this.state.lastClearTime = Date.now()
    this.state.lastWriteTime = null
    this.saveState()

    console.log('[DataStore] ✓ 数据清空完成')
    this.clearConfirmState = ClearConfirmState.IDLE
    this.notifyStateChange()
    this.callbacks.onClearComplete?.(true)
    return true
  }
}
