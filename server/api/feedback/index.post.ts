/**
 * 提交反馈 — 前端用户提交内容反馈
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getHeader } from 'h3'
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  // 验证 Token
  const authHeader = getHeader(event, 'authorization')
  const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : ''
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Missing token' })

  const { verifyFirebaseToken } = await import('../../utils/firebase-verify')
  const payload = await verifyFirebaseToken(token)
  
  if (!payload) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired token' })
  }

  const body = await readBody(event)
  const { type, message, contentId, source } = body || {}

  if (!type || !message) {
    throw createError({ statusCode: 400, statusMessage: 'Type and message are required' })
  }

  const { getDB } = await import('../../utils/db-runtime')
  const d1 = getDB(event)
  if (!d1) throw createError({ statusCode: 500, statusMessage: 'DB not available' })

  const id = nanoid(12)
  await d1.prepare(`
    INSERT INTO feedback (id, user_id, type, message, content_id, source, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'open', datetime('now'), datetime('now'))
  `).bind(
    id,
    payload.uid,
    type,
    message,
    contentId || null,
    source || 'creator'
  ).run()

  return { success: true, id }
})
