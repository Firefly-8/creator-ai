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

  // 检查是否有 admin 表记录
  const admin = await d1.prepare(
    'SELECT role FROM admins WHERE user_id = ?'
  ).bind(payload.sub).first()

  return { role: admin?.role || 'user' }
})
