/**
 * POST /api/ops/paypal-probe — PayPal 生产环境临时探针
 *
 * ⚠️⚠️ **这是临时端点，验完就删**（2026-10-22）
 *
 * 为什么需要它：
 *   沙箱里做不了 Firebase 登录（identitytoolkit.googleapis.com 被出口代理挡了），
 *   所以「线上 worker 到底能不能用 live 凭据打 api-m.paypal.com」没法直接验。
 *   这个端点跑在 Cloudflare 网络里，用生产环境真实的 process.env 去调 PayPal，
 *   一次性把「变量注入 + 出网 + 主机选对 + plan id 对不对」全验掉。
 *
 * 鉴权：X-Ops-Secret 匹配 OPS_ALERT_SECRET（跟 /api/ops/alert 同一套）。
 *
 * action:
 *   status   → 环境变量状态 + token 往返 + live 侧 plan/product 列表（只读）
 *   order    → 真实建一笔 live 订单（$6.99，未批准 = 不动钱），返回 approve 链接
 *   capture  → capture 指定的 order id（真扣款）
 *   refund   → 退掉指定的 capture（把钱还回去）
 *   sub      → 用环境变量里的 live plan id 建一个订阅（验 PAYPAL_CREATOR_PLAN_ID）
 */
import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { envString } from '../../utils/env'
import {
  getPayPalConfig,
  isPayPalConfigured,
  getAccessToken,
  paypalGet,
  paypalPost,
  createOrder,
  createSubscription,
  findLink,
} from '../../utils/paypal'

/** 简易常量时间比较 */
function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** 只回显 client id 的头尾，中间打码 */
function mask(v: string): string {
  if (!v) return '(空)'
  if (v.length <= 14) return v.slice(0, 4) + '****'
  return `${v.slice(0, 10)}****${v.slice(-4)} (${v.length} 字符)`
}

export default defineEventHandler(async (event) => {
  // ── 鉴权 ──────────────────────────────────────────────
  const secret = envString(event, 'OPS_ALERT_SECRET', '')
  const provided = String(getHeader(event, 'x-ops-secret') || '')
  if (!safeEqual(provided, secret)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or missing X-Ops-Secret' })
  }

  const body = await readBody(event).catch(() => ({}) as any)
  const action = String(body?.action || 'status')
  const cfg = getPayPalConfig()

  // ── status：环境 + 出网 + live 资源 ─────────────────────
  if (action === 'status') {
    const out: any = {
      configured: isPayPalConfigured(),
      isSandbox: cfg.isSandbox,
      // ⚠️ 注意：isSandbox 必须是 false，否则线上打的是沙箱主机
      clientId: mask(cfg.clientId),
      hasSecret: !!cfg.clientSecret,
      planIdEnv: process.env.PAYPAL_CREATOR_PLAN_ID || '(未设置)',
      webhookIdEnv: process.env.PAYPAL_WEBHOOK_ID || '(未设置)',
      sandboxFlagRaw: process.env.PAYPAL_SANDBOX ?? '(未设置)',
      apiBase: cfg.isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com',
    }
    try {
      const token = await getAccessToken()
      out.tokenOk = !!token
      out.tokenLength = token.length
    } catch (e: any) {
      out.tokenOk = false
      out.tokenError = String(e?.message || e).slice(0, 300)
    }
    try {
      const plans = await paypalGet<any>('/v1/billing/plans?page_size=20')
      out.livePlans = (plans?.plans || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        product: p.product_id,
      }))
      const envPlan = process.env.PAYPAL_CREATOR_PLAN_ID
      out.envPlanExistsInLive =
        !!envPlan && (plans?.plans || []).some((p: any) => p.id === envPlan)
    } catch (e: any) {
      out.plansError = String(e?.message || e).slice(0, 300)
    }
    try {
      const products = await paypalGet<any>('/v1/catalogs/products?page_size=20')
      out.liveProducts = (products?.products || []).map((p: any) => ({
        id: p.id,
        name: p.name,
      }))
    } catch (e: any) {
      out.productsError = String(e?.message || e).slice(0, 300)
    }
    return out
  }

  // ── order：真实建一笔 live 订单（未批准 = 不动钱）──────
  if (action === 'order') {
    const order = await createOrder({
      amount: String(body?.amount || '6.99'),
      currency: 'USD',
      description: 'Create Keepsakes — One card',
      returnUrl: 'https://create.yozzytools.com/pricing?paid=1',
      cancelUrl: 'https://create.yozzytools.com/pricing?cancelled=1',
      referenceId: 'ops-probe',
    })
    return {
      orderId: order?.id,
      status: order?.status,
      approveUrl: findLink(order?.links, 'approve'),
      links: order?.links,
    }
  }

  // ── sub：用 env 里的 live plan id 建订阅 ───────────────
  if (action === 'sub') {
    const planId = process.env.PAYPAL_CREATOR_PLAN_ID || ''
    if (!planId) throw createError({ statusCode: 400, statusMessage: 'PAYPAL_CREATOR_PLAN_ID not set' })
    const sub = await createSubscription(
      planId,
      'https://create.yozzytools.com/pricing?paid=1',
      'https://create.yozzytools.com/pricing?cancelled=1',
    )
    return {
      subscriptionId: sub?.id,
      status: sub?.status,
      planId: sub?.plan_id,
      approveUrl: findLink(sub?.links, 'approve'),
    }
  }

  // ── capture：真扣款 ───────────────────────────────────
  if (action === 'capture') {
    const orderId = String(body?.orderId || '')
    if (!orderId) throw createError({ statusCode: 400, statusMessage: 'orderId required' })
    const r = await paypalPost<any>(`/v2/checkout/orders/${orderId}/capture`, null)
    return {
      id: r?.id,
      status: r?.status,
      amount: r?.purchase_units?.[0]?.amount,
      captureId: r?.purchase_units?.[0]?.payments?.captures?.[0]?.id,
      captureStatus: r?.purchase_units?.[0]?.payments?.captures?.[0]?.status,
    }
  }

  // ── refund：把钱还回去 ───────────────────────────────
  if (action === 'refund') {
    const captureId = String(body?.captureId || '')
    if (!captureId) throw createError({ statusCode: 400, statusMessage: 'captureId required' })
    const r = await paypalPost<any>(`/v2/payments/captures/${captureId}/refund`, {
      amount: body?.amount ? { currency_code: 'USD', value: String(body.amount) } : undefined,
    })
    return { id: r?.id, status: r?.status, amount: r?.amount }
  }

  throw createError({ statusCode: 400, statusMessage: `unknown action: ${action}` })
})
