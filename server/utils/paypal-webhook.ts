/**
 * PayPal Webhook 签名验证
 *
 * ⚠️ 不验证签名 = 任何人都能伪造「用户已付款」事件来白嫖额度。
 *    这个文件必须在处理任何业务逻辑**之前**跑。
 *
 * ⚠️ 2026-10-22 改成「用 PayPal 官方验签 API」：
 *   之前是自己取 cert url 的 X.509 证书、本地拼消息本地验签。
 *   实测**真实事件的本地验签一直失败**（signature mismatch），
 *   官方 API 却是 SUCCESS —— 说明我们本地拼消息/取字节的细节跟 PayPal
 *   实际签的不一致（body 字节、resource id、证书轮换都可能踩坑）。
 *   PayPal 官方推荐的服务器端验签就是 verify-webhook-signature API，
 *   由 PayPal 自己算，省掉一整类「自己实现错了」的问题。
 *   本地验签保留为**降级方案**（官方 API 调不通时才用）。
 *
 * 官方验签 API：POST /v1/notifications/verify-webhook-signature
 *   body: { transmission_id, transmission_time, webhook_id, webhook_event,
 *           cert_url, auth_algo, transmission_sig }
 *   返回: { verification_status: 'SUCCESS' | 'FAILURE' }
 *
 * 参考：https://developer.paypal.com/api/rest/webhooks/rest/#verify-webhook-signature
 */
import { createPublicKey } from 'node:crypto'
import { getPayPalConfig, getAccessToken } from './paypal'

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

  // ── 首选：PayPal 官方验签 API（由 PayPal 自己算，最可靠）──
  try {
    const cfg = getPayPalConfig()
    const token = await getAccessToken()
    const res = await fetch(`${cfg.base}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        // ⚠️ webhook_event 传**对象**（沙箱 API 收对象，传字符串会 400）
        webhook_event: eventBody,
        cert_url: certUrl,
        auth_algo: authAlgo || 'SHA256withRSA',
        transmission_sig: transmissionSig,
      }),
    })
    const json: any = await res.json().catch(() => null)
    if (res.ok && json?.verification_status === 'SUCCESS') {
      return { ok: true }
    }
    if (res.ok) {
      // PayPal 明确说验签不通过 → 直接拒，不要再本地试
      return { ok: false, reason: `paypal verification_status=${json?.verification_status}` }
    }
    // API 本身出错（5xx / 网络）→ 降级到本地验签
    console.warn('[PayPal Webhook] 官方验签 API 不可用，降级到本地验签:', res.status)
  } catch (e: any) {
    console.warn('[PayPal Webhook] 官方验签 API 调用失败，降级到本地验签:', e?.message)
  }

  // ── 降级：本地 X.509 验签 ──
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
