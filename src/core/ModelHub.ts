/**
 * ModelHub - 大模型统一调度中心（Module 10）
 *
 * 统一封装 Ollama 本地推理 + 主流云端 API 模型，
 * 提供一套接口、多模型无缝切换能力。
 *
 * 职责：
 * - 管理模型池（本地 Ollama + 云端 API）
 * - 统一对话入参/出参格式
 * - 模型热切换（无需重启）
 * - API Key 校验（缺失时不崩溃，使用时才提示）
 * - 自动降级（API异常 → Ollama兜底）
 */
import type {
  LLMModelInfo, LLMChatRequest, LLMChatResponse,
  LLMModelState, LLMProvider, LLMModelStatus,
} from '@/types'
import {
  OLLAMA_BASE_URL, LLM_REQUEST_TIMEOUT, OLLAMA_DEFAULT_MODELS,
  LLM_DEFAULT_TEMPERATURE, LLM_DEFAULT_MAX_TOKENS,
  LLM_API_KEY_ENV_MAP, OLLAMA_HEALTH_CHECK_TIMEOUT,
} from '@/config/constants'

// ==================== 内置模型注册表 ====================

interface ModelDefinition {
  id: string
  name: string
  provider: LLMProvider
  isLocal: boolean
  description: string
  envKey: string
  paramSize?: string
  /** API端点（相对于baseUrl） */
  chatEndpoint: string
  /** 请求构建器：将统一请求转为该模型实际请求体 */
  buildBody: (req: LLMChatRequest, apiKey: string) => Record<string, unknown>
  /** 响应解析器：从该模型实际响应中提取回复文本 */
  parseResponse: (data: any) => string
  /** API基地址（空=使用Ollama） */
  baseUrl?: string
  /** 自定义请求头 */
  headers?: (apiKey: string) => Record<string, string>
}

/** 内置所有支持的模型定义 */
const MODEL_REGISTRY: ModelDefinition[] = [
  // ---- 本地 Ollama 模型（动态发现，此处为预设） ----
  {
    id: 'qwen2.5:7b',
    name: 'Qwen2.5 7B',
    provider: 'ollama' as LLMProvider,
    isLocal: true,
    description: '通义千问轻量版，离线可用',
    envKey: '',
    paramSize: '7B',
    chatEndpoint: '/api/chat',
    buildBody: (req) => ({
      model: req.model,
      messages: req.messages,
      stream: false,
      options: {
        temperature: req.temperature ?? LLM_DEFAULT_TEMPERATURE,
        num_predict: req.maxTokens ?? LLM_DEFAULT_MAX_TOKENS,
      },
    }),
    parseResponse: (data) => data?.message?.content || '',
  },
  {
    id: 'llama3.2:3b',
    name: 'LLaMA 3.2 3B',
    provider: 'ollama' as LLMProvider,
    isLocal: true,
    description: 'Meta轻量模型，离线可用',
    envKey: '',
    paramSize: '3B',
    chatEndpoint: '/api/chat',
    buildBody: (req) => ({
      model: req.model,
      messages: req.messages,
      stream: false,
      options: {
        temperature: req.temperature ?? LLM_DEFAULT_TEMPERATURE,
        num_predict: req.maxTokens ?? LLM_DEFAULT_MAX_TOKENS,
      },
    }),
    parseResponse: (data) => data?.message?.content || '',
  },

  // ---- 云端 API 模型 ----
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai' as LLMProvider,
    isLocal: false,
    description: 'OpenAI 最新多模态模型',
    envKey: 'openai',
    paramSize: '~200B',
    chatEndpoint: '/v1/chat/completions',
    baseUrl: 'https://api.openai.com',
    buildBody: (req) => ({
      model: req.model,
      messages: req.messages,
      temperature: req.temperature ?? LLM_DEFAULT_TEMPERATURE,
      max_tokens: req.maxTokens ?? LLM_DEFAULT_MAX_TOKENS,
    }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || '',
    headers: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai' as LLMProvider,
    isLocal: false,
    description: 'OpenAI 经典模型，速度快',
    envKey: 'openai',
    paramSize: '~175B',
    chatEndpoint: '/v1/chat/completions',
    baseUrl: 'https://api.openai.com',
    buildBody: (req) => ({
      model: req.model,
      messages: req.messages,
      temperature: req.temperature ?? LLM_DEFAULT_TEMPERATURE,
      max_tokens: req.maxTokens ?? LLM_DEFAULT_MAX_TOKENS,
    }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || '',
    headers: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek' as LLMProvider,
    isLocal: false,
    description: '深度求索，中文能力强',
    envKey: 'deepseek',
    paramSize: '~67B',
    chatEndpoint: '/v1/chat/completions',
    baseUrl: 'https://api.deepseek.com',
    buildBody: (req) => ({
      model: req.model,
      messages: req.messages,
      temperature: req.temperature ?? LLM_DEFAULT_TEMPERATURE,
      max_tokens: req.maxTokens ?? LLM_DEFAULT_MAX_TOKENS,
    }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || '',
    headers: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
  },
  {
    id: 'doubao',
    name: '豆包',
    provider: 'doubao' as LLMProvider,
    isLocal: false,
    description: '火山方舟，字节跳动出品',
    envKey: 'doubao',
    paramSize: '~130B',
    chatEndpoint: '/v1/chat/completions',
    baseUrl: 'https://ark.cn-beijing.volces.com',
    buildBody: (req) => ({
      model: req.model,
      messages: req.messages,
      temperature: req.temperature ?? LLM_DEFAULT_TEMPERATURE,
      max_tokens: req.maxTokens ?? LLM_DEFAULT_MAX_TOKENS,
    }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || '',
    headers: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
  },
  {
    id: 'qwen-plus',
    name: '通义千问 Plus',
    provider: 'qwen' as LLMProvider,
    isLocal: false,
    description: '阿里云通义千问，中文理解强',
    envKey: 'qwen',
    paramSize: '~72B',
    chatEndpoint: '/v1/chat/completions',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode',
    buildBody: (req) => ({
      model: req.model,
      messages: req.messages,
      temperature: req.temperature ?? LLM_DEFAULT_TEMPERATURE,
      max_tokens: req.maxTokens ?? LLM_DEFAULT_MAX_TOKENS,
    }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || '',
    headers: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
  },
  {
    id: 'moonshot-v1',
    name: 'Moonshot Kimi',
    provider: 'moonshot' as LLMProvider,
    isLocal: false,
    description: '月之暗面 Kimi，长上下文',
    envKey: 'moonshot',
    paramSize: '~200B',
    chatEndpoint: '/v1/chat/completions',
    baseUrl: 'https://api.moonshot.cn',
    buildBody: (req) => ({
      model: req.model,
      messages: req.messages,
      temperature: req.temperature ?? LLM_DEFAULT_TEMPERATURE,
      max_tokens: req.maxTokens ?? LLM_DEFAULT_MAX_TOKENS,
    }),
    parseResponse: (data) => data?.choices?.[0]?.message?.content || '',
    headers: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic' as LLMProvider,
    isLocal: false,
    description: 'Anthropic Claude，推理能力强',
    envKey: 'anthropic',
    paramSize: '~175B',
    chatEndpoint: '/v1/messages',
    baseUrl: 'https://api.anthropic.com',
    buildBody: (req, apiKey) => ({
      model: req.model,
      max_tokens: req.maxTokens ?? LLM_DEFAULT_MAX_TOKENS,
      system: req.messages.find(m => m.role === 'system')?.content || '',
      messages: req.messages.filter(m => m.role !== 'system'),
      anthropic_version: '2023-06-01',
    }),
    parseResponse: (data) => data?.content?.[0]?.text || '',
    headers: (apiKey) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
  },
]

// ==================== ModelHub 核心类 ====================

/** 默认模型ID */
const DEFAULT_MODEL_ID = 'deepseek-r1:8b'

export class ModelHub {
  /** 当前使用的模型ID */
  private currentModelId: string

  /** Ollama服务是否可用 */
  private ollamaReady: boolean = false

  /** 已发现的本地模型ID列表 */
  private ollamaModels: string[] = []

  /** 模型切换锁（防止并发切换） */
  private switching: boolean = false

  /** 状态变更回调 */
  private onChangeCallbacks: ((state: LLMModelState) => void)[] = []

  constructor() {
    // 默认使用 deepseek-r1:8b
    this.currentModelId = DEFAULT_MODEL_ID
  }

  // ==================== 初始化 ====================

  /**
   * 初始化模型调度中心
   * - 检测 Ollama 服务可用性
   * - 发现本地模型
   * - 读取 API Key 配置状态
   */
  async init(): Promise<LLMModelState> {
    console.log('[ModelHub] 初始化大模型调度中心...')

    // 并行检测 Ollama + API Key 配置
    await this.detectOllama()

    console.log(`[ModelHub] 初始化完成: Ollama=${this.ollamaReady}, 本地模型=[${this.ollamaModels.join(',')}]`)

    return this.getState()
  }

  /**
   * 检测 Ollama 服务并发现本地模型
   */
  private async detectOllama(): Promise<void> {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), OLLAMA_HEALTH_CHECK_TIMEOUT)

      const resp = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (resp.ok) {
        const data = await resp.json()
        this.ollamaModels = (data?.models || []).map((m: any) => m.name || m.model)
        this.ollamaReady = true
        console.log(`[ModelHub] Ollama 就绪，发现 ${this.ollamaModels.length} 个本地模型`)
      } else {
        this.ollamaReady = false
        console.warn('[ModelHub] Ollama 响应异常:', resp.status)
      }
    } catch (err) {
      this.ollamaReady = false
      console.warn('[ModelHub] Ollama 服务未就绪（离线模式）:', (err as Error).message)
    }
  }

  // ==================== 模型管理 ====================

  /**
   * 获取所有可用模型列表
   */
  getModelList(): LLMModelInfo[] {
    const apiKeysConfigured = this.getApiKeysConfigured()

    // 合并内置模型 + Ollama 动态发现的模型
    const allModels = new Map<string, LLMModelInfo>()

    // 先注册内置模型
    for (const def of MODEL_REGISTRY) {
      const isCurrentModel = def.id === this.currentModelId

      if (def.isLocal) {
        // 本地模型：检查 Ollama 中是否存在
        const exists = this.ollamaModels.includes(def.id) || !this.ollamaModels.length
        allModels.set(def.id, {
          id: def.id,
          name: def.name,
          provider: def.provider,
          isLocal: true,
          status: exists
            ? (isCurrentModel ? 'active' as LLMModelStatus : 'available' as LLMModelStatus)
            : 'unavailable' as LLMModelStatus,
          description: def.description,
          envKey: '',
          paramSize: def.paramSize,
        })
      } else {
        // API模型
        const hasKey = !!apiKeysConfigured[def.envKey]
        allModels.set(def.id, {
          id: def.id,
          name: def.name,
          provider: def.provider,
          isLocal: false,
          status: hasKey
            ? (isCurrentModel ? 'active' as LLMModelStatus : 'available' as LLMModelStatus)
            : 'unavailable' as LLMModelStatus,
          description: def.description,
          envKey: def.envKey,
          paramSize: def.paramSize,
        })
      }
    }

    // 补充 Ollama 动态发现但未在注册表中的模型
    for (const ollamaId of this.ollamaModels) {
      if (!allModels.has(ollamaId)) {
        const isCurrentModel = ollamaId === this.currentModelId
        allModels.set(ollamaId, {
          id: ollamaId,
          name: ollamaId,
          provider: 'ollama' as LLMProvider,
          isLocal: true,
          status: isCurrentModel ? 'active' as LLMModelStatus : 'available' as LLMModelStatus,
          description: 'Ollama 本地模型',
          envKey: '',
        })
      }
    }

    return Array.from(allModels.values())
  }

  /**
   * 获取当前使用的模型ID
   */
  getCurrentModelId(): string {
    return this.currentModelId
  }

  /**
   * 切换当前使用的模型
   */
  async switchModel(modelId: string): Promise<LLMChatResponse> {
    if (this.switching) {
      return { code: 429, content: '模型切换中，请稍后', model: this.currentModelId, isLocal: false, elapsedMs: 0 }
    }

    const models = this.getModelList()
    const target = models.find(m => m.id === modelId)
    if (!target) {
      return { code: 404, content: `模型不存在: ${modelId}`, model: this.currentModelId, isLocal: false, elapsedMs: 0 }
    }

    // API模型无Key提示
    if (!target.isLocal && target.status === 'unavailable') {
      const def = MODEL_REGISTRY.find(d => d.id === modelId)
      const envName = def?.envKey ? LLM_API_KEY_ENV_MAP[def.envKey] : ''
      return {
        code: 403,
        content: `该模型未配置API Key${envName ? `（${envName}）` : ''}，请联系管理员配置后使用`,
        model: this.currentModelId,
        isLocal: false,
        elapsedMs: 0,
      }
    }

    // Ollama本地模型服务未就绪
    if (target.isLocal && !this.ollamaReady) {
      return {
        code: 503,
        content: '本地模型启动中，请稍后',
        model: this.currentModelId,
        isLocal: false,
        elapsedMs: 0,
      }
    }

    this.switching = true
    const prevModel = this.currentModelId
    this.currentModelId = modelId

    try {
      // 发送测试请求验证模型可用性
      const testResp = await this.chat({
        model: modelId,
        messages: [{ role: 'user', content: '你好' }],
        maxTokens: 10,
      })

      if (testResp.code === 200) {
        console.log(`[ModelHub] 模型切换成功: ${prevModel} → ${modelId}`)
        this.emitChange()
        return {
          code: 200,
          content: `已切换到 ${target.name}`,
          model: modelId,
          isLocal: target.isLocal,
          elapsedMs: testResp.elapsedMs,
        }
      } else {
        // 切换失败，回退
        this.currentModelId = prevModel
        this.emitChange()
        return {
          code: testResp.code,
          content: testResp.content,
          model: prevModel,
          isLocal: false,
          elapsedMs: testResp.elapsedMs,
        }
      }
    } catch (err) {
      this.currentModelId = prevModel
      this.emitChange()
      return {
        code: 500,
        content: `切换异常: ${(err as Error).message}`,
        model: prevModel,
        isLocal: false,
        elapsedMs: 0,
      }
    } finally {
      this.switching = false
    }
  }

  // ==================== 统一对话接口 ====================

  /**
   * 统一对话接口
   * 自动路由到对应的模型实现，返回统一格式结果
   */
  async chat(request: LLMChatRequest): Promise<LLMChatResponse> {
    const modelId = request.model || this.currentModelId
    const startTime = Date.now()

    try {
      const def = MODEL_REGISTRY.find(d => d.id === modelId)

      if (!def) {
        // 尝试作为 Ollama 模型处理（动态发现的模型）
        return await this.ollamaChat(modelId, request, startTime)
      }

      if (def.isLocal) {
        return await this.ollamaChat(modelId, request, startTime)
      }

      // API模型：检查Key
      const apiKey = this.getApiKey(def.envKey)
      if (!apiKey) {
        const envName = LLM_API_KEY_ENV_MAP[def.envKey] || def.envKey
        return {
          code: 403,
          content: `该模型未配置API Key（${envName}），请联系管理员配置后使用`,
          model: modelId,
          isLocal: false,
          elapsedMs: Date.now() - startTime,
          error: 'MISSING_API_KEY',
        }
      }

      // 调用API
      return await this.apiChat(def, request, apiKey, startTime)
    } catch (err) {
      console.error('[ModelHub] 对话异常:', err)

      // 自动降级：如果是API模型失败，尝试 Ollama 兜底
      const isLocal = MODEL_REGISTRY.find(d => d.id === modelId)?.isLocal
      if (!isLocal && this.ollamaReady) {
        console.log('[ModelHub] API异常，降级到Ollama本地模型')
        return await this.ollamaChat(this.currentModelId, request, startTime)
      }

      return {
        code: 500,
        content: '模型响应异常，请稍后重试',
        model: modelId,
        isLocal: !!isLocal,
        elapsedMs: Date.now() - startTime,
        error: (err as Error).message,
      }
    }
  }

  // ==================== Ollama 本地推理 ====================

  private async ollamaChat(
    modelId: string,
    request: LLMChatRequest,
    startTime: number,
  ): Promise<LLMChatResponse> {
    const url = `${OLLAMA_BASE_URL}/api/chat`
    const body: Record<string, unknown> = {
      model: modelId,
      messages: request.messages,
      stream: false,
      options: {
        temperature: request.temperature ?? LLM_DEFAULT_TEMPERATURE,
        num_predict: request.maxTokens ?? LLM_DEFAULT_MAX_TOKENS,
      },
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), LLM_REQUEST_TIMEOUT)

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '')
        console.warn(`[ModelHub] Ollama返回错误(${resp.status}):`, errText)
        return {
          code: resp.status,
          content: `本地模型返回错误(${resp.status})，请检查模型是否已加载`,
          model: modelId,
          isLocal: true,
          elapsedMs: Date.now() - startTime,
          error: `HTTP_${resp.status}`,
        }
      }

      const data = await resp.json()
      const content = data?.message?.content || ''

      if (!content) {
        return {
          code: 500,
          content: '本地模型未返回有效内容',
          model: modelId,
          isLocal: true,
          elapsedMs: Date.now() - startTime,
          error: 'EMPTY_RESPONSE',
        }
      }

      this.emitChange()
      return {
        code: 200,
        content,
        model: modelId,
        isLocal: true,
        elapsedMs: Date.now() - startTime,
      }
    } catch (err) {
      clearTimeout(timer)
      const errMsg = (err as Error).message || ''
      const isTimeout = errMsg.includes('abort') || errMsg.includes('timeout') || errMsg.includes('Timeout')

      if (isTimeout) {
        return {
          code: 504,
          content: `本地模型推理超时(${Math.round(LLM_REQUEST_TIMEOUT / 1000)}s)，${modelId} 可能正在首次加载，请稍后重试`,
          model: modelId,
          isLocal: true,
          elapsedMs: Date.now() - startTime,
          error: 'TIMEOUT',
        }
      }

      if (!this.ollamaReady) {
        return {
          code: 503,
          content: 'Ollama服务未就绪，请确认 Ollama 已启动',
          model: modelId,
          isLocal: true,
          elapsedMs: Date.now() - startTime,
          error: errMsg,
        }
      }

      return {
        code: 503,
        content: `本地模型通信异常: ${errMsg}`,
        model: modelId,
        isLocal: true,
        elapsedMs: Date.now() - startTime,
        error: errMsg,
      }
    }
  }

  // ==================== API 模型调用 ====================

  private async apiChat(
    def: ModelDefinition,
    request: LLMChatRequest,
    apiKey: string,
    startTime: number,
  ): Promise<LLMChatResponse> {
    const baseUrl = def.baseUrl || OLLAMA_BASE_URL
    const url = `${baseUrl}${def.chatEndpoint}`
    const body = def.buildBody(request, apiKey)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (def.headers) {
      Object.assign(headers, def.headers(apiKey))
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), LLM_REQUEST_TIMEOUT)

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timer)

      const data = await resp.json()

      if (resp.status === 401 || resp.status === 403) {
        return {
          code: 403,
          content: 'API Key 无效或已过期，请联系管理员',
          model: def.id,
          isLocal: false,
          elapsedMs: Date.now() - startTime,
          error: 'INVALID_API_KEY',
        }
      }

      if (!resp.ok) {
        const errMsg = data?.error?.message || data?.error || `HTTP ${resp.status}`
        return {
          code: resp.status,
          content: `模型调用失败: ${errMsg}`,
          model: def.id,
          isLocal: false,
          elapsedMs: Date.now() - startTime,
          error: String(errMsg),
        }
      }

      const content = def.parseResponse(data)
      if (!content) {
        return {
          code: 500,
          content: '模型未返回有效内容',
          model: def.id,
          isLocal: false,
          elapsedMs: Date.now() - startTime,
          error: 'EMPTY_RESPONSE',
        }
      }

      this.emitChange()
      return {
        code: 200,
        content,
        model: def.id,
        isLocal: false,
        elapsedMs: Date.now() - startTime,
      }
    } catch (err) {
      clearTimeout(timer)
      return {
        code: 500,
        content: '模型响应较慢，请重试',
        model: def.id,
        isLocal: false,
        elapsedMs: Date.now() - startTime,
        error: (err as Error).message,
      }
    }
  }

  // ==================== API Key 管理 ====================

  /**
   * 获取指定提供商的 API Key
   */
  getApiKey(provider: string): string {
    const envName = LLM_API_KEY_ENV_MAP[provider]
    if (!envName) return ''
    return import.meta.env[envName] || ''
  }

  /**
   * 获取所有 API Key 的配置状态
   */
  getApiKeysConfigured(): Record<string, boolean> {
    const result: Record<string, boolean> = {}
    for (const [provider, envName] of Object.entries(LLM_API_KEY_ENV_MAP)) {
      result[provider] = !!(import.meta.env[envName])
    }
    return result
  }

  // ==================== 状态管理 ====================

  /**
   * 获取完整状态快照
   */
  getState(): LLMModelState {
    const models = this.getModelList()
    const currentModel = models.find(m => m.id === this.currentModelId)

    return {
      currentModelId: this.currentModelId,
      currentStatus: currentModel?.status || 'unavailable' as LLMModelStatus,
      models,
      ollamaReady: this.ollamaReady,
      apiKeysConfigured: this.getApiKeysConfigured(),
      lastRequestMs: null,
      lastRequestTime: null,
    }
  }

  /**
   * 监听状态变更
   */
  onChange(callback: (state: LLMModelState) => void): void {
    this.onChangeCallbacks.push(callback)
  }

  private emitChange(): void {
    const state = this.getState()
    for (const cb of this.onChangeCallbacks) {
      try { cb(state) } catch (e) { console.warn('[ModelHub] onChange回调异常:', e) }
    }
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.onChangeCallbacks = []
  }
}
