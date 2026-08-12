/**
 * 删除歌曲 — D1 版本
 */

import { defineEventHandler, createError } from 'h3'
import { getSong, deleteSong } from '../../utils/jobs'
import { dbAll } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const song = await getSong(id)
  if (!song) throw createError({ statusCode: 404, statusMessage: 'Song not found' })

  // 获取关联版本
  const versions = await dbAll<{ audio_path: string }>(
    'SELECT audio_path FROM song_versions WHERE song_id = ?',
    [id]
  )

  // 删除主记录和关联文件
  await deleteSong(id)

  return { ok: true }
})
