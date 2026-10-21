/**
 * PayPal Webhook 签名验证
 *
 * ⚠️ 不验证签名 = 任何人都能伪造「用户已付款」事件来白嫖额度。
 *    这个文件必须在处理任何业务逻辑**之前**跑。
 *
 * 验证流程（PayPal 官方要求）：
 *   1. 从 header 取 transmission id / time / sig / cert url / auth algo
 *   2. 用 cert url 拿 PayPal 的 X.509 证书
 *   3. 拼验证消息：
 *        transmissionId|transmissionTime|webhookId|webhookEvent|webhookResource
 *   4. 用证书里的公钥验签
 *
 * 参考：https://developer.paypal.com/api/rest/webhooks/rest/#verify-webhook-signature
 */
import { createPublicKey } from 'node:crypto'

export interface WebhookHeaders {
  'paypal-transmission-id'?: string
  'paypal-transmission-time'?: string
  'paypal-transmission-sig'?: string
  'paypal-cert-url'?: string
  'paypal-auth-algo'?: string
}

export interface WebhookVerifyResult {
  ok: boolean
  reason?: string
}

/** cert url 必须是 PayPal 自己的域名（防 SSRF 拿任意证书来签） */
function isTrustedCertUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    return (
      host === 'api.paypal.com' ||
      host === 'api-m.paypal.com' ||
      host === 'api.sandbox.paypal.com' ||
      host === 'api-m.sandbox.paypal.com' ||
      host.endsWith('.paypal.com')
    )
  } catch {
    return false
  }
}

/** PayPal 的 transmission sig 是 base64 */
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function verifyPayPalWebhook(
  headers: WebhookHeaders,
  webhookId: string,
  eventBody: any,
  rawBody?: string,
): Promise<WebhookVerifyResult> {
  const transmissionId = headers['paypal-transmission-id']
  const transmissionTime = headers['paypal-transmission-time']
  const transmissionSig = headers['paypal-transmission-sig']
  const certUrl = headers['paypal-cert-url']
  const authAlgo = headers['paypal-auth-algo']

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl) {
    return { ok: false, reason: 'missing signature headers' }
  }
  if (authAlgo && authAlgo !== 'SHA256withRSA') {
    return { ok: false, reason: `unsupported auth algo: ${authAlgo}` }
  }
  if (!isTrustedCertUrl(certUrl)) {
    return { ok: false, reason: `untrusted cert url: ${certUrl}` }
  }

  // ── 取证书 ──
  let pem: string
  try {
    const res = await fetch(certUrl)
    if (!res.ok) return { ok: false, reason: `cert fetch failed: ${res.status}` }
    pem = await res.text()
  } catch (e: any) {
    return { ok: false, reason: `cert fetch error: ${e?.message}` }
  }

  // ── 组装验证消息 ──
  // webhookEvent 是**原始请求体**字符串（不是重新序列化的 JSON！）
  const rawEvent =
    rawBody !== undefined
      ? rawBody
      : JSON.stringify(eventBody?.event ?? eventBody)

  const message = [
    transmissionId,
    transmissionTime,
    webhookId,
    rawEvent,
    eventBody?.resource?.id ?? '',
  ].join('|')

  // ── 验签 ──
  try {
    const publicKey = createPublicKey(pem)
    const spki = publicKey.export({ type: 'spki', format: 'der' }) as Buffer
    const key = await crypto.subtle.importKey(
      'spki',
      spki,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      b64ToBytes(transmissionSig) as unknown as ArrayBuffer,
      new TextEncoder().encode(message),
    )
    return valid ? { ok: true } : { ok: false, reason: 'signature mismatch' }
  } catch (e: any) {
    return { ok: false, reason: `verify error: ${e?.message}` }
  }
}

/**
 * 本地/沙箱没有配置 webhook id 时可以跳过验证（**仅限开发环境**）。
 * 生产环境必须返回 false —— 否则等于没有验证。
 */
export function shouldSkipVerification(env: string | undefined, webhookId: string | undefined): boolean {
  if (webhookId) return false
  return env !== 'production'
}
