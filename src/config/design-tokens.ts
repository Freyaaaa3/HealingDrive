/**
 * UI设计系统令牌
 * 
 * 设计融合：苹果原生UI设计语言 + 蔚来汽车助手面板视觉规范
 * - 极简留白、毛玻璃磨砂、低饱和渐变
 * - 圆润圆角、轻量化动效
 * - 车载居中聚焦、无干扰设计
 */
import { DesignTokens } from '@/types'

/** 全局设计变量 */
export const designTokens: DesignTokens = {
  // ==================== 色彩体系 ====================
  colors: {
    // 主色系：柔和雾霾蓝（莫兰迪低饱和）
    primary: '#7B9EC8',                    // 柔和雾霾蓝
    primaryLight: '#B4CDE5',               // 主色浅色（hover/微光）
    primaryGlow: 'rgba(123, 158, 200, 0.25)',  // 呼吸发光效果
    
    // 文字色系：深灰黑非纯黑（苹果阅读舒适感）
    textPrimary: '#1C1C1E',                // 主文字（接近纯黑但不刺眼）
    textSecondary: '#8E8E93',              // 次要文字
    textMuted: '#AEAEB2',                  // 弱化文字

    // 背景色系：苹果毛玻璃磨砂白
    bgGlass: 'rgba(255, 255, 255, 0.72)',   // 毛玻璃背景（75%通透）
    bgGlassHover: 'rgba(255, 255, 255, 0.85)', // 悬浮态背景

    // 状态色系：低调柔和不刺眼
    stateIdle: 'rgba(174, 174, 178, 0.6)',     // 待机：浅灰微光
    stateListening: 'rgba(123, 158, 200, 0.5)', // 倾听：淡蓝呼吸光
    stateSpeaking: 'rgba(107, 168, 165, 0.5)',  // 说话：淡青柔光
    stateHealing: 'rgba(167, 147, 193, 0.45)',  // 疗愈：淡紫柔光
  },

  // ==================== 圆角规范（苹果大圆角）====================
  radius: {
    panel: '28px',      // 悬浮面板整体圆角 28dp
    card: '16px',       // 内部卡片圆角 16dp
    button: '12px',     // 按钮/标签圆角 12dp
  },

  // ==================== 毛玻璃模糊强度 ====================
  blur: {
    glass: '40px',      // 中度模糊，保留壁纸轮廓又不杂乱
  },

  // ==================== 阴影规范 ====================
  shadow: {
    panel: '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
  },
}

/** 动画时间常量 */
export const ANIMATION = {
  /** 面板进入动画时长 (ms) */
  PANEL_ENTER: 600,
  /** 面板退出动画时长 (ms) */
  PANEL_EXIT: 450,
  /** 待机呼吸周期 (ms) - 缓慢节奏不打扰驾驶 */
  IDLE_BREATHING: 3000,
  /** 倾听点头周期 (ms) */
  LISTEN_NOD: 1500,
  /** 说话嘴动频率 (ms) */
  SPEAK_MOUTH: 300,
  /** 疗愈光效周期 (ms) */
  HEALING_GLOW: 2500,
  /** 状态文字渐变时长 (ms) */
  TEXT_FADE: 300,
} as const

/** 虚拟形象尺寸规范 */
export const AVATAR_SIZE = {
  DEFAULT_WIDTH: 200,       // 默认宽度(px)
  DEFAULT_HEIGHT: 260,      // 默认高度(px)
  MIN_SCALE: 0.6,           // 最小缩放比例（小屏适配）
  MAX_SCALE: 1.2,           // 最大缩放比例
} as const

/** 面板布局尺寸 */
export const PANEL_SIZE = {
  WIDTH_RATIO: 0.85,        // 面板占屏幕宽度比例
  MAX_WIDTH: 520,           // 最大宽度(px)
  MIN_HEIGHT: 400,          // 最小高度(px)
  PADDING_X: 48,            // 水平内边距
  PADDING_Y: 36,            // 垂直内边距
} as const

/** 层级z-index规范 */
export const Z_INDEX = {
  BASE: 100,                // 基础层级
  PANEL: 1000,              // 疗愈面板层级
  DEBUG_PANEL: 9999,        // 调试面板层级
} as const
