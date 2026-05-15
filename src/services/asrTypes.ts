import type { ASRResult, ASRStatus } from '@/types'

/** 与 Web Speech 版 ASREngine 对齐，便于 VoiceInteractionManager 注入 */
export interface IASREngine {
  init(): boolean
  startListening(
    onFinalResult: (result: ASRResult) => void,
    onInterim?: (text: string) => void,
    onError?: (error: string) => void,
    onStatusChange?: (status: ASRStatus) => void,
  ): boolean
  stopListening(): void
  pause(): void
  resume(): void
  getStatus(): ASRStatus
  isActive(): boolean
  destroy(): void
}
