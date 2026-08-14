/**
 * 用户同步 — Firebase 登录后将用户信息同步到 D1
 * 前端 Firebase 登录成功后调用
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  // 验证 Token
  const authHeader = getHeader(event, 'authorization')
  const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : ''
  
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Missing token' })
  }

  const { verifyFirebaseToken } = await import('../../utils/firebase-verify')
  const payload = await verifyFirebaseToken(token)
  if (!payload) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }

  const uid = payload.sub
  const email = payload.email || ''
  const name = payload.name || email.split('@')[0] || 'User'
  const avatar = payload.picture || ''
  const emailVerified = payload.email_verified || false

  // 获取 D1 binding
  const d1 = (globalThis as any).DB as D1Database
  if (!d1) throw createError({ statusCode: 500, statusMessage: 'DB not available' })

  const now = new Date().toISOString()

  // UPSERT 用户
  await d1.prepare(`
    INSERT INTO users (id, email, name, avatar, email_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      avatar = excluded.avatar,
      email_verified = excluded.email_verified,
      updated_at = excluded.updated_at
  `).bind(uid, email, name, avatar, emailVerified ? 1 : 0, now, now).run()

  // 确保有 subscriptions 记录
  const existing = await d1.prepare(
    'SELECT id FROM subscriptions WHERE user_id = ?'
  ).bind(uid).first()

  if (!existing) {
    const { nanoid } = await import('nanoid')
    await d1.prepare(`
      INSERT INTO subscriptions (id, user_id, plan, status, credits_remaining, created_at, updated_at)
      VALUES (?, ?, 'free', 'active', -1, ?, ?)
    `).bind(nanoid(12), uid, now, now).run()
  }

  // 获取用户信息和订阅
  const user = await d1.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(uid).first()

  const subscription = await d1.prepare(
    'SELECT * FROM subscriptions WHERE user_id = ?'
  ).bind(uid).first()

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      emailVerified: user.email_verified,
    },
    subscription: {
      plan: subscription?.plan || 'free',
      status: subscription?.status || 'active',
      creditsRemaining: subscription?.credits_remaining ?? -1,
    },
  }
})
