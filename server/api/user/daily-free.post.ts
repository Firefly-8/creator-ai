/**
 * POST /api/user/daily-free — 领取每日免费生成
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { peekDailyQuota } from '../../utils/daily-usage'
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

  // ⚠️ 不再「领取」—— 额度是服务端在生成时自动扣的。
  // 这里保留这个 POST 只为了兼容旧前端（dashboard 的「领取」按钮），
  // 行为改成幂等：返回当前额度，绝不写 daily_free_claims。
  const quota = await peekDailyQuota(event, auth.uid)

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
    claimed: quota[type].used > 0,
    type,
    limit: quota[type].limit,
    used: quota[type].used,
    remaining: quota[type].remaining,
    unlimited: quota[type].unlimited,
    streakDays: stats?.streak_days || 0,
    message: quota[type].unlimited
      ? `You have unlimited ${type} generations.`
      : `You have ${quota[type].remaining} free ${type} generation(s) left today.`,
  }
})
