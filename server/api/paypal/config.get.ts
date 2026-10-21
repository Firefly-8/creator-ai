/**
 * GET /api/paypal/config — 前端拿 PayPal SDK 需要的 client id
 *
 * 只返回 client id（public 的），secret 绝不出服务端 ✅
 * 同时告诉前端是不是沙箱，前端可以显示提示。
 */
import { defineEventHandler } from 'h3'
import { getPayPalConfig, isPayPalConfigured } from '../../utils/paypal'

export default defineEventHandler(() => {
  const cfg = getPayPalConfig()
  return {
    clientId: cfg.clientId,
    sandbox: cfg.isSandbox,
    configured: isPayPalConfigured(),
  }
})
