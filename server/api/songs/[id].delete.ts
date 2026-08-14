/**
 * 删除歌曲（带用户验证）
 */
import { defineEventHandler, createError } from 'h3'
import { deleteSong } from '../../utils/jobs'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const song = await deleteSong(id, auth.uid)
  if (!song) throw createError({ statusCode: 404, statusMessage: 'Song not found' })

  return { ok: true }
})
