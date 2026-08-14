/**
 * 获取当前用户的歌曲列表
 */
import { defineEventHandler, createError } from 'h3'
import { listSongs, publicSong } from '../../utils/jobs'
import { decryptSongFields } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  const songs = await listSongs(auth.uid, 100)
  
  // 解密敏感字段
  const result = []
  for (const song of songs) {
    const decrypted = await decryptSongFields(song)
    result.push(publicSong(decrypted))
  }

  return { songs: result }
})
