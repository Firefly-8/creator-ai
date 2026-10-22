/**
 * POST /api/paypal/order — 创建一次性支付订单（Orders v2）
 *
 * 覆盖两个一次性档位（价格/张数全部来自 utils/pricing.ts）：
 *   single   $6.99   1 张
 *   lifetime $59.99  20 张
 *
 * 流程：
 *   1. 前端 POST 这里 → 服务端向 PayPal 建 order（intent=CAPTURE）
 *   2. 返回 orderId + clientId
 *   3. 前端用 PayPal Buttons 渲染，用户在 PayPal 页面批准
 *   4. 前端 onApprove → POST /api/paypal/order/capture
 *   5. 服务端 capture 成功后发放额度（写 subscriptions 表）
 *
 * ⚠️ 金额**永远由服务端按 planId 决定**，绝不接受前端传来的金额 ——
 *    否则改一下请求参数就能 6.99 买 20 张。
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getDB } from '../../utils/db-runtime'
import { getPayPalConfig, createOrder, isPayPalConfigured, findLink } from '../../utils/paypal'
import { PLANS, planAmount, planCards, type PlanId } from '../../../utils/pricing'

/** 一次性档位（订阅不走这里） */
const ONE_TIME_PLAN_IDS: PlanId[] = ['single', 'lifetime']

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  if (!isPayPalConfigured()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Payments are not configured on this environment',
    })
  }

  const body = await readBody(event).catch(() => ({}) as any)
  const planId = String(body?.planId || '')
  if (!ONE_TIME_PLAN_IDS.includes(planId as PlanId)) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown one-time plan' })
  }
  const plan = PLANS[planId as PlanId]
  const amount = planAmount(planId)
  const cards = planCards(planId)

  const db = getDB(event)
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database not available' })

  const cfg = getPayPalConfig()
  const origin = getRequestURL(event).origin
  const base = process.env.PUBLIC_SITE_URL || origin

  let order: any
  try {
    order = await createOrder({
      amount,
      currency: 'USD',
      description: `Create Keepsakes — ${plan.label}`,
      // ⚠️ return_url 里**不能**放 {id} 之类的占位符 ——
      //    那是 Stripe 的写法，PayPal 会直接 400：
      //      INVALID_PARAMETER_SYNTAX
      //      field: /payment_source/paypal/experience_context/return_url
      //    PayPal 自己会在回跳 URL 后面追加 ?token=<orderId>，够用了。
      returnUrl: `${base}/pricing?paid=1`,
      cancelUrl: `${base}/pricing?cancelled=1`,
      referenceId: `${planId}:${auth.uid}`,
    })
  } catch (e: any) {
    // ⚠️ statusMessage 会进 HTTP 状态行，只能放短且纯 ASCII 的内容；
    //    详细原因放 message（进 JSON body），别把 PayPal 的原始报错
    //    直接塞进 statusMessage。
    console.error('[paypal/order] create failed:', e?.message)
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not start the payment',
      message: `PayPal rejected the order: ${String(e?.message || '').slice(0, 300)}`,
    })
  }

  const orderId = order?.id
  if (!orderId) {
    throw createError({ statusCode: 502, statusMessage: 'PayPal did not return an order id' })
  }

  // 记录一笔待支付订单（便于对账；capture 成功时再补齐）
  try {
    await db
      .prepare(
        `INSERT INTO generated_images (id, title, prompt, prompt_final, scene, model, mode,
           aspect_ratio, user_id, status, meta_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        `order_${orderId}`,
        `PayPal order ${planId}`,
        plan.label,
        plan.label,
        'payment',
        'paypal',
        'one_time',
        '1:1',
        auth.uid,
        'pending',
        JSON.stringify({ orderId, planId, amount, cards }),
        new Date().toISOString(),
        new Date().toISOString(),
      )
      .run()
  } catch (e) {
    // 记录失败不阻断支付（capture 时靠 PayPal 侧数据兜底）
    console.error('[paypal/order] failed to record pending order:', e?.message)
  }

  return {
    orderId,
    planId,
    amount,
    cards,
    clientId: cfg.clientId,
    sandbox: cfg.isSandbox,
    approveUrl: findLink(order?.links, 'approve'),
  }
})
