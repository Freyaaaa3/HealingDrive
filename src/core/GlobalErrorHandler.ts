/**
 * Module 9: 全局异常处理器
 *
 * 统一管理所有模块的异常捕获、降级策略和错误日志。
 * 核心原则：
 *   - 所有异常静默降级，绝不弹窗/Toast
 *   - 错误分级（LOW/MEDIUM/HIGH），自动匹配降级策略
 *   - 最多保留50条错误日志，避免内存泄漏
 *   - 提供 window.onerror / unhandledrejection 全局兜底
 */
import {
  ErrorSeverity, ErrorSource, ErrorLogEntry,
  DegradationAction, GlobalErrorState,
} from '@/types'

/** 模块 → 降级策略映射 */
const DEFAULT_DEGRADATION_MAP: Record<ErrorSource, string> = {
  asr: '语音识别不可用，无法理解用户输入',
  tts: '语音合成异常，仅保留文字回复',
  audio: '音频通道异常，暂停倾听',
  emotion: '情绪识别异常，使用默认基准模型',
  healing: '疗愈服务异常，使用本地预设话术',
  music: '音乐播放失败，语音温和提示',
  breath: '正念引导异常，可重新发起',
  parking: '停车推荐不可用，其余功能正常',
  profile: '画像计算异常，保留历史标签',
  datastore: '本地存储异常，自动过滤不纳入统计',
  oem: '车企配置缺失，回落Demo默认',
  lifecycle: '生命周期异常，尝试降级运行',
  avatar: '形象资源异常，隐藏形象保留语音',
  interaction: '对话管理异常，恢复倾听',
  global: '全局异常，静默处理',
}

/** 生成唯一ID */
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export class GlobalErrorHandler {
  private logs: ErrorLogEntry[] = []
  private degradations: DegradationAction[] = []
  private degradedModules: Record<ErrorSource, boolean>
  private stats: GlobalErrorState['stats']
  private maxLogs = 50
  private listeners: Array<(entry: ErrorLogEntry) => void> = []

  constructor() {
    this.degradedModules = {} as Record<ErrorSource, boolean>
    this.stats = {
      total: 0,
      bySeverity: { low: 0, medium: 0, high: 0 },
      bySource: {},
    }
  }

  /**
   * 记录异常并自动降级
   * @param source 异常来源模块
   * @param message 错误摘要
   * @param severity 严重等级（默认MEDIUM）
   * @param customDegradation 自定义降级描述（覆盖默认策略）
   */
  handleError(
    source: ErrorSource,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    customDegradation?: string,
  ): void {
    const degradation = customDegradation ?? DEFAULT_DEGRADATION_MAP[source] ?? '静默降级'
    const degraded = severity !== ErrorSeverity.LOW

    const entry: ErrorLogEntry = {
      id: uid(),
      timestamp: Date.now(),
      severity,
      source,
      message,
      degraded,
      degradation,
    }

    // 写入日志
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // 更新统计
    this.stats.total++
    this.stats.bySeverity[severity]++
    this.stats.bySource[source] = (this.stats.bySource[source] ?? 0) + 1

    // 标记降级
    if (degraded) {
      this.degradedModules[source] = true
      this.degradations.push({
        strategy: degradation,
        affectedModules: [source],
        description: `${source}: ${message}`,
        triggeredAt: entry.timestamp,
      })
      if (this.degradations.length > 50) {
        this.degradations.shift()
      }
    }

    // 日志输出
    const tag = `[ErrorHandler][${source}]`
    if (severity === ErrorSeverity.HIGH) {
      console.error(`${tag} ${message} → ${degradation}`)
    } else if (severity === ErrorSeverity.MEDIUM) {
      console.warn(`${tag} ${message} → ${degradation}`)
    } else {
      console.log(`${tag} ${message} → ${degradation}`)
    }

    // 通知监听器
    this.listeners.forEach(fn => fn(entry))
  }

  /**
   * 标记模块恢复正常
   */
  recoverModule(source: ErrorSource): void {
    if (this.degradedModules[source]) {
      this.degradedModules[source] = false
      console.log(`[ErrorHandler][${source}] 模块已恢复正常`)
    }
  }

  /**
   * 注册全局异常兜底（window.onerror + unhandledrejection）
   * 在 App.vue onMounted 中调用一次
   */
  installGlobalHandlers(): void {
    // 同步异常兜底
    const prevOnError = window.onerror
    window.onerror = (msg, src, line, col, error) => {
      this.handleError(
        'global',
        `${msg} (${src}:${line}:${col})`,
        ErrorSeverity.HIGH,
        '全局异常，静默忽略',
      )
      // 不阻止原有处理
      if (prevOnError) return prevOnError(msg, src, line, col, error)
      return true // 阻止默认弹窗（座舱不允许弹窗）
    }

    // 异步Promise异常兜底
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        'global',
        `Unhandled Promise: ${event.reason}`,
        ErrorSeverity.HIGH,
        'Promise异常，静默忽略',
      )
      event.preventDefault() // 阻止默认控制台错误
    })

    console.log('[GlobalErrorHandler] 全局异常兜底已安装')
  }

  /**
   * 移除全局异常兜底
   */
  uninstallGlobalHandlers(): void {
    window.onerror = null
    // unhandledrejection 无法精确移除，通过标记忽略
    console.log('[GlobalErrorHandler] 全局异常兜底已移除')
  }

  /** 添加日志监听器 */
  onError(fn: (entry: ErrorLogEntry) => void): () => void {
    this.listeners.push(fn)
    return () => {
      const idx = this.listeners.indexOf(fn)
      if (idx >= 0) this.listeners.splice(idx, 1)
    }
  }

  /** 获取完整状态快照 */
  getState(): GlobalErrorState {
    return {
      errorLogs: [...this.logs],
      degradationActions: [...this.degradations],
      degradedModules: { ...this.degradedModules },
      stats: { ...this.stats, bySource: { ...this.stats.bySource } },
    }
  }

  /** 获取降级模块列表 */
  getDegradedModules(): ErrorSource[] {
    return (Object.entries(this.degradedModules) as [ErrorSource, boolean][])
      .filter(([, v]) => v)
      .map(([k]) => k)
  }

  /** 清空日志（调试用） */
  clearLogs(): void {
    this.logs = []
    this.degradations = []
    this.stats = { total: 0, bySeverity: { low: 0, medium: 0, high: 0 }, bySource: {} }
  }

  /** 销毁 */
  destroy(): void {
    this.uninstallGlobalHandlers()
    this.listeners.length = 0
    this.clearLogs()
  }
}
