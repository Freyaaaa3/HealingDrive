/**
 * 权限管理器
 * 负责麦克风、摄像头、地图权限的校验与降级策略
 */
import { PermissionType, PermissionStatus, PermissionState, RunMode } from '@/types'

export class PermissionManager {
  private permissions: Map<PermissionType, PermissionStatus> = new Map()

  constructor() {
    this.permissions.set(PermissionType.MICROPHONE, PermissionStatus.NOT_AVAILABLE)
    this.permissions.set(PermissionType.CAMERA, PermissionStatus.NOT_AVAILABLE)
    this.permissions.set(PermissionType.MAP, PermissionStatus.NOT_AVAILABLE)
  }

  /**
   * 执行所有权限校验
   * 返回权限状态列表和降级后的运行模式
   */
  async checkAllPermissions(): Promise<{ states: PermissionState[], runMode: RunMode }> {
    console.log('[PermissionManager] 开始权限校验...')

    // 并行检查所有权限
    const results = await Promise.allSettled([
      this.checkMicrophone(),
      this.checkCamera(),
      this.checkMap(),
    ])

    // 处理结果
    const states: PermissionState[] = []
    
    if (results[0].status === 'fulfilled') {
      this.permissions.set(PermissionType.MICROPHONE, results[0].value)
      states.push({ type: PermissionType.MICROPHONE, status: results[0].value })
    }
    
    if (results[1].status === 'fulfilled') {
      this.permissions.set(PermissionType.CAMERA, results[1].value)
      states.push({ type: PermissionType.CAMERA, status: results[1].value })
    }
    
    if (results[2].status === 'fulfilled') {
      this.permissions.set(PermissionType.MAP, results[2].value)
      states.push({ type: PermissionType.MAP, status: results[2].value })
    }

    const runMode = this.calculateRunMode()
    console.log('[PermissionManager] 权限校验完成:', { states, runMode })

    return { states, runMode }
  }

  /**
   * 检查麦克风权限
   */
  private async checkMicrophone(): Promise<PermissionStatus> {
    try {
      // 检查浏览器是否支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('[PermissionManager] 浏览器不支持麦克风API')
        return PermissionStatus.NOT_AVAILABLE
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // 释放流（仅用于检测权限）
      stream.getTracks().forEach(track => track.stop())
      return PermissionStatus.GRANTED
    } catch (error) {
      console.warn('[PermissionManager] 麦克风权限被拒绝:', error)
      return PermissionStatus.DENIED
    }
  }

  /**
   * 检查摄像头权限
   */
  private async checkCamera(): Promise<PermissionStatus> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('[PermissionManager] 浏览器不支持摄像头API')
        return PermissionStatus.NOT_AVAILABLE
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())
      return PermissionStatus.GRANTED
    } catch (error) {
      console.warn('[PermissionManager] 摄像头权限被拒绝:', error)
      return PermissionStatus.DENIED
    }
  }

  /**
   * 检查地图权限（Geolocation API）
   */
  private async checkMap(): Promise<PermissionStatus> {
    try {
      if (!navigator.geolocation) {
        console.warn('[PermissionManager] 浏览器不支持地理位置API')
        return PermissionStatus.NOT_AVAILABLE
      }

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(PermissionStatus.GRANTED),
          (error) => {
            console.warn('[PermissionManager] 地图权限状态:', error.code)
            resolve(error.code === 1 ? PermissionStatus.DENIED : PermissionStatus.GRANTED)
          },
          { timeout: 2000 }
        )
      })
    } catch (error) {
      console.warn('[PermissionManager] 地图权限检查异常:', error)
      return PermissionStatus.NOT_AVAILABLE
    }
  }

  /**
   * 根据权限状态计算运行模式（降级策略）
   * 
   * 规则：
   * - 缺失麦克风：关闭所有疗愈交互能力
   * - 缺失摄像头：情绪识别自动降级为「语音 + 驾驶行为」双维度
   * - 缺失地图：关闭停车点推荐，其他能力不变
   */
  private calculateRunMode(): RunMode {
    const micStatus = this.permissions.get(PermissionType.MICROPHONE)
    const camStatus = this.permissions.get(PermissionType.CAMERA)
    const mapStatus = this.permissions.get(PermissionType.MAP)

    // 麦克风是必须的，没有则完全关闭交互
    if (micStatus !== PermissionStatus.GRANTED) {
      console.log('[PermissionManager] 降级：无麦克风，进入最小化模式')
      return RunMode.MINIMAL
    }

    // 摄像头缺失，剔除面部识别
    if (camStatus !== PermissionStatus.GRANTED) {
      console.log('[PermissionManager] 降级：无摄像头，禁用面部识别')
    }

    // 地图缺失，关闭停车推荐
    if (mapStatus !== PermissionStatus.GRANTED) {
      console.log('[PermissionManager] 降级：无地图权限，禁用停车推荐')
      return camStatus === PermissionStatus.GRANTED ? RunMode.NO_MAP : RunMode.NO_CAMERA
    }

    // 所有权限齐全或仅有摄像头缺失
    return camStatus === PermissionStatus.GRANTED ? RunMode.FULL : RunMode.NO_CAMERA
  }

  /**
   * 获取指定权限的当前状态
   */
  getPermissionStatus(type: PermissionType): PermissionStatus {
    return this.permissions.get(type) ?? PermissionStatus.NOT_AVAILABLE
  }

  /**
   * 检查是否有麦克风权限（基础交互必要条件）
   */
  hasMicrophoneAccess(): boolean {
    return this.getPermissionStatus(PermissionType.MICROPHONE) === PermissionStatus.GRANTED
  }

  /**
   * 检查是否有摄像头权限
   */
  hasCameraAccess(): boolean {
    return this.getPermissionStatus(PermissionType.CAMERA) === PermissionStatus.GRANTED
  }

  /**
   * 检查是否有地图权限
   */
  hasMapAccess(): boolean {
    return this.getPermissionStatus(PermissionType.MAP) === PermissionStatus.GRANTED
  }
}

// 解决循环依赖导入
import { RunMode as _RunMode } from '@/types'
const RunMode = _RunMode
