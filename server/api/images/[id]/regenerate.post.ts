/**
 * 重新生成图片
 */
import { defineEventHandler, createError } from 'h3'
import { regenerateImage, publicImage } from '../../../utils/images'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const rows = await regenerateImage(id)
  return {
    images: rows.map(publicImage),
    promptFinal: rows[0]?.prompt_final || null,
  }
})
