/**
 * PayPal Webhook — 处理订阅事件
 * 
 * 事件类型：
 * - BILLING.SUBSCRIPTION.ACTIVATED
 * - BILLING.SUBSCRIPTION.CANCELLED
 * - BILLING.SUBSCRIPTION.EXPIRED
 * - PAYMENT.SALE.COMPLETED
 * 
 * 注意：生产环境必须实现 PayPal webhook 签名验证
 * 参考：https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
 */

import { defineEventHandler, readBody, createError } from 'h3'

// Webhook 事件处理
const WEBHOOK_EVENTS = {
  SUBSCRIPTION_ACTIVATED: 'BILLING.SUBSCRIPTION.ACTIVATED',
  SUBSCRIPTION_CANCELLED: 'BILLING.SUBSCRIPTION.CANCELLED',
  SUBSCRIPTION_EXPIRED: 'BILLING.SUBSCRIPTION.EXPIRED',
  SUBSCRIPTION_SUSPENDED: 'BILLING.SUBSCRIPTION.SUSPENDED',
  PAYMENT_SALE_COMPLETED: 'PAYMENT.SALE.COMPLETED',
  PAYMENT_SALE_REFUNDED: 'PAYMENT.SALE.REFUNDED',
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  // 1. 验证 PayPal webhook 签名（生产环境必须实现）
  // TODO: 实现 PayPal webhook 签名验证
  // 在验证完成之前，返回 200 以避免 PayPal 重试，但不处理事件
  const transmissionId = getHeader(event, 'paypal-transmission-id')
  const certUrl = getHeader(event, 'paypal-cert-url')
  const authAlgo = getHeader(event, 'paypal-auth-algo')
  const transmissionSig = getHeader(event, 'paypal-transmission-sig')
  const transmissionTime = getHeader(event, 'paypal-transmission-time')
  
  // 检查是否是 PayPal 的 webhook 请求
  if (!transmissionId || !certUrl || !transmissionSig) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid webhook request' })
  }
  
  // 开发环境：记录事件但不处理（等待签名验证实现）
  const eventType = body.event_type
  const resource = body.resource
  
  console.log(`[PayPal Webhook] ${eventType}`, {
    transmissionId,
    subscriptionId: resource?.id,
    state: resource?.state,
  })
  
  // 2. 处理事件
  try {
    switch (eventType) {
      case WEBHOOK_EVENTS.SUBSCRIPTION_ACTIVATED:
      case WEBHOOK_EVENTS.PAYMENT_SALE_COMPLETED:
        await handleSubscriptionActivated(resource)
        break
        
      case WEBHOOK_EVENTS.SUBSCRIPTION_CANCELLED:
      case WEBHOOK_EVENTS.SUBSCRIPTION_SUSPENDED:
        await handleSubscriptionCancelled(resource)
        break
        
      case WEBHOOK_EVENTS.SUBSCRIPTION_EXPIRED:
        await handleSubscriptionExpired(resource)
        break
        
      default:
        console.log(`[PayPal Webhook] Unhandled event: ${eventType}`)
    }
  } catch (err) {
    console.error('[PayPal Webhook] Error processing event:', err)
    // 仍然返回 200，避免 PayPal 无限重试
  }
  
  return { received: true }
})

// ============ 事件处理函数 ============

async function handleSubscriptionActivated(resource: any) {
  const subscriptionId = resource.id
  const planId = resource.plan_id
  
  console.log(`[PayPal] Activating subscription: ${subscriptionId}, plan: ${planId}`)
  
  // TODO: 根据 paypal_subscription_id 查找用户并更新订阅
  // 1. 根据 subscriptionId 查找 subscriptions 表
  // 2. 更新 plan, status, current_period_start/end, credits_remaining
  // 3. 记录支付历史
}

async function handleSubscriptionCancelled(resource: any) {
  const subscriptionId = resource.id
  
  console.log(`[PayPal] Cancelling subscription: ${subscriptionId}`)
  
  // TODO: 更新订阅状态为 canceled
}

async function handleSubscriptionExpired(resource: any) {
  const subscriptionId = resource.id
  
  console.log(`[PayPal] Expiring subscription: ${subscriptionId}`)
  
  // TODO: 降级到 free 计划
}
