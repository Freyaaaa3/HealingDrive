import { ASREngine } from './ASREngine'
import { IFlyTekASREngine } from './IFlyTekASREngine'
import { LocalASREngine } from './LocalASREngine'
import type { IASREngine } from './asrTypes'

/**
 * ASR 引擎工厂
 *
 * 优先顺序：
 *   1. VITE_ASR_PROVIDER=local       → 本地 Vosk 离线 ASR（WebSocket）
 *   2. VITE_ASR_PROVIDER=iflytek     → 讯飞流式听写（国内可用，需凭据）
 *   3. 默认                          → 浏览器 Web Speech API（需 Google 服务）
 *
 * 环境变量配置：
 *   VITE_ASR_PROVIDER  = local | iflytek | (留空)
 *   VITE_ASR_WS_URL    = ws://127.0.0.1:5124   （local 模式，可选）
 *   VITE_IFLYTEK_*     = 讯飞凭据              （iflytek 模式，必填）
 */
export function createAsrEngine(): IASREngine {
  const provider = (import.meta.env.VITE_ASR_PROVIDER || '').toLowerCase().trim()

  // ---------- 1. 本地离线 ASR（Vosk） ----------
  if (provider === 'local') {
    const local = new LocalASREngine()
    if (local.init()) return local
    console.warn('[ASR] 本地 ASR 引擎初始化失败，尝试其他方案')
  }

  // ---------- 2. 讯飞流式听写 ----------
  const hasIfly =
    !!(import.meta.env.VITE_IFLYTEK_APP_ID || '').trim() &&
    !!(import.meta.env.VITE_IFLYTEK_API_KEY || '').trim() &&
    !!(import.meta.env.VITE_IFLYTEK_API_SECRET || '').trim()

  if (provider === 'iflytek' && hasIfly) {
    const xf = new IFlyTekASREngine()
    if (xf.init()) return xf
    console.warn('[ASR] 讯飞引擎初始化失败，回退到浏览器语音识别')
  } else if (provider === 'iflytek' && !hasIfly) {
    console.warn('[ASR] 已选择 iflytek 但未配置完整 VITE_IFLYTEK_*，回退到浏览器语音识别')
  }

  // ---------- 3. 兜底：浏览器 Web Speech API ----------
  const web = new ASREngine()
  web.init()
  return web
}
