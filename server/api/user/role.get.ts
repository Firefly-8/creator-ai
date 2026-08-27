/**
 * GET /api/user/role — 获取当前用户角色
 */
import { defineEventHandler, getHeader, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : ''
  if (!token) throw createError({ statusCode: 401 })

  const { verifyFirebaseToken } = await import('../../utils/firebase-verify')
  const payload = await verifyFirebaseToken(token)
  if (!payload) throw createError({ statusCode: 401 })

  const { getDB } = await import('../../utils/db-runtime')
  const d1 = getDB(event)
  if (!d1) throw createError({ statusCode: 500 })

  // 检查用户特权表是否有 admin 记录
  const priv = await d1.prepare(
    "SELECT privilege FROM user_privileges WHERE user_id = ? AND privilege = 'admin' LIMIT 1"
  ).bind(payload.sub).first()

  return { role: priv ? 'admin' : 'user' }
})
