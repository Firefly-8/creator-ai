/**
 * POST /api/ops/firebase-test-user — 临时端点，造一个 Firebase 测试账号
 *
 * ⚠️⚠️ 这是**临时**端点，E2E 测完就删（连同本文件）⚠️⚠️
 *
 * 为什么需要它：
 *   沙箱环境访问不了 identitytoolkit.googleapis.com（出口代理只放行白名单域名），
 *   而 E2E 支付测试需要一个真实登录用户（/api/paypal/order 和 /capture 都要求
 *   event.context.auth.uid）。这个端点跑在 Cloudflare 的网络里，能直连 Google。
 *
 * 鉴权：路径必须等于 FIREBASE_RELAY_TOKEN（随机一次性 token，部署时注入）。
 *   不用 OPS_ALERT_SECRET 是为了不去改动运维密钥（会打断告警链路）。
 */
import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { envString } from '../../utils/env'

export default defineEventHandler(async (event) => {
  const expected = envString(event, 'FIREBASE_RELAY_TOKEN', '')
  const provided = String(getHeader(event, 'x-relay-token') || '')
  if (!expected || provided !== expected) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or missing X-Relay-Token' })
  }

  const body = await readBody(event).catch(() => ({}) as any)
  const email = String(body?.email || '')
  const password = String(body?.password || '')
  const apiKey = String(body?.apiKey || '')

  if (!email || !password || !apiKey) {
    throw createError({ statusCode: 400, statusMessage: 'email / password / apiKey required' })
  }

  const call = async (method: 'signUp' | 'signInWithPassword') => {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    )
    return { status: res.status, body: await res.json().catch(() => ({})) }
  }

  // 先试注册；已存在就退回登录
  let r = await call('signUp')
  if (r.status !== 200) r = await call('signInWithPassword')

  return {
    ok: r.status === 200,
    status: r.status,
    uid: r.body?.localId ?? null,
    email: r.body?.email ?? null,
    idToken: r.body?.idToken ?? null,
    refreshToken: r.body?.refreshToken ?? null,
    error: r.body?.error?.message ?? null,
  }
})
