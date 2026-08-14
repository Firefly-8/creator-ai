/**
 * 获取当前用户信息 — 真实数据版本
 */

import { defineEventHandler, getHeader, createError } from 'h3'

export default defineEventHandler(async (event) => {
  // 验证 Token
  const authHeader = getHeader(event, 'authorization')
  const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : ''
  
  if (!token) throw createError({ statusCode: 401 })

  const { verifyFirebaseToken } = await import('../../utils/firebase-verify')
  const payload = await verifyFirebaseToken(token)
  if (!payload) throw createError({ statusCode: 401 })

  const uid = payload.sub
  const d1 = (globalThis as any).DB as D1Database
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
      creditsRemaining: subscription?.credits_remaining ?? -1,
    },
    stats: {
      songs: songCount?.count || 0,
      images: imageCount?.count || 0,
    },
    quotas: {
      free: { music: 10, image: 20, lyrics: 10, cover: 5 },
      creator: { music: 100, image: 200, lyrics: 100, cover: 50 },
      pro: { music: 300, image: 500, lyrics: 300, cover: 100 },
    },
  }
})
