/**
 * 音频文件服务 — R2 流式传输 + 签名 URL 验证
 * Cloudflare Workers 兼容版本
 */

import { defineEventHandler, getQuery, getHeader, setHeader, setResponseStatus, createError } from 'h3'
import { getSong } from '../../utils/jobs'
import { readFile, inferContentType } from '../../utils/storage'
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

  const isValid = await verifySignedUrl(id, 'audio', expires as string, signature as string)
  if (!isValid) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied: invalid or expired URL' })
  }

  const song = await getSong(id)
  if (!song?.audio_path) throw createError({ statusCode: 404, statusMessage: 'Audio not found' })

  const obj = await readFile('audio', song.audio_path)
  if (!obj) throw createError({ statusCode: 404, statusMessage: 'Audio file missing' })

  const contentType = inferContentType(song.audio_path)

  if (query.download) {
    setHeader(event, 'Content-Disposition', `attachment; filename="${song.title || id}.mp3"`)
  }

  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Cache-Control', 'private, max-age=3600')
  setHeader(event, 'Content-Length', String(obj.size))

  // R2ObjectBody 是 ReadableStream，直接返回
  return obj.body
})
