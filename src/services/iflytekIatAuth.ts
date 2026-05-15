/**
 * 讯飞语音听写（流式版）WebSocket 握手鉴权
 * @see https://www.xfyun.cn/doc/asr/voicedictation/API.html
 */
export async function assembleXfyunIatWsUrlAsync(apiKey: string, apiSecret: string): Promise<string> {
  const hostUrl = 'wss://iat-api.xfyun.cn/v2/iat'
  const url = new URL(hostUrl)
  const host = url.host
  const date = new Date().toUTCString()
  const requestLine = `GET ${url.pathname} HTTP/1.1`
  const signatureOrigin = `host: ${host}\ndate: ${date}\n${requestLine}`
  const signature = await hmacSha256Base64(apiSecret, signatureOrigin)
  const authorizationOrigin =
    `api_key="${apiKey}", algorithm="hmac-sha256", ` +
    `headers="host date request-line", signature="${signature}"`
  const authorization = btoa(
    Array.from(new TextEncoder().encode(authorizationOrigin), (c) => String.fromCharCode(c)).join(''),
  )
  return `${hostUrl}?${new URLSearchParams({ authorization, date, host }).toString()}`
}

async function hmacSha256Base64(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  const bytes = new Uint8Array(sig)
  let binary = ''
  const step = 0x8000
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + step)))
  }
  return btoa(binary)
}
