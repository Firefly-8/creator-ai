/**
 * 图片文件服务 — R2 流式传输
 * Cloudflare Workers 兼容版本
 */

import { defineEventHandler, setHeader, createError } from 'h3'
import { getImage } from '../../../utils/images'
import { readFile, inferContentType } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const row = await getImage(id)
  if (!row?.image_path) throw createError({ statusCode: 404, statusMessage: 'Image not found' })

  const obj = await readFile('image', row.image_path)
  if (!obj) throw createError({ statusCode: 404, statusMessage: 'Image file missing' })

  setHeader(event, 'Content-Type', inferContentType(row.image_path))
  setHeader(event, 'Content-Length', String(obj.size))
  setHeader(event, 'Cache-Control', 'public, max-age=86400')

  return obj.body
})
