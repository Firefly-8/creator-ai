/**
 * 重新生成歌曲
 */
import { defineEventHandler, createError } from 'h3'
import { regenerateSong } from '../../../utils/jobs'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  return regenerateSong(id)
})
