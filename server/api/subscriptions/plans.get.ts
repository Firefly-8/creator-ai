/**
 * 获取付费方案列表
 *
 * ⚠️ 2026-10-21 修正：这里原来是一张**写死的假表**
 *   （free 档写的是「每月 10 次音乐 / 20 次图片」），
 *   跟实际定价完全对不上，而且 generation 次数早在改用
 *   「每日免费额度」后就作废了 —— 现在付费点是**画质 + 张数**不是次数。
 *
 * 现在这张表**完全由 utils/pricing.ts 生成** —— 价格只有那一个真相源，
 * 前端定价页、服务端下单、PayPal 订单金额全都从它读。
 *
 * kind:
 *   'one_time' —— 一次性支付（Orders v2）
 *   'subscription' —— 订阅（Billing Subscriptions）
 *   'free' —— 免费档
 */
import { PLANS, PLAN_LIST, FREE_DAILY_LIMITS } from '../../../utils/pricing'

export default defineEventHandler(() => {
  return {
    plans: PLAN_LIST.map((p) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      price: p.price,
      currency: p.currency,
      cards: p.cards,
      ...(p.interval ? { interval: p.interval } : {}),
      description: p.description,
      ...(p.popular ? { popular: true } : {}),
      features: p.features,
    })),
    // 免费档的每日额度（前端展示用；真正的闸门在服务端）
    freeDaily: {
      image: FREE_DAILY_LIMITS.image.verified,
      imageUnverified: FREE_DAILY_LIMITS.image.unverified,
      music: FREE_DAILY_LIMITS.music.verified,
      text: FREE_DAILY_LIMITS.text.verified,
    },
  }
})
