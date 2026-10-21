/**
 * 获取当前用户信息 — 真实数据版本
 */

import { defineEventHandler, getHeader, createError } from 'h3'
import { peekDailyQuota } from '../../utils/daily-usage'

export default defineEventHandler(async (event) => {
  // 验证 Token
  const authHeader = getHeader(event, 'authorization')
  const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : ''
  
  if (!token) throw createError({ statusCode: 401 })

  const { verifyFirebaseToken } = await import('../../utils/firebase-verify')
  const payload = await verifyFirebaseToken(token)
  if (!payload) throw createError({ statusCode: 401 })

  const uid = payload.sub
  const { getDB } = await import('../../utils/db-runtime')
  const d1 = getDB(event)
  if (!d1) throw createError({ statusCode: 500 })

  const user = await d1.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(uid).first()

  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const subscription = await d1.prepare(
    'SELECT * FROM subscriptions WHERE user_id = ?'
  ).bind(uid).first()

  // 统计用户资产
  const songCount = await d1.prepare(
    'SELECT COUNT(*) as count FROM songs WHERE user_id = ?'
  ).bind(uid).first<{ count: number }>()

  const imageCount = await d1.prepare(
    'SELECT COUNT(*) as count FROM generated_images WHERE user_id = ?'
  ).bind(uid).first<{ count: number }>()

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      emailVerified: !!user.email_verified,
      createdAt: user.created_at,
    },
    subscription: {
      plan: subscription?.plan || 'free',
      status: subscription?.status || 'active',
      // ⚠️ 不要用 -1 当默认值 —— 那个值在额度语义里表示「不限」，
      //    免费用户没有订阅行，不该显示成「不限」
      creditsRemaining: subscription?.credits_remaining ?? 0,
    },
    stats: {
      songs: songCount?.count || 0,
      images: imageCount?.count || 0,
    },
    // ⚠️ 这里以前是写死的假配额表（free: image 20 / music 10），
    // 客户端拿它减已用来显示「还剩多少」，但**生成接口压根不查它** ——
    // 看着像有配额，实际拦不住任何人。
    // 现在换成真实的每日额度（服务端强制的 daily_usage 计数）。
    quotas: await peekDailyQuota(event, uid),
  }
})
