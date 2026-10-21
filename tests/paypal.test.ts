/**
 * PayPal 支付链路守卫
 *
 * ⚠️ 背景（2026-10-21）：
 *   之前项目里 PayPal 只有订阅壳子，一次性支付完全没有，
 *   而且 pricing 页写的是「Pay once — coming soon」。
 *   更要紧的是 webhook **不验证签名** —— 那等于任何人都能伪造
 *   「用户已付款」来白嫖额度。
 *
 * 这个测试锁住支付链路的安全底线。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8')

describe('PayPal 一次性支付', () => {
  it('金额必须由服务端决定，绝不能信前端传来的值', () => {
    const src = read('server/api/paypal/order.post.ts')
    // 服务端有一张权威的 planId → 金额 表
    expect(src).toMatch(/const ONE_TIME_PLANS/)
    expect(src).toMatch(/amount:\s*'3\.99'/)
    expect(src).toMatch(/amount:\s*'19\.99'/)
    // 读 body 时只取 planId，不取金额
    expect(src).toContain("String(body?.planId || '')")
    expect(src).not.toMatch(/body\?\.amount/)
    expect(src).not.toMatch(/body\.amount/)
  })

  it('下单前必须登录', () => {
    const src = read('server/api/paypal/order.post.ts')
    expect(src).toMatch(/if \(!auth\?\.uid\) throw createError\(\{ statusCode: 401 \}\)/)
  })

  it('capture 必须回查 PayPal 确认已付款，不能只信前端', () => {
    const src = read('server/api/paypal/order/capture.post.ts')
    expect(src).toContain('captureOrder')
    expect(src).toContain('getOrder')
    expect(src).toMatch(/status !== 'COMPLETED'/)
    // 拿不到 COMPLETED 就拒绝
    expect(src).toMatch(/statusCode: 402/)
  })

  it('额度发放是幂等的（同一订单不能重复发）', () => {
    const src = read('server/api/paypal/order/capture.post.ts')
    expect(src).toContain('alreadyProcessed')
    expect(src).toContain("status === 'ready'")
  })

  it('订单归属校验：别人的订单不能拿', () => {
    const src = read('server/api/paypal/order/capture.post.ts')
    expect(src).toMatch(/belongs to another account/)
    expect(src).toMatch(/statusCode: 403/)
  })
})

describe('PayPal Webhook 安全', () => {
  it('webhook 必须在公开白名单里（PayPal 服务器调它没有 token）', () => {
    const src = read('server/middleware/auth.ts')
    expect(src).toContain("'/api/subscriptions/webhook'")
  })

  it('webhook 必须验证签名，验证不过直接拒绝', () => {
    const src = read('server/api/subscriptions/webhook.post.ts')
    expect(src).toContain('verifyPayPalWebhook')
    expect(src).toMatch(/if \(!result\.ok\)[\s\S]{0,200}statusCode: 401/)
  })

  it('生产环境不允许跳过签名验证', () => {
    const src = read('server/utils/paypal-webhook.ts')
    expect(src).toContain('shouldSkipVerification')
    // 跳过条件里必须判断是不是 production
    expect(src).toMatch(/env !== 'production'/)
  })

  it('证书 URL 必须校验域名（防 SSRF）', () => {
    const src = read('server/utils/paypal-webhook.ts')
    expect(src).toContain('isTrustedCertUrl')
    expect(src).toMatch(/endsWith\('\.paypal\.com'\)/)
    expect(src).toMatch(/protocol !== 'https:'/)
  })

  it('订阅激活 webhook 要真的落库（不是 TODO）', () => {
    const src = read('server/api/subscriptions/webhook.post.ts')
    expect(src).not.toMatch(/TODO/)
    expect(src).toContain('UPDATE subscriptions')
  })
})

describe('PayPal 定价与前端', () => {
  it('plan 表要跟实际定价一致（不再是假的「每月 N 次生成」）', () => {
    const src = read('server/api/subscriptions/plans.get.ts')
    expect(src).toContain("price: 3.99")
    expect(src).toContain("price: 9.99")
    expect(src).toContain("price: 19.99")
    // 旧的假字段不能留
    expect(src).not.toMatch(/generations\/month/)
  })

  it('定价页接的是真的 PayPal 按钮，不是 coming soon', () => {
    const src = read('pages/pricing.vue')
    expect(src).not.toMatch(/Pay once — coming soon/)
    expect(src).toContain('PayPalButton')
  })

  it('PayPal 按钮组件支持一次性支付和订阅两种', () => {
    const src = read('components/pricing/PayPalButton.vue')
    expect(src).toContain("kind?: 'one_time' | 'subscription'")
    expect(src).toContain('/api/paypal/order')
    expect(src).toContain('/api/paypal/order/capture')
    expect(src).toContain('/api/subscriptions/create')
    expect(src).toContain('/api/subscriptions/activate')
  })

  it('前端拿不到 secret（只暴露 client id）', () => {
    const src = read('server/api/paypal/config.get.ts')
    expect(src).toContain('clientId')
    expect(src).not.toContain('clientSecret')
  })
})
