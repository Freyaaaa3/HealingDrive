/**
 * 虚拟形象动画状态机控制器
 * 
 * 统一管理虚拟形象的三种核心动效状态切换：
 * - IDLE: 待机呼吸浮动
 * - LISTENING: 倾听点头/侧耳
 * - SPEAKING: 说话嘴部微动+肢体
 * - HEALING: 疗愈光效
 * 
 * 提供状态转换守卫、回调通知、降级策略
 */
import { AvatarState } from '@/types'
import { ANIMATION } from '@/config/design-tokens'

type StateChangeCallback = (from: AvatarState, to: AvatarState) => void

export class AvatarAnimationController {
  private currentState: AvatarState = AvatarState.HIDDEN
  private listeners: Set<StateChangeCallback> = new Set()
  
  constructor() {}

  /** 获取当前状态 */
  getState(): AvatarState {
    return this.currentState
  }

  /**
   * 切换到指定状态（带状态机守卫）
   * 返回是否成功切换
   */
  transitionTo(targetState: AvatarState): boolean {
    const previousState = this.currentState

    // 状态机守卫：检查合法转换路径
    if (!this.isValidTransition(previousState, targetState)) {
      console.warn(`[AvatarController] 非法状态转换: ${previousState} -> ${targetState}`)
      return false
    }

    this.currentState = targetState
    console.log(`[AvatarController] 状态转换: ${previousState} -> ${targetState}`)

    // 通知所有监听者
    this.listeners.forEach(cb => cb(previousState, targetState))
    
    return true
  }

  /**
   * 快捷方法：显示形象并进入待机态
   */
  show(): boolean {
    if (this.currentState === AvatarState.HIDDEN) {
      return this.transitionTo(AvatarState.IDLE)
    }
    return false
  }

  /** 快捷方法：进入倾听状态 */
  startListening(): boolean {
    return this.transitionTo(AvatarState.LISTENING)
  }

  /** 快捷方法：进入说话状态 */
  startSpeaking(): boolean {
    return this.transitionTo(AvatarState.SPEAKING)
  }

  /** 快捷方法：进入疗愈状态 */
  startHealing(): boolean {
    return this.transitionTo(AvatarState.HEALING)
  }

  /** 快捷方法：回到待机状态 */
  backToIdle(): boolean {
    return this.transitionTo(AvatarState.IDLE)
  }

  /** 快捷方法：隐藏形象 */
  hide(): boolean {
    if (this.currentState !== AvatarState.HIDDEN) {
      return this.transitionTo(AvatarState.HIDDEN)
    }
    return false
  }

  /**
   * 注册状态变更监听器
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.listeners.add(callback)
    // 返回取消订阅函数
    return () => this.listeners.delete(callback)
  }

  /**
   * 清除所有监听器
   */
  removeAllListeners(): void {
    this.listeners.clear()
  }

  /**
   * 获取当前状态的动画参数
   */
  getAnimationParams(): { duration: number; cssClass: string; label: string } {
    switch (this.currentState) {
      case AvatarState.IDLE:
        return {
          duration: ANIMATION.IDLE_BREATHING,
          cssClass: 'avatar-idle',
          label: '',
        }
      case AvatarState.LISTENING:
        return {
          duration: ANIMATION.LISTEN_NOD,
          cssClass: 'avatar-listening',
          label: '聆听中...',
        }
      case AvatarState.SPEAKING:
        return {
          duration: ANIMATION.SPEAK_MOUTH,
          cssClass: 'avatar-speaking',
          label: '',
        }
      case AvatarState.HEALING:
        return {
          duration: ANIMATION.HEALING_GLOW,
          cssClass: 'avatar-healing',
          label: '',
        }
      case AvatarState.HIDDEN:
      default:
        return { duration: 0, cssClass: '', label: '' }
    }
  }

  /**
   * 状态转换合法表
   * HIDDEN -> IDLE（唤醒拉起）
   * IDLE <-> LISTENING <-> SPEAKING（对话循环）
   * IDLE/SPEAKING/LISTENING -> HEALING（疗愈模式）
   * HEALING -> IDLE（疗愈结束）
   * 任意 -> HIDDEN（收起隐藏）
   */
  private isValidTransition(from: AvatarState, to: AvatarState): boolean {
    // 任何状态都可以回到HIDDEN（收起）
    if (to === AvatarState.HIDDEN) return true

    // 只有从HIDDEN才能到IDLE（首次唤醒）
    if (to === AvatarState.IDLE && from === AvatarState.HIDDEN) return true

    // IDLE可以到LISTENING或HEALING
    if (from === AvatarState.IDLE) {
      return [AvatarState.LISTENING, AvatarState.SPEAKING, AvatarState.HEALING].includes(to)
    }

    // LISTENING可以到SPEAKING或IDLE或HEALING
    if (from === AvatarState.LISTENING) {
      return [AvatarState.SPEAKING, AvatarState.IDLE, AvatarState.HEALING].includes(to)
    }

    // SPEAKING可以到LISTENING或IDLE或HEALING
    if (from === AvatarState.SPEAKING) {
      return [AvatarState.LISTENING, AvatarState.IDLE, AvatarState.HEALING].includes(to)
    }

    // HEALING只能回IDLE
    if (from === AvatarState.HEALING && to === AvatarState.IDLE) return true

    return false
  }
}
