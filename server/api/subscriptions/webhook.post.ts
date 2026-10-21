/**
 * PayPal Webhook — 订阅 + 一次性支付事件
 *
 * ⚠️ 这个端点在 auth 中间件的公开白名单里（PayPal 服务器调它没有 token），
 *    所以**签名验证是唯一的安全边界** —— 验证不过必须直接拒绝，
 *    否则任何人都能伪造「用户已付款」来白嫖额度。
 *
 * 事件：
 *   BILLING.SUBSCRIPTION.ACTIVATED   → 订阅生效，发额度
 *   BILLING.SUBSCRIPTION.CANCELLED   → 用户主动取消
 *   BILLING.SUBSCRIPTION.SUSPENDED   → 扣款失败被暂停
 *   BILLING.SUBSCRIPTION.EXPIRED     → 到期未续，降级
 *   PAYMENT.CAPTURE.COMPLETED        → 一次性付款成功
 *   CHECKOUT.ORDER.COMPLETED         → Orders v2 付款成功
 */
import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getDB } from '../../utils/db-runtime'
import { verifyPayPalWebhook, shouldSkipVerification } from '../../utils/paypal-webhook'
import { PLANS, getPlan, resolvePlanId, type PlanId } from '../../../utils/pricing'

/**
 * PayPal 的 plan id → 我们内部的档位
 *
 * ⚠️ resource.plan_id 是 PayPal 的原始 id（P-XXXX），不是我们的档位名，
 *    拿它去查表永远查不到，只能瞎猜一个 5 张 —— 以前就是这样。
 *    现在用环境变量里配的 plan id 反查。
 */
function planIdForPayPalPlan(paypalPlanId: string): PlanId {
  const creator = process.env.PAYPAL_CREATOR_PLAN_ID || ''
  const legacyPro = process.env.PAYPAL_PRO_PLAN_ID || ''
  if (paypalPlanId && (paypalPlanId === creator || paypalPlanId === legacyPro)) return 'creator'
  // 只有一个订阅档，认不出来也按 creator 处理（但要留日志）
  if (paypalPlanId) {
    console.warn(`[PayPal Webhook] 未知的 PayPal plan id：${paypalPlanId}（按 creator 处理）`)
  }
  return 'creator'
}

/** 该订阅档每个周期发几张 */
function cardsForPlan(planId: PlanId): number {
  const plan = getPlan(planId)
  return plan?.kind === 'subscription' ? plan.cards : PLANS.creator.cards
}

export default defineEventHandler(async (event) => {
  const rawBody = await readRawBody(event, 'utf8').catch(() => undefined)
  const body = rawBody ? safeParse(rawBody) : {}
  const eventType = body?.event_type
  const resource = body?.resource || {}

  // ── 1. 签名验证 ──
  const webhookId = process.env.PAYPAL_WEBHOOK_ID || ''
  const skip = shouldSkipVerification(process.env.NODE_ENV, webhookId)

  if (!skip) {
    const headers = {
      'paypal-transmission-id': getHeader(event, 'paypal-transmission-id'),
      'paypal-transmission-time': getHeader(event, 'paypal-transmission-time'),
      'paypal-transmission-sig': getHeader(event, 'paypal-transmission-sig'),
      'paypal-cert-url': getHeader(event, 'paypal-cert-url'),
      'paypal-auth-algo': getHeader(event, 'paypal-auth-algo'),
    }
    const result = await verifyPayPalWebhook(headers, webhookId, body, rawBody)
    if (!result.ok) {
      console.error('[PayPal Webhook] ❌ signature verification failed:', result.reason)
      throw createError({ statusCode: 401, statusMessage: 'Invalid webhook signature' })
    }
    console.log('[PayPal Webhook] ✅ signature verified')
  } else {
    console.warn(
      '[PayPal Webhook] ⚠️ 跳过签名验证（未配置 PAYPAL_WEBHOOK_ID 且非 production）—— 绝不能这样上生产',
    )
  }

  console.log(`[PayPal Webhook] ${eventType}`, {
    id: resource?.id,
    status: resource?.status || resource?.state,
  })

  // ── 2. 处理事件 ──
  try {
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await onSubscriptionActivated(event, resource)
        break
      case 'BILLING.SUBSCRIPTION.RENEWED':
        await onSubscriptionRenewed(event, resource)
        break
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await onSubscriptionStatus(event, resource, 'cancelled')
        break
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await onSubscriptionStatus(event, resource, 'suspended')
        break
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await onSubscriptionStatus(event, resource, 'expired')
        break
      case 'PAYMENT.CAPTURE.COMPLETED':
      case 'CHECKOUT.ORDER.COMPLETED':
        await onOneTimeCompleted(event, resource)
        break
      default:
        console.log(`[PayPal Webhook] 未处理的事件：${eventType}`)
    }
  } catch (err: any) {
    console.error('[PayPal Webhook] 处理出错:', err?.message)
    // 仍然返回 200，避免 PayPal 无限重试（但要留下日志）
  }

  return { received: true }
})

function safeParse(s: string): any {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}

/** 订阅生效 → 找到对应用户并发额度（幂等） */
async function onSubscriptionActivated(event: any, resource: any) {
  const subscriptionId = resource?.id
  if (!subscriptionId) return
  const db = getDB(event)
  if (!db) return

  // 从 resource 里能拿到 plan_id 和 subscriber email
  const paypalPlanId = String(resource?.plan_id || '')
  const planId = planIdForPayPalPlan(paypalPlanId)
  const email = String(resource?.subscriber?.email_address || resource?.email || '')

  // 优先按 paypal_subscription_id 找（前端 activate 时已经写进去了）
  let row = await db
    .prepare('SELECT user_id, credits_remaining, plan FROM subscriptions WHERE paypal_subscription_id = ?')
    .bind(subscriptionId)
    .first<{ user_id: string; credits_remaining: number; plan: string }>()
    .catch(() => null)

  if (!row && email) {
    row = await db
      .prepare('SELECT user_id, credits_remaining, plan FROM subscriptions WHERE user_id = (SELECT id FROM users WHERE email = ?)')
      .bind(email)
      .first<{ user_id: string; credits_remaining: number; plan: string }>()
      .catch(() => null)
  }

  if (!row) {
    console.warn('[PayPal Webhook] 找不到该订阅对应的用户', { subscriptionId, email })
    return
  }

  // 幂等：如果这条订阅已经发过额度（activate 端点已处理），就只更新状态
  const already = await db
    .prepare('SELECT paypal_subscription_id FROM subscriptions WHERE user_id = ?')
    .bind(row.user_id)
    .first<{ paypal_subscription_id: string | null }>()
    .catch(() => null)

  if (already?.paypal_subscription_id === subscriptionId) {
    await db
      .prepare('UPDATE subscriptions SET status = ?, updated_at = ? WHERE user_id = ?')
      .bind('active', new Date().toISOString(), row.user_id)
      .run()
      .catch(() => {})
    console.log(`[PayPal Webhook] 订阅已激活（此前已处理过），仅更新状态`)
    return
  }

  const cards = cardsForPlan(planId)
  await db
    .prepare(
      `UPDATE subscriptions
       SET plan = ?, status = 'active', paypal_subscription_id = ?,
           credits_remaining = CASE WHEN credits_remaining = -1 THEN -1 ELSE credits_remaining + ? END,
           current_period_start = ?, current_period_end = ?, updated_at = ?
       WHERE user_id = ?`,
    )
    .bind(
      planId || row.plan,
      subscriptionId,
      cards,
      new Date().toISOString(),
      resource?.billing_info?.next_billing_time || null,
      new Date().toISOString(),
      row.user_id,
    )
    .run()
    .catch((e) => console.error('[PayPal Webhook] 更新订阅失败', e))

  console.log(`[PayPal Webhook] ✅ 订阅生效 uid=${row.user_id} +${cards} 张`)
}

/**
 * 订阅续费 → 发新一轮额度
 *
 * ⚠️ 为什么要跟「惰性续发」配合（见 server/utils/daily-usage.ts）：
 *   webhook 偶尔会丢，只靠它就会「付了钱拿不到新周期额度」。
 *   所以两边都发，但用同一个判据避免双发：
 *     - 这里：只有「本地的周期已经过期（storedEnd < now）」才发
 *     - 惰性续发：只有「本地的周期已经过期（now >= period_end）」才发
 *   谁先跑谁发，发完都把周期终点推到未来 ⇒ 后来的看到周期在未来就跳过。
 *
 * ⚠️ 周期终点**只往前推，绝不往回拨** ——
 *    否则惰性续发推进过的周期会被这里改回去，导致「每次读额度都发一次」。
 */
async function onSubscriptionRenewed(event: any, resource: any) {
  const subscriptionId = resource?.id
  if (!subscriptionId) return
  const db = getDB(event)
  if (!db) return

  const nextBilling = resource?.billing_info?.next_billing_time || null
  const row = await db
    .prepare(
      'SELECT id, user_id, plan, credits_remaining, current_period_end FROM subscriptions WHERE paypal_subscription_id = ?',
    )
    .bind(subscriptionId)
    .first<{
      id: string
      user_id: string
      plan: string
      credits_remaining: number
      current_period_end: string | null
    }>()
    .catch(() => null)

  if (!row) {
    console.warn('[PayPal Webhook] 续费事件找不到对应用户', { subscriptionId })
    return
  }

  const storedEnd = row.current_period_end ? Date.parse(row.current_period_end) : 0
  const now = Date.now()

  if (storedEnd && storedEnd >= now) {
    // 周期已经推进过了（惰性续发先跑过）→ 只对齐周期终点，不重复发额度
    const nextEnd =
      nextBilling && Date.parse(nextBilling) > storedEnd ? nextBilling : row.current_period_end
    await db
      .prepare('UPDATE subscriptions SET current_period_end = ?, status = ?, updated_at = ? WHERE id = ?')
      .bind(nextEnd, 'active', new Date().toISOString(), row.id)
      .run()
      .catch((e) => console.error('[PayPal Webhook] 对齐周期失败', e))
    console.log(`[PayPal Webhook] 订阅续费（周期已推进过，跳过发额度）uid=${row.user_id}`)
    return
  }

  const planId = resolvePlanId(row.plan) ?? 'creator'
  const cards = cardsForPlan(planId)
  const nowIso = new Date().toISOString()

  await db
    .prepare(
      `UPDATE subscriptions
       SET credits_remaining = CASE WHEN credits_remaining = -1 THEN -1 ELSE credits_remaining + ? END,
           current_period_start = ?, current_period_end = ?, status = 'active', updated_at = ?
       WHERE id = ?`,
    )
    .bind(cards, nowIso, nextBilling, nowIso, row.id)
    .run()
    .catch((e) => console.error('[PayPal Webhook] 续费发额度失败', e))

  console.log(`[PayPal Webhook] ✅ 订阅续费 uid=${row.user_id} +${cards} 张`)
}

/** 取消 / 暂停 / 过期 → 只改状态，不回收已发额度 */
async function onSubscriptionStatus(event: any, resource: any, status: string) {
  const subscriptionId = resource?.id
  if (!subscriptionId) return
  const db = getDB(event)
  if (!db) return

  await db
    .prepare('UPDATE subscriptions SET status = ?, updated_at = ? WHERE paypal_subscription_id = ?')
    .bind(status, new Date().toISOString(), subscriptionId)
    .run()
    .catch((e) => console.error('[PayPal Webhook] 更新状态失败', e))

  console.log(`[PayPal Webhook] 订阅状态 → ${status}`)
}

/** 一次性付款成功 → 订单已经由 capture 端点处理过了，这里只做兜底标记 */
async function onOneTimeCompleted(event: any, resource: any) {
  const orderId = resource?.invoice_id || resource?.custom_id || resource?.id
  if (!orderId) return
  const db = getDB(event)
  if (!db) return

  // capture 端点已经把额度发过了；这里只更新订单状态（幂等）
  await db
    .prepare('UPDATE generated_images SET status = ?, updated_at = ? WHERE id = ?')
    .bind('ready', new Date().toISOString(), `order_${orderId}`)
    .run()
    .catch(() => {})

  console.log(`[PayPal Webhook] 一次性付款完成 order=${orderId}`)
}
