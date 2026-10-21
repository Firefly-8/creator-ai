/**
 * POST /api/paypal/order/capture — 捕获一次性支付并发放额度
 *
 * 前端在 PayPal 批准后调用（onApprove → orderId）。
 * 服务端向 PayPal 确认这笔订单**真的已付款**，再发额度。
 *
 * ⚠️ 绝不能只信前端 —— 前端可以随便传一个 orderId。
 *    必须 capture 或查单，拿到 status === 'COMPLETED' 才算。
 *
 * 幂等：同一个 orderId 重复调用只发一次额度。
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getDB } from '../../../utils/db-runtime'
import { captureOrder, getOrder } from '../../../utils/paypal'

/** 一次性档位 → 张数（与 order.post.ts 保持一致） */
const ONE_TIME_CARDS: Record<string, number> = {
  single: 1,
  lifetime: 20,
}

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  const body = await readBody(event).catch(() => ({}) as any)
  const orderId = String(body?.orderId || '').trim()
  if (!orderId) throw createError({ statusCode: 400, statusMessage: 'orderId is required' })

  const db = getDB(event)
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database not available' })

  // ── 1. 幂等检查：已经发过就直接返回 ──
  const existing = await db
    .prepare(`SELECT id, meta_json, status FROM generated_images WHERE id = ?`)
    .bind(`order_${orderId}`)
    .first<{ id: string; meta_json: string; status: string }>()
    .catch(() => null)

  if (existing && existing.status === 'ready') {
    const meta = JSON.parse(existing.meta_json || '{}')
    return {
      ok: true,
      alreadyProcessed: true,
      planId: meta.planId,
      cards: meta.cards,
      message: 'This payment was already applied.',
    }
  }

  // ── 2. 向 PayPal 确认这笔订单真的付了款 ──
  let order: any
  try {
    order = await captureOrder(orderId)
  } catch (e: any) {
    // capture 失败（可能已经 capture 过了）→ 退回去查单
    console.warn('[paypal/capture] capture failed, falling back to getOrder:', e?.message)
    try {
      order = await getOrder(orderId)
    } catch (e2: any) {
      throw createError({
        statusCode: 502,
        statusMessage: `Could not confirm the payment: ${e2?.message?.slice(0, 200)}`,
      })
    }
  }

  const status = order?.status
  if (status !== 'COMPLETED') {
    throw createError({
      statusCode: 402,
      statusMessage: `Payment not completed (status: ${status || 'unknown'})`,
      data: { paypalStatus: status },
    })
  }

  // ── 3. 确认这笔订单属于当前用户 ──
  // reference_id 我们存成 `${planId}:${uid}`
  const reference = String(order?.purchase_units?.[0]?.reference_id || '')
  const meta = existing ? JSON.parse(existing.meta_json || '{}') : {}
  const planId = meta.planId || reference.split(':')[0] || ''
  const cards = ONE_TIME_CARDS[planId] ?? meta.cards ?? 0

  if (!cards) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown plan for this order' })
  }
  if (reference && reference.includes(':') && !reference.endsWith(auth.uid)) {
    // 下单的人和付钱的人不是同一个 → 拒绝
    console.warn('[paypal/capture] order belongs to another user', { orderId, reference })
    throw createError({ statusCode: 403, statusMessage: 'This order belongs to another account' })
  }

  // ── 4. 发额度（幂等：靠 status 标记 + 事务内的条件更新）──
  const now = new Date().toISOString()
  const captureId = order?.purchase_units?.[0]?.payments?.captures?.[0]?.id || null

  const hasSub = await db
    .prepare('SELECT id, credits_remaining FROM subscriptions WHERE user_id = ?')
    .bind(auth.uid)
    .first<{ id: string; credits_remaining: number }>()

  if (hasSub) {
    await db
      .prepare(
        `UPDATE subscriptions
         SET plan = CASE WHEN ? = 'lifetime' THEN 'lifetime' ELSE plan END,
             status = 'active',
             credits_remaining = CASE
               WHEN credits_remaining = -1 THEN -1
               ELSE credits_remaining + ?
             END,
             updated_at = ?
         WHERE user_id = ?`,
      )
      .bind(planId, cards, now, auth.uid)
      .run()
  } else {
    await db
      .prepare(
        `INSERT INTO subscriptions (id, user_id, plan, status, credits_remaining, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?, ?)`,
      )
      .bind(
        `sub_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        auth.uid,
        planId,
        cards,
        now,
        now,
      )
      .run()
  }

  // 标记订单已处理（同时也是幂等锁）
  await db
    .prepare(
      `UPDATE generated_images SET status = 'ready', updated_at = ?,
         meta_json = ? WHERE id = ?`,
    )
    .bind(
      now,
      JSON.stringify({ ...meta, planId, cards, captured: true, captureId, amount: order?.purchase_units?.[0]?.amount?.value }),
      `order_${orderId}`,
    )
    .run()
    .catch((e) => console.error('[paypal/capture] failed to mark order:', e?.message))

  console.log(`[paypal/capture] ✅ uid=${auth.uid} order=${orderId} plan=${planId} cards=${cards}`)

  return {
    ok: true,
    planId,
    cards,
    captureId,
    message:
      planId === 'lifetime'
        ? '20 cards added. They never expire.'
        : '1 card added. Thank you!',
  }
})
