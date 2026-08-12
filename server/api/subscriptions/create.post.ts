/**
 * 创建 PayPal 订阅
 */

import { defineEventHandler, createError, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { planId } = body

  if (!planId) {
    throw createError({ statusCode: 400, statusMessage: 'Plan ID is required' })
  }

  // PayPal 产品/计划 ID 映射
  const paypalPlanIds: Record<string, string> = {
    creator: process.env.PAYPAL_CREATOR_PLAN_ID || '',
    pro: process.env.PAYPAL_PRO_PLAN_ID || '',
  }

  const paypalPlanId = paypalPlanIds[planId]
  if (!paypalPlanId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid plan' })
  }

  // 返回 PayPal 订阅创建 URL
  // 前端使用 PayPal JS SDK 完成订阅流程
  return {
    planId,
    paypalPlanId,
    paypalClientId: process.env.PAYPAL_CLIENT_ID || '',
  }
})
