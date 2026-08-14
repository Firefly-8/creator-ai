/**
 * 获取单首歌曲详情（带用户验证）
 */
import { defineEventHandler, createError } from 'h3'
import { getSong, publicSong } from '../../utils/jobs'
import { decryptSongFields } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  
  const song = await getSong(id, auth.uid)
  if (!song) throw createError({ statusCode: 404, statusMessage: 'Song not found' })
  
  const decrypted = await decryptSongFields(song)
  return { song: publicSong(decrypted) }
})
