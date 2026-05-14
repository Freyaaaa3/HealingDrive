/**
 * 生命周期管理器
 * 负责车辆上电自启动、座舱休眠暂停、下电销毁等整车生命周期管理
 * 以及系统资源不足时的延迟启动逻辑
 */
import { InitPhase, RunMode, AppState, ConversationPhase } from '@/types'
import { INIT_DELAY_ON_LOW_RESOURCE } from '@/config/constants'
import { PermissionManager } from './PermissionManager'
import { ResourceLoader } from './ResourceLoader'
import { WakeListener } from './WakeListener'
import { useAppStore } from '@/stores/appStore'

export class LifecycleManager {
  private permissionManager: PermissionManager
  private resourceLoader: ResourceLoader
  private wakeListener: WakeListener
  private store: ReturnType<typeof useAppStore>

  private isRunning: boolean = false

  constructor(store: ReturnType<typeof useAppStore>) {
    this.store = store
    this.permissionManager = new PermissionManager()
    this.resourceLoader = new ResourceLoader()
    this.wakeListener = new WakeListener()
  }

  /**
   * 主入口：车辆上电/座舱启动时自动调用
   * 执行完整初始化流程
   */
  async startup(): Promise<void> {
    if (this.isRunning) {
      console.warn('[LifecycleManager] 已经在运行中，忽略重复启动请求')
      return
    }

    console.log('========================================')
    console.log('[LifecycleManager] 智能座舱疗愈Agent 启动中...')
    console.log('========================================')

    this.store.setStartTime(Date.now())

    try {
      // 步骤1: 检查系统资源，不足则延迟启动
      await this.checkSystemResources()

      // 步骤2: 权限校验
      this.store.setInitPhase(InitPhase.PERMISSION_CHECK)
      const { states, runMode } = await this.permissionManager.checkAllPermissions()
      this.store.setPermissions(states)
      this.store.setRunMode(runMode)

      // 如果是最小化模式（无麦克风），直接进入降级待命
      if (runMode === RunMode.MINIMAL) {
        console.warn('[LifecycleManager] 缺少必要权限，进入最小化模式')
        this.store.setInitPhase(InitPhase.DEGRADED)
        this.enterDegradedStandby()
        return
      }

      // 步骤3: 资源预加载
      this.store.setInitPhase(InitPhase.RESOURCE_LOADING)
      const resourceState = await this.resourceLoader.preloadAll()
      this.store.setResourceState(resourceState)

      // 步骤4: 启动唤醒监听
      this.store.setInitPhase(InitPhase.WAKE_LISTENING)
      const listenStarted = this.wakeListener.start(this.handleWakeDetected.bind(this))
      
      if (!listenStarted) {
        throw new Error('唤醒监听启动失败')
      }

      // 更新状态
      this.store.setReady(true)
      this.store.setWakeStatus(this.wakeListener.getStatus())
      this.store.setInitPhase(runMode === RunMode.FULL ? InitPhase.WAKE_LISTENING : InitPhase.DEGRADED)

      this.isRunning = true

      console.log('========================================')
      console.log('[LifecycleManager] ✓ 初始化完成，进入后台待命状态')
      console.log(`  运行模式: ${runMode}`)
      console.log(`  唤醒词: 小疗同学`)
      console.log('========================================')

      // 注册座舱事件监听
      this.registerCabinEvents()

    } catch (error) {
      console.error('[LifecycleManager] 初始化失败:', error)
      this.store.setError(error instanceof Error ? error.message : '未知错误')
      this.store.setInitPhase(InitPhase.ERROR)
      
      // 尝试降级运行
      this.enterDegradedStandby()
    }
  }

  /**
   * 检查系统资源，必要时延迟启动
   */
  private async checkSystemResources(): Promise<void> {
    this.store.setInitPhase(InitPhase.STARTING)

    // 简单的资源检测：如果内存压力大，延迟启动
    if ((navigator as any).deviceMemory && (navigator as any).deviceMemory < 2) {
      console.warn(`[LifecycleManager] 系统资源较低(${(navigator as any).deviceMemory}GB)，延迟启动...`)
      await this.delay(INIT_DELAY_ON_LOW_RESOURCE)
    }
  }

  /**
   * 进入降级待命状态
   */
  private enterDegradedStandby(): void {
    console.log('[LifecycleManager] 进入降级运行模式')
    
    // 即使降级，也尽量启动基础监听（如果有麦克风的话）
    if (this.permissionManager.hasMicrophoneAccess()) {
      this.wakeListener.start(this.handleWakeDetected.bind(this))
    }
    
    this.isRunning = true
  }

  /**
   * 唤醒词检测回调
   */
  private handleWakeDetected(): void {
    console.log('[LifecycleManager] 收到唤醒信号!')
    this.store.setWakeStatus('detected' as any)
    
    // TODO: 后续模块实现：拉起虚拟形象，进入交互状态
    // 此处预留接口供后续模块扩展
    this.emit('wake-detected')
  }

  /**
   * 注册座舱生命周期事件
   */
  private registerCabinEvents(): void {
    // 页面可见性变化（座舱屏幕开关/切换应用）
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleCabinSleep()
      } else {
        this.handleCabinWakeUp()
      }
    })

    // 页面卸载（下电/强制关闭）
    window.addEventListener('beforeunload', () => {
      this.shutdown()
    })

    // 监听浏览器后台限制（某些座舱系统可能会节流后台标签页）
    document.addEventListener('freeze', () => {
      this.handleCabinSleep()
    }, { once: true })

    document.addEventListener('resume', () => {
      this.handleCabinWakeUp()
    }, { once: true })
  }

  /**
   * 处理座舱休眠/屏幕熄灭
   */
  private handleCabinSleep(): void {
    console.log('[LifecycleManager] 座舱休眠，暂停监听并释放部分资源')
    this.wakeListener.pause()
  }

  /**
   * 处理座舱唤醒/屏幕点亮
   */
  private handleCabinWakeUp(): void {
    console.log('[LifecycleManager] 座舱唤醒，恢复待命状态')
    // 如果 VoiceInteraction 正在活跃（对话阶段非IDLE），不恢复唤醒词监听
    // 避免 WakeListener 与 ASREngine 抢占麦克风
    if (this.store.conversationPhase !== ConversationPhase.IDLE) {
      console.log('[LifecycleManager] 对话系统活跃中，跳过唤醒词监听恢复')
      return
    }
    this.wakeListener.resume()
    this.store.setWakeStatus(this.wakeListener.getStatus())
  }

  /**
   * 下电/完全关闭
   */
  shutdown(): void {
    console.log('[LifecycleManager] 关闭疗愈Agent服务...')

    this.wakeListener.stop()
    this.isRunning = false

    this.store.$reset()
    
    console.log('[LifecycleManager] 服务已停止')
  }

  /**
   * 获取权限管理器（供其他模块使用）
   */
  getPermissionManager(): PermissionManager {
    return this.permissionManager
  }

  /**
   * 获取资源加载器（供其他模块使用）
   */
  getResourceLoader(): ResourceLoader {
    return this.resourceLoader
  }

  /**
   * 获取唤醒监听器（供其他模块使用）
   */
  getWakeListener(): WakeListener {
    return this.wakeListener
  }

  /**
   * 简单延时工具
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /** 
   * 简单事件发射器（后续可替换为EventBus） 
   */
  private emit(event: string, data?: any): void {
    // TODO: 后续可实现完整的EventBus
    console.log(`[LifecycleManager] Event emitted: ${event}`, data)
  }
}
