/**
 * GET /api/user/usage — 今天还能生成几次
 *
 * 前端显示「今天还剩 N 次」用这个。
 * 额度是**服务端强制的**（server/utils/daily-usage.ts），这里只是把状态读出来。
 */
import { defineEventHandler, createError } from 'h3'
import { peekDailyQuota } from '../../utils/daily-usage'
import { getDB } from '../../utils/db-runtime'
import { FREE_MAX_IMAGES_PER_RUN, PAID_MAX_IMAGES_PER_RUN } from '../../../utils/pricing'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  const quota = await peekDailyQuota(event, auth.uid)

  // 单次生成最多出几张 —— 前端要据此决定「出图张数」选择器给几档
  // （免费 2 张 / 付费 4 张；服务端还会再 clamp 一次，客户端不算安全边界）
  const maxImagesPerRun = quota.image?.mode === 'daily'
    ? FREE_MAX_IMAGES_PER_RUN
    : PAID_MAX_IMAGES_PER_RUN

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
    image: { ...quota.image, maxPerRun: maxImagesPerRun },
    streakDays,
    // resetAt：UTC 零点 = 下一个额度日
    resetAt: new Date(Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate() + 1,
    )).toISOString(),
  }
})
