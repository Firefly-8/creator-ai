/**
 * GET /api/images/:id/final-file — 成品图文件服务（签名 URL）
 *
 * 和 /file 完全对称，只是读的是用户完成设计后合成的成品图（meta_json.finalPath）。
 * 签名 URL 由 publicImage() 生成；分享页、资产卡片里的 <img src> 用的就是它。
 */
import { defineEventHandler, setHeader, createError } from 'h3'
import { getImage } from '../../../utils/images'
import { readFile, inferContentType } from '../../../utils/storage'
import { assertFileAccess } from '../../../utils/file-access'
import { parseCardMeta } from '../../../utils/card-final'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const row = await getImage(id)
  const finalPath = row ? parseCardMeta(row.meta_json).finalPath : null
  if (!row || !finalPath) throw createError({ statusCode: 404, statusMessage: 'Final card not found' })

  await assertFileAccess(event, { id, type: 'image', ownerId: row.user_id })

  const obj = await readFile('image', finalPath, event)
  if (!obj) throw createError({ statusCode: 404, statusMessage: 'Final card file missing' })

  setHeader(event, 'Content-Type', inferContentType(finalPath))
  setHeader(event, 'Content-Length', String(obj.size))
  setHeader(event, 'Cache-Control', 'private, max-age=86400')

  return obj.body
})
