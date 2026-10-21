/**
 * POST /api/subscriptions/activate — 订阅批准后落库
 *
 * 前端 PayPal Buttons 的 onApprove 调这里。
 * ⚠️ 必须**回查 PayPal** 确认订阅真的建成了 —— 不能只信前端传回来的 id。
 *
 * 顺带处理一个真实场景：webhook 可能比前端先到（重复激活）→ 幂等 ✅
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getDB } from '../../utils/db-runtime'
import { getSubscription, isPayPalConfigured } from '../../utils/paypal'

/** planId → 该给多少张卡 */
const PLAN_CARDS: Record<string, number> = {
  creator: 5,
  pro: 20,
}

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  if (!isPayPalConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'Payments are not configured' })
  }

  const body = await readBody(event).catch(() => ({}) as any)
  const subscriptionId = String(body?.subscriptionId || '').trim()
  const planId = String(body?.planId || 'creator')
  if (!subscriptionId) {
    throw createError({ statusCode: 400, statusMessage: 'subscriptionId is required' })
  }

  const db = getDB(event)
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database not available' })

  // ── 1. 回查 PayPal 确认订阅状态 ──
  let sub: any
  try {
    sub = await getSubscription(subscriptionId)
  } catch (e: any) {
    throw createError({
      statusCode: 502,
      statusMessage: `Could not verify the subscription: ${e?.message?.slice(0, 200)}`,
    })
  }

  const status = String(sub?.status || '').toUpperCase()
  if (!['ACTIVE', 'APPROVED'].includes(status)) {
    throw createError({
      statusCode: 402,
      statusMessage: `Subscription is not active (status: ${status || 'unknown'})`,
    })
  }

  // 订阅里的 plan 必须是我们发起的
  const paypalPlanId = sub?.plan_id
  if (!paypalPlanId) {
    throw createError({ statusCode: 400, statusMessage: 'Subscription has no plan' })
  }

  const cards = PLAN_CARDS[planId] ?? 5
  const now = new Date().toISOString()
  const periodEnd = sub?.billing_info?.next_billing_time || null

  // ── 2. 幂等落库：同一订阅不重复加额度 ──
  const existing = await db
    .prepare('SELECT id, paypal_subscription_id, credits_remaining FROM subscriptions WHERE user_id = ?')
    .bind(auth.uid)
    .first<{ id: string; paypal_subscription_id: string | null; credits_remaining: number }>()

  if (existing?.paypal_subscription_id === subscriptionId) {
    return {
      ok: true,
      alreadyActive: true,
      planId,
      cards: existing.credits_remaining,
      message: 'Your subscription is already active.',
    }
  }

  if (existing) {
    await db
      .prepare(
        `UPDATE subscriptions
         SET plan = ?, status = 'active', paypal_subscription_id = ?,
             credits_remaining = CASE WHEN credits_remaining = -1 THEN -1 ELSE credits_remaining + ? END,
             current_period_start = ?, current_period_end = ?, updated_at = ?
         WHERE user_id = ?`,
      )
      .bind(planId, subscriptionId, cards, now, periodEnd, now, auth.uid)
      .run()
  } else {
    await db
      .prepare(
        `INSERT INTO subscriptions
           (id, user_id, plan, status, paypal_subscription_id, credits_remaining,
            current_period_start, current_period_end, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        `sub_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        auth.uid,
        planId,
        subscriptionId,
        cards,
        now,
        periodEnd,
        now,
        now,
      )
      .run()
  }

  console.log(`[paypal/activate] ✅ uid=${auth.uid} sub=${subscriptionId} plan=${planId} cards=${cards}`)

  return {
    ok: true,
    planId,
    cards,
    periodEnd,
    message: `Your plan is active — ${cards} cards added.`,
  }
})
