/**
 * 获取用户当前额度状态
 */

import { defineEventHandler, getHeader, createError } from 'h3'
import { checkUserQuota, getAllQuotas } from '../../utils/quota'
import { getDB } from '../../utils/db-runtime'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : ''

  if (!token) throw createError({ statusCode: 401 })

  const { verifyFirebaseToken } = await import('../../utils/firebase-verify')
  const payload = await verifyFirebaseToken(token)
  if (!payload) throw createError({ statusCode: 401 })

  const uid = payload.sub
  const d1 = getDB(event)
  if (!d1) throw createError({ statusCode: 500 })

  const plan = await (async () => {
    const sub = await d1.prepare('SELECT plan FROM subscriptions WHERE user_id = ?').bind(uid).first<{ plan: string }>()
    return sub?.plan || 'free'
  })()

  const [music, image, lyrics, cover] = await Promise.all([
    checkUserQuota(d1, uid, 'music'),
    checkUserQuota(d1, uid, 'image'),
    checkUserQuota(d1, uid, 'lyrics'),
    checkUserQuota(d1, uid, 'cover'),
  ])

  return {
    plan,
    quotas: {
      free: getAllQuotas('free'),
      creator: getAllQuotas('creator'),
      pro: getAllQuotas('pro'),
    },
    usage: {
      music,
      image,
      lyrics,
      cover,
    },
  }
})
