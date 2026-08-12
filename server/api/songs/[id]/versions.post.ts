/**
 * 上传歌曲版本 — D1 + R2 版本
 */

import { defineEventHandler, createError, readMultipartFormData } from 'h3'
import { nanoid } from 'nanoid'
import { getSong, publicSong, updateSong } from '../../../utils/jobs'
import { writeFile } from '../../../utils/storage'
import { dbRun, nowIso } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const song = await getSong(id)
  if (!song) throw createError({ statusCode: 404, statusMessage: 'Song not found' })

  const form = await readMultipartFormData(event)
  if (!form?.length) throw createError({ statusCode: 400, statusMessage: 'No file' })

  const file = form.find((p) => p.name === 'file' || p.name === 'audio')
  const modePart = form.find((p) => p.name === 'mode')
  const labelPart = form.find((p) => p.name === 'label')
  const durationPart = form.find((p) => p.name === 'durationMs')

  if (!file?.data?.length) throw createError({ statusCode: 400, statusMessage: 'Missing audio' })

  const mode = (modePart?.data?.toString() || 'version') as 'version' | 'replace'
  const label = labelPart?.data?.toString() || 'cropped'
  const durationMs = Number(durationPart?.data?.toString() || 0)
  const filename = `${id}-${nanoid(8)}.wav`

  // 上传到 R2
  await writeFile('audio', filename, file.data as any, 'audio/wav')

  // 记录版本
  const versionId = nanoid(12)
  await dbRun(
    `INSERT INTO song_versions (id, song_id, version, audio_path, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [versionId, id, 1, filename, nowIso()]
  )

  if (mode === 'replace') {
    await updateSong(id, {
      audio_path: filename,
      duration_ms: durationMs || song.duration_ms,
      type: 'edit' as any,
    })
  }

  const updated = await getSong(id)
  return {
    song: publicSong(updated!),
    version: {
      id: versionId,
      label,
      audioUrl: `/api/audio/${id}`,
      durationMs,
    },
  }
})
