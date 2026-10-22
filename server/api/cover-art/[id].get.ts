/**
 * 封面图服务 — R2 流式传输
 * Cloudflare Workers 兼容版本
 *
 * 鉴权走 server/utils/file-access.ts：
 *   - 签名 URL（页面里 <img src> 用的就是这个，浏览器带不了 Authorization 头）
 *   - 或 Bearer token（此时校验歌曲归属）
 */

import { defineEventHandler, setHeader, createError } from 'h3'
import { getSong, ensureSongCover } from '../../utils/jobs'
import { readFile } from '../../utils/storage'
import { assertFileAccess } from '../../utils/file-access'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  let song = await getSong(id)
  if (!song) throw createError({ statusCode: 404, statusMessage: 'Song not found' })

  await assertFileAccess(event, { id, type: 'cover', ownerId: song.user_id })

  if (!song.cover_path) {
    song = await ensureSongCover(song)
  }
  if (!song?.cover_path) throw createError({ statusCode: 404, statusMessage: 'Cover not found' })

  const obj = await readFile('cover', song.cover_path, event)
  if (!obj) throw createError({ statusCode: 404, statusMessage: 'Cover file missing' })

  setHeader(event, 'Content-Type', 'image/svg+xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'private, max-age=3600')
  setHeader(event, 'Content-Length', String(obj.size))

  return obj.body
})
