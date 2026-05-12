/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

/** 疗愈Agent全局实例（调试用） */
interface Window {
  __HEALING_AGENT__?: {
    lifecycleManager: import('@/core/LifecycleManager').LifecycleManager
    animController: import('@/core/AvatarAnimationController').AvatarAnimationController
    autoExitMgr: import('@/core/AutoExitManager').AutoExitManager
    store: ReturnType<typeof import('@/stores/appStore').useAppStore>
  }
}
