/**
 * 获取当前用户的反馈列表
 */
import { defineEventHandler, createError } from 'h3'
import { getHeader, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : ''
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Missing token' })

  const { verifyFirebaseToken } = await import('../../utils/firebase-verify')
  const payload = await verifyFirebaseToken(token)
  if (!payload) throw createError({ statusCode: 401, statusMessage: 'Invalid token' })

  const uid = payload.sub
  const query = getQuery(event)
  const status = query.status as string | undefined

  const { getDB } = await import('../../utils/db-runtime')
  const d1 = getDB(event)
  if (!d1) throw createError({ statusCode: 500, statusMessage: 'DB not available' })

  let sql = 'SELECT * FROM feedback WHERE user_id = ?'
  const params: any[] = [uid]

  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }

  sql += ' ORDER BY created_at DESC LIMIT 50'

  const result = await d1.prepare(sql).bind(...params).all()
  return { items: result.results || [] }
})
