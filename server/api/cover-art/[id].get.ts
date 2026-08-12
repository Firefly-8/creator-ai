/**
 * 封面图服务 — R2 流式传输 + 签名 URL 验证
 * Cloudflare Workers 兼容版本
 */

import { defineEventHandler, getQuery, setHeader, createError } from 'h3'
import { getSong, ensureSongCover } from '../../utils/jobs'
import { readFile } from '../../utils/storage'
import { verifySignedUrl } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  // 验证签名 URL
  const query = getQuery(event)
  const { expires, signature } = query

  if (!expires || !signature) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied: signed URL required' })
  }

  const isValid = await verifySignedUrl(id, 'cover', expires as string, signature as string)
  if (!isValid) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied: invalid or expired URL' })
  }

  let song = await getSong(id)
  if (!song) throw createError({ statusCode: 404, statusMessage: 'Song not found' })

  if (!song.cover_path) {
    song = await ensureSongCover(song)
  }
  if (!song?.cover_path) throw createError({ statusCode: 404, statusMessage: 'Cover not found' })

  const obj = await readFile('cover', song.cover_path)
  if (!obj) throw createError({ statusCode: 404, statusMessage: 'Cover file missing' })

  setHeader(event, 'Content-Type', 'image/svg+xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'private, max-age=3600')
  setHeader(event, 'Content-Length', String(obj.size))

  return obj.body
})
