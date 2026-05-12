/**
 * 虚拟形象动效配置加载器
 *
 * 从 avatar-animation-config.json 加载所有动效状态参数，
 * 供前端 DebugPanel 和 AvatarAnimationController 使用。
 */
import animationConfigJson from '@/assets/avatar/animations/avatar-animation-config.json'

// Lottie JSON 资源的静态导入映射
import laughingData from '@/assets/avatar/animations/laughing.json'
import angryData from '@/assets/avatar/animations/angry.json'
import coolData from '@/assets/avatar/animations/cool.json'
import likeData from '@/assets/avatar/animations/like.json'
import surprisedData from '@/assets/avatar/animations/surprised.json'

/** Lottie JSON 数据映射表 */
const lottieDataMap: Record<string, object> = {
  laughing: laughingData,
  angry: angryData,
  cool: coolData,
  like: likeData,
  surprised: surprisedData,
}

// ==================== 类型定义 ====================

/** 单个动效的参数配置 */
export interface AnimationParams {
  /** 平移Y轴 */
  translateY?: { from: number; to: number; unit: string }
  /** 缩放 */
  scale?: { from: number; to: number }
  /** 旋转 */
  rotate?: { from: number; to: number; unit: string }
  /** 亮度 */
  brightness?: { from: number; to: number }
  /** 光晕颜色 */
  glowColor?: string
  /** 光晕缩放 */
  glowScale?: number | { from: number; to: number } | string
  /** 嘴巴张开高度(px) */
  mouthOpenHeight?: number
  /** 嘴巴张开宽度(px) */
  mouthOpenWidth?: number
  /** 疗愈粒子数 */
  particleCount?: number
  /** 粒子上浮范围 */
  particleFloatRange?: { from: number; to: number; unit: string }
  /** Lottie画布宽度 */
  lottieWidth?: number
  /** Lottie画布高度 */
  lottieHeight?: number
  /** 帧率 */
  frameRate?: number
  /** 总帧数 */
  totalFrames?: number
  /** 其他自定义参数 */
  [key: string]: unknown
}

/** 单个动效状态条目 */
export interface AnimationStateConfig {
  /** 状态ID */
  id: string
  /** 显示名称 */
  label: string
  /** 描述 */
  description: string
  /** Lottie文件路径（null表示使用CSS动画） */
  lottieFile: string | null
  /** CSS动画类名（null表示使用Lottie） */
  cssClass: string | null
  /** 动画周期(ms) */
  duration: number
  /** 缓动函数 */
  easing: string
  /** 是否循环 */
  loop: boolean
  /** 动画参数 */
  params: AnimationParams
}

/** 总配置文件结构 */
export interface AvatarAnimationConfig {
  version: string
  description: string
  avatarId: string
  avatarName: string
  baseSize: { width: number; height: number }
  animations: Record<string, AnimationStateConfig>
  animationOrder: string[]
}

// ==================== 模块实现 ====================

/** 缓存加载的配置 */
const config: AvatarAnimationConfig = animationConfigJson as AvatarAnimationConfig

/**
 * 获取完整的动效配置
 */
export function getAnimationConfig(): AvatarAnimationConfig {
  return config
}

/**
 * 获取指定状态的动效配置
 * @param stateId 状态ID（如 'idle', 'laughing' 等）
 */
export function getAnimationState(stateId: string): AnimationStateConfig | undefined {
  return config.animations[stateId]
}

/**
 * 获取所有动效状态列表（按 animationOrder 排序）
 */
export function getAnimationStateList(): AnimationStateConfig[] {
  return config.animationOrder
    .map(id => config.animations[id])
    .filter(Boolean)
}

/**
 * 判断某个状态是否使用 Lottie 动画
 */
export function isLottieState(stateId: string): boolean {
  const state = config.animations[stateId]
  return !!state?.lottieFile
}

/**
 * 判断某个状态是否使用 CSS 动画
 */
export function isCssState(stateId: string): boolean {
  const state = config.animations[stateId]
  return !!state?.cssClass
}

/**
 * 获取所有 Lottie 类型的动效状态
 */
export function getLottieStates(): AnimationStateConfig[] {
  return getAnimationStateList().filter(s => !!s.lottieFile)
}

/**
 * 获取所有 CSS 类型的动效状态
 */
export function getCssStates(): AnimationStateConfig[] {
  return getAnimationStateList().filter(s => !!s.cssClass)
}

/**
 * 获取 Lottie 动画的 JSON 资源路径
 * @param stateId 状态ID
 * @returns Lottie JSON文件的导入路径，或 null
 */
export function getLottieAssetPath(stateId: string): string | null {
  const state = config.animations[stateId]
  if (!state?.lottieFile) return null
  return state.lottieFile
}

/**
 * 获取 Lottie 动画的 JSON 数据对象
 * @param stateId 状态ID
 * @returns Lottie JSON 数据对象，或 null
 */
export function getLottieAnimationData(stateId: string): object | null {
  const state = config.animations[stateId]
  if (!state?.lottieFile) return null
  return lottieDataMap[stateId] ?? null
}

export default {
  getAnimationConfig,
  getAnimationState,
  getAnimationStateList,
  isLottieState,
  isCssState,
  getLottieStates,
  getCssStates,
  getLottieAssetPath,
  getLottieAnimationData,
}
