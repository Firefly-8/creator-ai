/**
 * GET /api/user/quota — 用户当前的额度状态
 *
 * ⚠️ 2026-10-21 修正：这里原来返回一张**写死的假表**
 *   （free: image 20 / music 10 / creator: image 200 …），
 *   客户端拿它减已用来显示「还剩多少」，但**生成接口压根不查它** ——
 *   看着像有配额，实际拦不住任何人。
 *   现在全部换成服务端真实计数（server/utils/daily-usage.ts）。
 */
import { defineEventHandler, getHeader, createError } from 'h3'
import { peekDailyQuota } from '../../utils/daily-usage'
import { FREE_DAILY_LIMITS, PAID_DAILY_LIMITS } from '../../../utils/pricing'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : ''

  if (!token) throw createError({ statusCode: 401 })

  const { verifyFirebaseToken } = await import('../../utils/firebase-verify')
  const payload = await verifyFirebaseToken(token)
  if (!payload) throw createError({ statusCode: 401 })

  const uid = payload.sub
  const quota = await peekDailyQuota(event, uid)

  return {
    plan: quota.plan,
    paid: quota.paid,
    credits: quota.credits,
    // 各档位的每日额度（免费档是白纸黑字写死的，付费档是放宽后的上限）
    limits: {
      free: {
        image: FREE_DAILY_LIMITS.image.verified,
        music: FREE_DAILY_LIMITS.music.verified,
        text: FREE_DAILY_LIMITS.text.verified,
      },
      paid: {
        image: PAID_DAILY_LIMITS.image.verified,
        music: PAID_DAILY_LIMITS.music.verified,
        text: PAID_DAILY_LIMITS.text.verified,
      },
    },
    usage: {
      image: quota.image,
      music: quota.music,
      text: quota.text,
      // 封面图走的是 image 档额度
      cover: quota.image,
    },
  }
})
