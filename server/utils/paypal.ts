/**
 * PayPal REST API 封装
 *
 * ⚠️ 两个环境的差别只有 base URL 和凭据 —— 代码路径完全一样 ✅
 *   沙箱：https://api-m.sandbox.paypal.com
 *   正式：https://api-m.paypal.com
 *
 * 用法：
 *   import { getPayPalConfig, paypalGet, paypalPost } from '~/server/utils/paypal'
 *
 * 沙箱账号 / 凭据怎么拿见 docs/paypal-setup.md
 */

const SANDBOX_BASE = 'https://api-m.sandbox.paypal.com'
const LIVE_BASE = 'https://api-m.paypal.com'

export interface PayPalConfig {
  clientId: string
  clientSecret: string
  base: string
  isSandbox: boolean
}

/**
 * 读配置。
 * PAYPAL_SANDBOX 显式控制；没设时按「有 client id 就当沙箱」——
 * 因为没上线的项目默认都在沙箱测，比反过来更安全。
 */
export function getPayPalConfig(): PayPalConfig {
  const clientId = process.env.PAYPAL_CLIENT_ID || ''
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || ''
  const explicit = process.env.PAYPAL_SANDBOX
  const isSandbox = explicit ? explicit === 'true' : true

  return {
    clientId,
    clientSecret,
    base: isSandbox ? SANDBOX_BASE : LIVE_BASE,
    isSandbox,
  }
}

export function isPayPalConfigured(): boolean {
  const c = getPayPalConfig()
  return !!c.clientId && !!c.clientSecret
}

// ── OAuth token 缓存 ─────────────────────────────────────
// token 有效期约 9 小时（32400 秒），提前 5 分钟过期。
// 每次请求都去换 token 会打爆 PayPal 的限流。
let cachedToken: { token: string; expiresAt: number } | null = null

export async function getAccessToken(): Promise<string> {
  const cfg = getPayPalConfig()
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Error('PayPal not configured: PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET missing')
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')
  const res = await fetch(`${cfg.base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`PayPal OAuth failed (${res.status}): ${text.slice(0, 300)}`)
  }

  const json = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + Math.max(60, json.expires_in - 300) * 1000,
  }
  console.log(`[paypal] got access token (sandbox=${cfg.isSandbox}, expires in ${json.expires_in}s)`)
  return cachedToken.token
}

async function request<T>(method: string, path: string, body?: any): Promise<T> {
  const cfg = getPayPalConfig()
  const token = await getAccessToken()
  const res = await fetch(`${cfg.base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(method === 'POST' ? { 'PayPal-Request-Id': crypto.randomUUID() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let json: any = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    /* 非 JSON 响应 */
  }

  if (!res.ok) {
    const detail =
      json?.details?.[0]?.description || json?.message || text.slice(0, 300)
    const err = new Error(`PayPal ${method} ${path} failed (${res.status}): ${detail}`)
    ;(err as any).status = res.status
    ;(err as any).paypalBody = json
    throw err
  }
  return json as T
}

export const paypalGet = <T = any>(path: string) => request<T>('GET', path)
export const paypalPost = <T = any>(path: string, body?: any) => request<T>('POST', path, body)
export const paypalPatch = <T = any>(path: string, body?: any) => request<T>('PATCH', path, body)
export const paypalDelete = <T = any>(path: string) => request<T>('DELETE', path)

/**
 * 从 PayPal 响应里取某个 rel 的链接（H3/approve）
 *
 * ⚠️ rel 名字有两种，取决于下单时用的是哪套字段：
 *   - 旧写法（application_context）→ rel = 'approve'
 *   - 新写法（payment_source.paypal）→ rel = 'payer-action'
 *   两个都找，否则会拿到 undefined。
 */
export function findLink(links: any[] | undefined, rel: string): string | null {
  if (!links) return null
  const hit = links.find((l) => l?.rel === rel)
  if (hit) return hit.href || null
  if (rel === 'approve') {
    const alt = links.find((l) => l?.rel === 'payer-action')
    if (alt) return alt.href || null
  }
  if (rel === 'payer-action') {
    const alt = links.find((l) => l?.rel === 'approve')
    if (alt) return alt.href || null
  }
  return null
}

// ── 一次性支付：Orders v2 ────────────────────────────────

export interface CreateOrderInput {
  amount: string
  currency?: string
  description: string
  /** 回跳地址（PayPal 批准后带 orderId 回来） */
  returnUrl?: string
  cancelUrl?: string
  /** 自定义 id，方便 webhook 里对账 */
  referenceId?: string
}

export async function createOrder(input: CreateOrderInput) {
  const cfg = getPayPalConfig()
  return paypalPost<any>('/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: input.referenceId || undefined,
        description: input.description.slice(0, 127),
        amount: {
          currency_code: input.currency || 'USD',
          value: input.amount,
        },
      },
    ],
    // ⚠️ 只能用 payment_source.paypal.experience_context，**不能**再带 application_context。
    //    两个都发 PayPal 会判「字段冗余/冲突」直接 422：
    //      UNPROCESSABLE_ENTITY
    //      field: /payment_source/paypal/experience_context/brand_name
    //      issue: INCOMPATIBLE_PARAMETER_VALUE
    //    （application_context 是旧写法，payment_source 才是现在推荐的）
    payment_source: {
      paypal: {
        experience_context: {
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
          brand_name: 'Create Keepsakes',
          ...(input.returnUrl
            ? {
                return_url: input.returnUrl,
                cancel_url: input.cancelUrl || input.returnUrl,
              }
            : {}),
        },
      },
    },
  })
}

export async function captureOrder(orderId: string) {
  return paypalPost<any>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`)
}

export async function getOrder(orderId: string) {
  return paypalGet<any>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`)
}

// ── 订阅：Billing Subscriptions ──────────────────────────

export async function createSubscription(planId: string, returnUrl?: string, cancelUrl?: string) {
  return paypalPost<any>('/v1/billing/subscriptions', {
    plan_id: planId,
    application_context: {
      brand_name: 'Create Keepsakes',
      user_action: 'SUBSCRIBE_NOW',
      shipping_preference: 'NO_SHIPPING',
      ...(returnUrl ? { return_url: returnUrl, cancel_url: cancelUrl || returnUrl } : {}),
    },
  })
}

export async function getSubscription(subscriptionId: string) {
  return paypalGet<any>(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`)
}

/** 列账号下所有的产品 / 计划（自检脚本用） */
export async function listProducts() {
  return paypalGet<any>('/v1/catalogs/products?page_size=20')
}
export async function listPlans() {
  return paypalGet<any>('/v1/billing/plans?page_size=20')
}
