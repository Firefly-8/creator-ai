/**
 * GET /api/user/daily-free — 检查今日免费额度状态
 */
import { defineEventHandler, createError } from 'h3'
import { peekDailyQuota } from '../../utils/daily-usage'
import { getDB } from '../../utils/db-runtime'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  const db = getDB(event)
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database not available' })

  // ⚠️ 语义已改（2026-10-21）：原来这里是「今天领取过没有」，
  // 但那个 claimed 标记**生成接口根本不查** —— 领不领都能生成，等于没限制。
  // 现在统一走 daily_usage 的真实计数。
  const quota = await peekDailyQuota(event, auth.uid)

  // 获取用户连续登录天数
  const stats = await db.prepare(
    'SELECT streak_days FROM user_stats WHERE user_id = ?'
  ).bind(auth.uid).first<{ streak_days: number }>()

  return {
    // 兼容旧字段：claimed = 今天已经用掉过额度
    music: { claimed: quota.music.used > 0, ...quota.music },
    image: { claimed: quota.image.used > 0, ...quota.image },
    text: quota.text,
    streakDays: stats?.streak_days || 0,
  }
})
