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
import { planCards, planAmount, type PlanId } from '../../../../utils/pricing'

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
      // ⚠️ statusMessage 是 HTTP 状态行，只能放短且纯 ASCII 的内容。
      //    详细原因放 message（进 JSON body）。
      throw createError({
        statusCode: 502,
        statusMessage: 'Could not confirm the payment',
        message: `PayPal confirm failed: ${String(e2?.message || '').slice(0, 300)}`,
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
  const planId = (meta.planId || reference.split(':')[0] || '') as PlanId
  const cards = planCards(planId) || meta.cards || 0

  if (!cards) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown plan for this order' })
  }
  if (reference && reference.includes(':') && !reference.endsWith(auth.uid)) {
    // 下单的人和付钱的人不是同一个 → 拒绝
    console.warn('[paypal/capture] order belongs to another user', { orderId, reference })
    throw createError({ statusCode: 403, statusMessage: 'This order belongs to another account' })
  }

  // ── 3.5 金额对不上要留痕（不拦：拦了就是「用户付了钱却拿不到东西」）──
  // 常见原因：这笔订单是**改价前**下的（老订单金额还是旧价）。
  // 这种情况应该照常发卡 —— 用户付的钱和拿到的卡是匹配的。
  const paidAmount = String(order?.purchase_units?.[0]?.amount?.value || '')
  const expectedAmount = planAmount(planId)
  if (paidAmount && paidAmount !== expectedAmount) {
    console.warn(
      `[paypal/capture] ⚠️ 金额不一致 uid=${auth.uid} plan=${planId} 付了 $${paidAmount}，当前标价 $${expectedAmount}（多半是改价前下的老订单）`,
    )
  }

  // ── 4. 发额度（幂等：靠 status 标记）──
  const now = new Date().toISOString()
  const captureId = order?.purchase_units?.[0]?.payments?.captures?.[0]?.id || null

  const hasSub = await db
    .prepare('SELECT id, plan, status, credits_remaining, paypal_subscription_id FROM subscriptions WHERE user_id = ?')
    .bind(auth.uid)
    .first<{
      id: string
      plan: string | null
      status: string | null
      credits_remaining: number
      paypal_subscription_id: string | null
    }>()

  if (hasSub) {
    // ⚠️ 订阅优先：如果这个人还有生效中的订阅，plan 要保持订阅档 ——
    //    订阅每个周期发多少张，是按 plan 取的（creator = 5 张）。
    //    要是被一次性买断包改成 'lifetime'，月付就会按 20 张/周期发额度。
    // ⚠️ 这里**不动 status**：status 决定订阅续不续发额度（只有 active 才发），
    //    一次性购买没资格把一个已取消的订阅改回 active —— 那是白送月付额度。
    const subActive = hasSub.status === 'active' && !!hasSub.paypal_subscription_id
    const nextPlan = subActive ? (hasSub.plan || planId) : planId

    await db
      .prepare(
        `UPDATE subscriptions
         SET plan = ?,
             credits_remaining = CASE
               WHEN credits_remaining = -1 THEN -1
               ELSE credits_remaining + ?
             END,
             updated_at = ?
         WHERE user_id = ?`,
      )
      .bind(nextPlan, cards, now, auth.uid)
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
      JSON.stringify({ ...meta, planId, cards, captured: true, captureId, amount: paidAmount || undefined }),
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
