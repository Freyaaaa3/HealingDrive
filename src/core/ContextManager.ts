/**
 * Module 12: ContextManager — Agent上下文记忆与对话管理
 *
 * 核心职责：
 * 1. 会话生命周期管理（新唤醒→初始化→会话结束销毁）
 * 2. 短期记忆库（仅内存缓存，不持久化）
 * 3. 多轮上下文管理（实时累加，user/assistant格式）
 * 4. 上下文阈值检测（轮次+字符双阈值）
 * 5. 超长上下文自动压缩（调用LLM摘要能力）
 */

import type { LLMMessage, ContextStats, ContextManagerState } from '@/types'
import { CONTEXT_MAX_TURNS, CONTEXT_MAX_CHARS, CONTEXT_COMPRESS_PROMPT, CONTEXT_PRESERVE_RECENT_TURNS, CONTEXT_COMPRESS_MAX_LENGTH } from '@/config/constants'
import { ErrorSeverity, ErrorSource } from '@/types'

/**
 * 上下文记忆管理器
 */
export class ContextManager {
  /** 当前会话ID */
  private sessionId: string | null = null

  /** 会话创建时间 */
  private sessionStartTime: number | null = null

  /** 上下文消息数组 */
  private messages: LLMMessage[] = []

  /** 压缩后的摘要（如果有） */
  private compressedSummary: string | null = null

  /** 是否已压缩过 */
  private hasCompressed: boolean = false

  /** 最近一次压缩时间戳 */
  private lastCompressTime: number | null = null

  /** 轮次计数（每轮=user+assistant） */
  private turnCount: number = 0

  /** 字符总数 */
  private totalChars: number = 0

  /** 阈值配置 */
  private maxTurns: number
  private maxChars: number

  /** LLM调用接口（用于压缩） */
  private llmCaller: ((messages: LLMMessage[]) => Promise<string>) | null = null

  /** 状态变更回调 */
  private onChangeCallback: ((state: ContextManagerState) => void) | null = null

  constructor(options?: {
    maxTurns?: number
    maxChars?: number
  }) {
    this.maxTurns = options?.maxTurns ?? CONTEXT_MAX_TURNS
    this.maxChars = options?.maxChars ?? CONTEXT_MAX_CHARS
  }

  // ==================== 会话生命周期 ====================

  /**
   * 初始化新会话（新唤醒时调用）
   * 强制清空历史短期记忆，创建新会话
   */
  initSession(): string {
    // 如果已有会话，先销毁
    if (this.sessionId) {
      this.clearSession()
    }

    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    this.sessionStartTime = Date.now()
    this.messages = []
    this.compressedSummary = null
    this.hasCompressed = false
    this.turnCount = 0
    this.totalChars = 0

    console.log(`[ContextManager] 新会话初始化: ${this.sessionId}`)
    this.notifyChange()

    return this.sessionId
  }

  /**
   * 清除当前会话（会话结束时调用）
   * 销毁本次所有会话记忆，释放内存
   */
  clearSession(): void {
    if (this.sessionId) {
      console.log(`[ContextManager] 会话销毁: ${this.sessionId}`)
    }

    this.sessionId = null
    this.sessionStartTime = null
    this.messages = []
    this.compressedSummary = null
    this.hasCompressed = false
    this.lastCompressTime = null
    this.turnCount = 0
    this.totalChars = 0

    // 强制垃圾回收（提示性）
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc()
    }

    this.notifyChange()
  }

  /**
   * 获取当前会话ID
   */
  getSessionId(): string | null {
    return this.sessionId
  }

  /**
   * 检查是否有活跃会话
   */
  hasActiveSession(): boolean {
    return this.sessionId !== null
  }

  // ==================== 上下文管理 ====================

  /**
   * 添加用户消息到上下文
   */
  addUserMessage(content: string): void {
    if (!this.sessionId) {
      console.warn('[ContextManager] 无活跃会话，自动初始化')
      this.initSession()
    }

    const message: LLMMessage = { role: 'user', content }
    this.messages.push(message)
    this.totalChars += this.estimateChars(content)

    // 用户消息不算一轮，需要等待assistant回复
    this.notifyChange()
  }

  /**
   * 添加助手消息到上下文
   */
  addAssistantMessage(content: string): void {
    if (!this.sessionId) {
      console.warn('[ContextManager] 无活跃会话，自动初始化')
      this.initSession()
    }

    const message: LLMMessage = { role: 'assistant', content }
    this.messages.push(message)
    this.totalChars += this.estimateChars(content)

    // 完整的user+assistant算一轮
    this.turnCount++

    this.notifyChange()

    // 添加后检测阈值
    this.checkAndCompressIfNeeded()
  }

  /**
   * 添加系统消息到上下文（可选）
   */
  addSystemMessage(content: string): void {
    if (!this.sessionId) {
      this.initSession()
    }

    const message: LLMMessage = { role: 'system', content }
    this.messages.push(message)
    this.totalChars += this.estimateChars(content)

    this.notifyChange()
  }

  /**
   * 获取当前上下文（用于LLM请求）
   * 如果有压缩摘要，将摘要作为第一条消息，后面跟最近的消息
   */
  getContext(): LLMMessage[] {
    if (!this.sessionId) {
      return []
    }

    // 如果有压缩摘要，使用摘要+后续消息
    if (this.compressedSummary) {
      const summaryMessage: LLMMessage = {
        role: 'system',
        content: `【对话摘要】${this.compressedSummary}\n\n请基于以上摘要理解用户情况，继续对话。`,
      }

      // 获取压缩后的消息（即压缩时的消息之后的所有消息）
      // 这里简化：返回摘要+所有消息（去重处理）
      const contextWithSummary = [summaryMessage, ...this.messages]
      return contextWithSummary
    }

    // 无压缩，返回完整上下文
    return [...this.messages]
  }

  /**
   * 获取原始上下文（不含摘要）
   */
  getRawContext(): LLMMessage[] {
    return [...this.messages]
  }

  // ==================== 阈值检测 ====================

  /**
   * 检测是否达到阈值
   */
  checkThreshold(): { isExceeded: boolean; reason: string; turnCount: number; totalChars: number } {
    const result = {
      isExceeded: false,
      reason: '',
      turnCount: this.turnCount,
      totalChars: this.totalChars,
    }

    if (this.turnCount >= this.maxTurns) {
      result.isExceeded = true
      result.reason = `达到轮次阈值(${this.turnCount}/${this.maxTurns})`
    }

    if (this.totalChars >= this.maxChars) {
      result.isExceeded = true
      result.reason = result.reason
        ? `${result.reason} & 达到字符阈值(${this.totalChars}/${this.maxChars})`
        : `达到字符阈值(${this.totalChars}/${this.maxChars})`
    }

    return result
  }

  /**
   * 检测并在需要时自动压缩
   */
  private checkAndCompressIfNeeded(): void {
    const checkResult = this.checkThreshold()

    if (checkResult.isExceeded && !this.hasCompressed) {
      console.log(`[ContextManager] 触发自动压缩: ${checkResult.reason}`)
      this.compressContext().catch((err) => {
        console.error('[ContextManager] 自动压缩失败:', err)
        // 压缩失败，保留原上下文继续对话
      })
    }
  }

  // ==================== 上下文压缩 ====================

  /**
   * 压缩上下文（调用LLM摘要能力）
   * 提炼用户核心情绪、触发原因、关键诉求、对话主旨
   */
  async compressContext(): Promise<string | null> {
    if (this.messages.length === 0) {
      console.warn('[ContextManager] 无上下文可压缩')
      return null
    }

    // 如果已经压缩过，避免无限递归压缩
    if (this.hasCompressed) {
      console.log('[ContextManager] 已压缩过，跳过')
      return this.compressedSummary
    }

    try {
      // 构建压缩提示词
      const compressMessages: LLMMessage[] = [
        { role: 'system', content: CONTEXT_COMPRESS_PROMPT },
        { role: 'user', content: this.formatContextForCompress() },
      ]

      // 调用LLM生成摘要
      let summary: string | null = null

      if (this.llmCaller) {
        summary = await this.llmCaller(compressMessages)
      } else {
        // 没有LLM调用器，使用规则提取（降级方案）
        summary = this.fallbackCompress()
      }

      if (!summary || summary.length < 10) {
        // 摘要过短，自动补充基础信息
        summary = this.buildFallbackSummary()
      }

      // 保存压缩摘要
      this.compressedSummary = summary
      this.hasCompressed = true
      this.lastCompressTime = Date.now()

      // 保留最近N轮对话，清空更早的
      const recentMessages = this.messages.slice(-(CONTEXT_PRESERVE_RECENT_TURNS * 2)) // N轮 = N*user + N*assistant
      this.messages = recentMessages

      // 重新计算字符数
      this.recalculateChars()

      console.log(`[ContextManager] 压缩完成，摘要: ${summary.substring(0, 100)}...`)
      this.notifyChange()

      return summary
    } catch (err) {
      console.error('[ContextManager] 压缩失败:', err)
      // 压缩失败，保留原上下文继续对话
      this.hasCompressed = true // 标记已尝试，避免重复压缩
      return null
    }
  }

  /**
   * 格式化上下文用于压缩
   */
  private formatContextForCompress(): string {
    return this.messages
      .map((msg) => {
        const role = msg.role === 'user' ? '用户' : msg.role === 'assistant' ? '助手' : '系统'
        return `${role}: ${msg.content}`
      })
      .join('\n')
  }

  /**
   * 降级方案：规则提取关键信息
   */
  private fallbackCompress(): string {
    // 提取用户消息中的关键信息
    const userMessages = this.messages
      .filter((msg) => msg.role === 'user')
      .map((msg) => msg.content)

    const allText = userMessages.join(' ')

    // 简单提取：保留前200字符
    return `用户倾诉内容摘要：${allText.substring(0, 200)}${allText.length > 200 ? '...' : ''}`
  }

  /**
   * 构建降级摘要（当LLM生成的摘要过短时）
   */
  private buildFallbackSummary(): string {
    const userMessages = this.messages
      .filter((msg) => msg.role === 'user')
      .map((msg) => msg.content)

    return `对话主题：用户情绪倾诉。关键内容：${userMessages.slice(-3).join('；')}`
  }

  /**
   * 重新计算字符数
   */
  private recalculateChars(): void {
    this.totalChars = this.messages.reduce((sum, msg) => sum + this.estimateChars(msg.content), 0)
  }

  // ==================== 配置与注入 ====================

  /**
   * 设置LLM调用器（用于压缩）
   */
  setLLMCaller(caller: (messages: LLMMessage[]) => Promise<string>): void {
    this.llmCaller = caller
  }

  /**
   * 设置状态变更回调
   */
  onChange(callback: (state: ContextManagerState) => void): void {
    this.onChangeCallback = callback
  }

  /**
   * 更新阈值配置
   */
  updateThresholds(options: { maxTurns?: number; maxChars?: number }): void {
    if (options.maxTurns !== undefined) {
      this.maxTurns = options.maxTurns
    }
    if (options.maxChars !== undefined) {
      this.maxChars = options.maxChars
    }
    console.log(`[ContextManager] 阈值更新: ${this.maxTurns}轮 / ${this.maxChars}字符`)
    this.notifyChange()
  }

  // ==================== 查询接口 ====================

  /**
   * 获取上下文统计信息
   */
  getStats(): ContextStats {
    return {
      sessionId: this.sessionId,
      messageCount: this.messages.length,
      turnCount: this.turnCount,
      totalChars: this.totalChars,
      hasCompressed: this.hasCompressed,
      compressedSummary: this.compressedSummary,
      maxTurns: this.maxTurns,
      maxChars: this.maxChars,
      isExceeded: this.checkThreshold().isExceeded,
    }
  }

  /**
   * 获取完整状态（用于Store同步）
   */
  getState(): ContextManagerState {
    return {
      isReady: this.sessionId !== null,
      sessionId: this.sessionId,
      messageCount: this.messages.length,
      turnCount: this.turnCount,
      totalChars: this.totalChars,
      hasCompressed: this.hasCompressed,
      lastCompressTime: this.lastCompressTime,
    }
  }

  /**
   * 估算字符数（简单实现，实际应使用tokenizer）
   */
  private estimateChars(text: string): number {
    return text.length
  }

  /**
   * 通知状态变更
   */
  private notifyChange(): void {
    if (this.onChangeCallback) {
      try {
        this.onChangeCallback(this.getState())
      } catch (err) {
        console.error('[ContextManager] 状态回调异常:', err)
      }
    }
  }

  /**
   * 销毁（清理所有资源）
   */
  destroy(): void {
    this.clearSession()
    this.llmCaller = null
    this.onChangeCallback = null
    console.log('[ContextManager] 已销毁')
  }
}
