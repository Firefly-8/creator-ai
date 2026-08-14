/**
 * 删除图片
 */
import { defineEventHandler, createError } from 'h3'
import { getImage, deleteImage } from '../../utils/images'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  const row = await getImage(id)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  await deleteImage(id)
  return { ok: true }
})
