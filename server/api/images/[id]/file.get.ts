/**
 * 图片文件服务 — R2 流式传输
 * Cloudflare Workers 兼容版本
 *
 * 鉴权走 server/utils/file-access.ts：
 *   - 签名 URL（页面里 <img src> 用的就是这个，浏览器带不了 Authorization 头）
 *   - 或 Bearer token（此时校验图片归属，防止读别人的图）
 */

import { defineEventHandler, setHeader, createError } from 'h3'
import { getImage } from '../../../utils/images'
import { readFile, inferContentType } from '../../../utils/storage'
import { assertFileAccess } from '../../../utils/file-access'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const row = await getImage(id)
  if (!row?.image_path) throw createError({ statusCode: 404, statusMessage: 'Image not found' })

  await assertFileAccess(event, { id, type: 'image', ownerId: row.user_id })

  const obj = await readFile('image', row.image_path, event)
  if (!obj) throw createError({ statusCode: 404, statusMessage: 'Image file missing' })

  setHeader(event, 'Content-Type', inferContentType(row.image_path))
  setHeader(event, 'Content-Length', String(obj.size))
  // private：这是签名 URL，授权给特定用户，别让共享缓存存
  setHeader(event, 'Cache-Control', 'private, max-age=86400')

  return obj.body
})
