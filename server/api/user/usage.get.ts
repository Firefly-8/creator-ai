/**
 * GET /api/user/usage — 今天还能生成几次
 *
 * 前端显示「今天还剩 N 次」用这个。
 * 额度是**服务端强制的**（server/utils/daily-usage.ts），这里只是把状态读出来。
 */
import { defineEventHandler, createError } from 'h3'
import { peekDailyQuota } from '../../utils/daily-usage'
import { getDB } from '../../utils/db-runtime'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  const quota = await peekDailyQuota(event, auth.uid)

  // 连续登录天数（老功能，保留）
  let streakDays = 0
  const db = getDB(event)
  if (db) {
    const stats = await db
      .prepare('SELECT streak_days FROM user_stats WHERE user_id = ?')
      .bind(auth.uid)
      .first<{ streak_days: number }>()
      .catch(() => null)
    streakDays = stats?.streak_days || 0
  }

  return {
    ...quota,
    streakDays,
    // 免费图片是「注册送 3 次、用完为止」，不再按天重置 → 没有下次重置时间。
    // 其余额度（music/text/付费）仍是 UTC 零点重置。
    resetAt: quota.image?.mode === 'daily'
      ? null
      : new Date(Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate() + 1,
      )).toISOString(),
  }
})
