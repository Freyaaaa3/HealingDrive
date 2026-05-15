/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_OLLAMA_BASE_URL: string
  readonly VITE_ASR_PROVIDER: string
  readonly VITE_ASR_WS_URL: string
  readonly VITE_IFLYTEK_APP_ID: string
  readonly VITE_IFLYTEK_API_KEY: string
  readonly VITE_IFLYTEK_API_SECRET: string
  readonly VITE_TTS_MODE: string
  readonly VITE_TTS_HTTP_URL: string
  readonly VITE_TTS_EDGE_VOICE: string
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_DEEPSEEK_API_KEY: string
  readonly VITE_DOUBAO_API_KEY: string
  readonly VITE_QWEN_API_KEY: string
  readonly VITE_MOONSHOT_API_KEY: string
  readonly VITE_ANTHROPIC_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** 疗愈Agent全局实例（调试用） */
interface Window {
  __HEALING_AGENT__?: {
    lifecycleManager: import('@/core/LifecycleManager').LifecycleManager
    animController: import('@/core/AvatarAnimationController').AvatarAnimationController
    autoExitMgr: import('@/core/AutoExitManager').AutoExitManager
    store: ReturnType<typeof import('@/stores/appStore').useAppStore>
    asrEngine: import('@/services/asrTypes').IASREngine
    ttsEngine: import('@/services/TTSEngine').TTSEngine
    voiceInteraction: import('@/services/VoiceInteractionManager').VoiceInteractionManager
    emotionEngine: import('@/services/EmotionRecognition').EmotionRecognitionEngine
    healingService: import('@/services/HealingService').HealingService
    profileEngine: import('@/services/ProfileEngine').ProfileEngine
    styleAdapter: import('@/services/StyleAdapter').StyleAdapter
    dataStore: import('@/services/DataStore').DataStore
    oemConfig: import('@/services/OEMConfig').OEMConfig
    globalErrorHandler: import('@/core/GlobalErrorHandler').GlobalErrorHandler
    audioPriorityMgr: import('@/core/AudioPriorityManager').AudioPriorityManager
    modelHub: import('@/core/ModelHub').ModelHub
    strategyEngine: import('@/core/StrategyEngine').StrategyEngine
    promptManager: import('@/services/PromptManager').PromptManager
    contextManager: import('@/core/ContextManager').ContextManager
  }
}
