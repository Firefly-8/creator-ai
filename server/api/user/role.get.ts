/**
 * GET /api/user/role — 获取当前用户角色
 */
import { defineEventHandler, getHeader, createError } from 'h3'

export default defineEventHandler(async (event) => {
  console.log('[Role] === Start ===')
  const authHeader = getHeader(event, 'authorization')
  const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : ''
  console.log('[Role] Has token:', !!token)
  if (!token) throw createError({ statusCode: 401 })

  console.log('[Role] Verifying Firebase token...')
  const { verifyFirebaseToken } = await import('../../utils/firebase-verify')
  const payload = await verifyFirebaseToken(token)
  console.log('[Role] Token verification result:', payload ? `OK (uid=${payload.sub})` : 'null')
  if (!payload) throw createError({ statusCode: 401 })

  console.log('[Role] Getting D1 database...')
  const { getDB } = await import('../../utils/db-runtime')
  const d1 = getDB(event)
  console.log('[Role] D1 result:', d1 ? 'DB found' : 'DB is null/undefined')
  if (!d1) throw createError({ statusCode: 500 })

  // 检查用户特权表是否有 admin 记录
  const priv = await d1.prepare(
    "SELECT privilege FROM user_privileges WHERE user_id = ? AND privilege = 'admin' LIMIT 1"
  ).bind(payload.sub).first()

  return { role: priv ? 'admin' : 'user' }
})
