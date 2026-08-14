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
  if (!payload) throw createError({ statusCode: 401, statusMessage: 'Invalid token' })

  const uid = payload.sub
  const body = await readBody(event)

  const {
    source = 'creator',
    type = 'other',
    contentId,
    title = '',
    message = '',
  } = body || {}

  // 校验
  if (!message.trim()) throw createError({ statusCode: 400, statusMessage: 'Message is required' })
  if (!['creator', 'pdf'].includes(source)) throw createError({ statusCode: 400, statusMessage: 'Invalid source' })
  if (!['bug', 'feature', 'content', 'other'].includes(type)) throw createError({ statusCode: 400, statusMessage: 'Invalid type' })

  const d1 = (globalThis as any).DB as D1Database
  if (!d1) throw createError({ statusCode: 500, statusMessage: 'DB not available' })

  const id = nanoid(12)
  const now = new Date().toISOString()

  await d1.prepare(`
    INSERT INTO feedback (id, user_id, source, type, content_id, title, message, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
  `).bind(id, uid, source, type, contentId || null, title.slice(0, 200), message.slice(0, 5000), now, now).run()

  return { success: true, id }
})
