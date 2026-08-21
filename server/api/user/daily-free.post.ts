/**
 * POST /api/user/daily-free — 领取每日免费生成
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { nanoid } from 'nanoid'
import { getDB } from '../../utils/db-runtime'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  const body = await readBody(event)
  const type = body?.type === 'image' ? 'image' : 'music'

  const db = getDB(event)
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database not available' })

  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  // 检查是否已领取
  const existing = await db.prepare(
    'SELECT id FROM daily_free_claims WHERE user_id = ? AND claim_date = ? AND type = ?'
  ).bind(auth.uid, today, type).first()

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Already claimed today' })
  }

  // 记录领取
  await db.prepare(
    'INSERT INTO daily_free_claims (id, user_id, claim_date, type) VALUES (?, ?, ?, ?)'
  ).bind(nanoid(12), auth.uid, today, type).run()

  // 更新或创建用户统计
  const stats = await db.prepare(
    'SELECT streak_days FROM user_stats WHERE user_id = ?'
  ).bind(auth.uid).first<{ streak_days: number }>()

  if (stats) {
    // 检查连续登录
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const lastActive = await db.prepare(
      'SELECT last_active_at FROM user_stats WHERE user_id = ?'
    ).bind(auth.uid).first<{ last_active_at: string }>()

    let newStreak = 1
    if (lastActive?.last_active_at) {
      const lastDate = lastActive.last_active_at.split('T')[0]
      if (lastDate === yesterday) {
        newStreak = (stats.streak_days || 0) + 1
      }
    }

    await db.prepare(
      'UPDATE user_stats SET last_active_at = ?, streak_days = ? WHERE user_id = ?'
    ).bind(now, newStreak, auth.uid).run()
  } else {
    await db.prepare(
      'INSERT INTO user_stats (user_id, last_active_at, streak_days, longest_streak) VALUES (?, ?, 1, 1)'
    ).bind(auth.uid, now).run()
  }

  return {
    claimed: true,
    type,
    streakDays: stats ? ((stats.streak_days || 0) + 1) : 1,
    message: `You earned 1 free ${type} generation!`,
  }
})
