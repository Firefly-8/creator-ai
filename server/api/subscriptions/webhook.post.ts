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

  // ── 0. 临时：记录每次命中（验签之前），用来确认 PayPal 有没有真送到 ──
  const record = async (note: string) => { await logHookHit(event, note, eventType, resource) }
  await record('hit')

  // ── 0.1 临时：把原始 body 和签名头存下来，用来跟 PayPal 官方验签 API 对照 ──
  try {
    const db0 = getDB(event)
    if (db0 && rawBody) {
      const hdrs = {
        'paypal-transmission-id': getHeader(event, 'paypal-transmission-id') || '',
        'paypal-transmission-time': getHeader(event, 'paypal-transmission-time') || '',
        'paypal-transmission-sig': getHeader(event, 'paypal-transmission-sig') || '',
        'paypal-cert-url': getHeader(event, 'paypal-cert-url') || '',
        'paypal-auth-algo': getHeader(event, 'paypal-auth-algo') || '',
      }
      await db0
        .prepare('INSERT INTO tmp_hook_raw (ts, raw_body, headers) VALUES (?, ?, ?)')
        .bind(new Date().toISOString(), rawBody, JSON.stringify(hdrs))
        .run()
        .catch(() => {})
    }
  } catch {
    /* ignore */
  }

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
    let result: any
    try {
      result = await verifyPayPalWebhook(headers, webhookId, body, rawBody)
    } catch (e: any) {
      await record('verify-threw:' + String(e?.message || e).slice(0, 120))
      throw e
    }
    if (!result.ok) {
      await record('verify-fail:' + String(result.reason).slice(0, 120))
      console.error('[PayPal Webhook] ❌ signature verification failed:', result.reason)
      throw createError({ statusCode: 401, statusMessage: 'Invalid webhook signature' })
    }
    await record('verified')
    console.log('[PayPal Webhook] ✅ signature verified')
  } else {
    await record('skip-verify')
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
        await record('processed')
        break
      default:
        console.log(`[PayPal Webhook] 未处理的事件：${eventType}`)
    }
  } catch (err: any) {
    await record('error:' + String(err?.message || err).slice(0, 160))
    console.error('[PayPal Webhook] 处理出错:', err?.message)
    // 仍然返回 200，避免 PayPal 无限重试（但要留下日志）
  }

  await record('done')
  return { received: true }
})

/** 临时：把 webhook 处理过程写进 D1，方便线上排查（测完删） */
async function logHookHit(event: any, note: string, eventType?: string, resource?: any) {
  try {
    const db0 = getDB(event)
    if (!db0) return
    await db0
      .prepare(
        `INSERT INTO tmp_hook_hits (ts, event_type, resource_id, order_id, has_sig, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        new Date().toISOString(),
        String(eventType || ''),
        String(resource?.id || ''),
        String(resource?.supplementary_data?.related_ids?.order_id || ''),
        getHeader(event, 'paypal-transmission-sig') ? 1 : 0,
        note,
      )
      .run()
      .catch(() => {})
  } catch {
    /* ignore */
  }
}

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

/**
 * 一次性付款成功 → 兜底发额度
 *
 * ⚠️ 为什么需要兜底（这才是 webhook 存在的意义）：
 *   正常路径是「用户在 PayPal 批准 → 前端 onApprove → 调 capture 端点 → 发额度」。
 *   但**用户批准后直接关掉浏览器**（或网络断了），capture 端点就永远不会被调
 *   → 用户付了钱却拿不到卡。webhook 是 PayPal 服务器主动推的，不依赖浏览器，
 *   所以它是唯一可靠的兜底。
 *
 * ⚠️ 幂等靠订单行的 status：
 *   - capture 端点发完额度会把这行标成 'ready' → webhook 看到 ready 就跳过
 *   - webhook 先用「UPDATE ... WHERE status != 'ready'」原子抢占（changes > 0
 *     才算抢到），抢到才发额度 → 两边同时跑也不会双发
 *
 * ⚠️ order id 从多个地方兜着找：
 *   PAYMENT.CAPTURE.COMPLETED 的 resource 里是 **capture** 的信息，
 *   订单 id 藏在 supplementary_data.related_ids.order_id 里；
 *   拿不到就退回 custom_id / invoice_id，最后才用 resource.id。
 */
async function onOneTimeCompleted(event: any, resource: any) {
  const orderId =
    resource?.invoice_id ||
    resource?.custom_id ||
    resource?.supplementary_data?.related_ids?.order_id ||
    resource?.id
  if (!orderId) return
  const db = getDB(event)
  if (!db) return

  const row = await db
    .prepare('SELECT id, user_id, status, meta_json FROM generated_images WHERE id = ?')
    .bind(`order_${orderId}`)
    .first<{ id: string; user_id: string; status: string; meta_json: string }>()
    .catch(() => null)

  if (!row) {
    // 找不到对应订单 —— 多半是别处的订单（不是我们平台下的），忽略
    console.warn('[PayPal Webhook] 一次性付款事件找不到订单行', { orderId })
    await logHookHit(event, 'no-order-row', 'PAYMENT.CAPTURE.COMPLETED', resource)
    return
  }

  // ── 原子抢占：只有把 pending 改成 ready 成功的那一方才发额度 ──
  const claimed = await db
    .prepare("UPDATE generated_images SET status = 'ready', updated_at = ? WHERE id = ? AND status != 'ready'")
    .bind(new Date().toISOString(), row.id)
    .run()
    .catch(() => null)

  const changes = Number((claimed as any)?.meta?.changes ?? 0)
  if (changes === 0) {
    console.log('[PayPal Webhook] 一次性付款已处理过，跳过（幂等）', { orderId })
    await logHookHit(event, 'already-claimed', 'PAYMENT.CAPTURE.COMPLETED', resource)
    return
  }

  const meta = safeParse(row.meta_json || '{}')
  const planId = String(meta.planId || '') as PlanId
  const cards = Number(meta.cards || 0)
  if (!planId || !cards) {
    console.warn('[PayPal Webhook] 订单信息不全，没法发额度', { orderId, meta })
    await logHookHit(event, 'no-plan-cards', 'PAYMENT.CAPTURE.COMPLETED', resource)
    return
  }

  const nowIso = new Date().toISOString()
  const hasSub = await db
    .prepare('SELECT id, plan, status, credits_remaining, paypal_subscription_id FROM subscriptions WHERE user_id = ?')
    .bind(row.user_id)
    .first<{
      id: string
      plan: string | null
      status: string | null
      credits_remaining: number
      paypal_subscription_id: string | null
    }>()

  if (hasSub) {
    // 订阅优先：已有生效订阅时不能把 plan 改成一次性买断档
    const subActive = hasSub.status === 'active' && !!hasSub.paypal_subscription_id
    const nextPlan = subActive ? hasSub.plan || planId : planId
    await db
      .prepare(
        `UPDATE subscriptions
         SET plan = ?,
             credits_remaining = CASE WHEN credits_remaining = -1 THEN -1 ELSE credits_remaining + ? END,
             updated_at = ?
         WHERE id = ?`,
      )
      .bind(nextPlan, cards, nowIso, hasSub.id)
      .run()
      .catch((e) => console.error('[PayPal Webhook] 一次性付款发额度失败:', e?.message))
  } else {
    await db
      .prepare(
        `INSERT INTO subscriptions (id, user_id, plan, status, credits_remaining, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?, ?)`,
      )
      .bind(
        `sub_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        row.user_id,
        planId,
        cards,
        nowIso,
        nowIso,
      )
      .run()
      .catch((e) => console.error('[PayPal Webhook] 一次性付款建订阅行失败:', e?.message))
  }

  // 补上 meta 里的 captured 标记
  await db
    .prepare('UPDATE generated_images SET meta_json = ? WHERE id = ?')
    .bind(JSON.stringify({ ...meta, captured: true, grantedBy: 'webhook' }), row.id)
    .run()
    .catch(() => {})

  await logHookHit(event, 'granted', 'PAYMENT.CAPTURE.COMPLETED', resource)
  console.log(`[PayPal Webhook] ✅ 一次性付款兜底发额度 uid=${row.user_id} +${cards} 张（${planId}）`)
}
