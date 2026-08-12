/**
 * 歌曲列表 — D1 版本
 */

import { defineEventHandler } from 'h3'
import { listSongs, publicSong, ensureSongCover, getJobBySongId } from '../../utils/jobs'

export default defineEventHandler(async () => {
  const songs = await listSongs(100)
  
  const result = []
  for (const song of songs) {
    // 检查进行中的任务是否仍然有效
    if (song.status === 'generating') {
      const job = await getJobBySongId(song.id)
      if (!job || !['queued', 'generating', 'downloading'].includes(job.status)) {
        continue // 跳过无效的进行中状态
      }
    }
    
    // 确保有封面
    if (song.status === 'ready' && !song.cover_path) {
      const updated = await ensureSongCover(song)
      result.push(publicSong(updated))
    } else {
      result.push(publicSong(song))
    }
  }

  return { songs: result }
})
