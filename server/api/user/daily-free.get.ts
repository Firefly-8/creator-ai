/**
 * GET /api/user/daily-free — 检查今日免费额度状态
 */
import { defineEventHandler, createError } from 'h3'
import { getDB } from '../../utils/db-runtime'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  const db = getDB(event)
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database not available' })

  const today = new Date().toISOString().split('T')[0]

  // 检查今日是否已领取
  const musicClaimed = await db.prepare(
    'SELECT id FROM daily_free_claims WHERE user_id = ? AND claim_date = ? AND type = ?'
  ).bind(auth.uid, today, 'music').first()

  const imageClaimed = await db.prepare(
    'SELECT id FROM daily_free_claims WHERE user_id = ? AND claim_date = ? AND type = ?'
  ).bind(auth.uid, today, 'image').first()

  // 获取用户连续登录天数
  const stats = await db.prepare(
    'SELECT streak_days FROM user_stats WHERE user_id = ?'
  ).bind(auth.uid).first<{ streak_days: number }>()

  return {
    music: { claimed: !!musicClaimed },
    image: { claimed: !!imageClaimed },
    streakDays: stats?.streak_days || 0,
  }
})
