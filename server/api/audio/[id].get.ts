/**
 * 音频文件服务 — R2 流式传输
 * Cloudflare Workers 兼容版本
 *
 * 鉴权走 server/utils/file-access.ts：
 *   - 签名 URL（页面里 <audio src> / 下载链接用的就是这个，浏览器带不了 Authorization 头）
 *   - 或 Bearer token（此时校验歌曲归属）
 */

import { defineEventHandler, getQuery, setHeader, createError } from 'h3'
import { getSong } from '../../utils/jobs'
import { readFile, inferContentType } from '../../utils/storage'
import { assertFileAccess } from '../../utils/file-access'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const song = await getSong(id)
  if (!song?.audio_path) throw createError({ statusCode: 404, statusMessage: 'Audio not found' })

  await assertFileAccess(event, { id, type: 'audio', ownerId: song.user_id })

  const query = getQuery(event)

  const obj = await readFile('audio', song.audio_path, event)
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
