/**
 * PATCH /api/songs/:id/public — 切换作品公开状态
 */
import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
import { getDB } from '../../../utils/db-runtime'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  const body = await readBody(event)
  const isPublic = !!body.isPublic

  const db = getDB(event)
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database not available' })

  // 验证所有权
  const song = await db.prepare(
    'SELECT id FROM songs WHERE id = ? AND user_id = ?'
  ).bind(id, auth.uid).first()

  if (!song) throw createError({ statusCode: 404, statusMessage: 'Song not found' })

  await db.prepare(
    'UPDATE songs SET is_public = ?, updated_at = ? WHERE id = ?'
  ).bind(isPublic ? 1 : 0, new Date().toISOString(), id).run()

  return { id, isPublic }
})
