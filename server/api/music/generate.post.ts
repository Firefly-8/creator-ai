/**
 * 音乐生成 API — D1 + MiniMax 实际调用
 * Phase 2: 接通 MiniMax + 用户同步 + 额度检查
 */

import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { nanoid } from 'nanoid'
import { encryptForStorage } from '../../utils/db'
import { checkQuota } from '../../utils/quota'
import { createJob, createSongDraft, updateJob, updateSong } from '../../utils/jobs'
import { getDecryptedApiKey, getMiniMaxBaseUrl } from '../../utils/secureConfig'
import { rateLimitMiddleware } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  // 1. 认证
  n  // 1.5 速率检查n  await rateLimitMiddleware(event, 'generate')n
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  // 2. 解析参数
  const body = await readBody(event)
  const mode = body?.mode || 'custom'
  const prompt = String(body?.prompt || '').trim()
  const lyrics = String(body?.lyrics || '').trim()
  const title = String(body?.title || '').trim()
  const model = body?.model || 'music-3.0'

  if (!prompt && !lyrics) {
    throw createError({ statusCode: 400, statusMessage: 'prompt or lyrics is required' })
  }

  // 3. 额度检查（免费版）
  const quota = checkQuota('free', 'music', 0) // TODO: 从 DB 获取已使用量
  if (!quota.allowed) {
    throw createError({ statusCode: 402, statusMessage: 'Quota exceeded. Please upgrade.' })
  }

  // 4. 创建歌曲记录 + 任务
  const song = await createSongDraft(auth.uid, {
    title: title || 'Untitled Track',
    prompt,
    lyrics,
    model,
    type: 'generate',
  })

  const job = await createJob(auth.uid, 'music', {
    prompt, lyrics, model, mode,
  }, song.id)

  // 5. 调用 MiniMax API
  try {
    const apiKey = await getDecryptedApiKey()
    const baseUrl = getMiniMaxBaseUrl()

    await updateJob(job.id, { status: 'processing' })

    const res = await fetch(`${baseUrl}/v1/music_generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        lyrics: mode === 'instrumental' ? undefined : lyrics,
        model,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`MiniMax error: ${res.status} ${errText}`)
    }

    const result = await res.json() as any

    // 6. 处理结果
    const audioUrl = result?.data?.audio_url || result?.data?.url
    if (!audioUrl) {
      throw new Error('No audio URL in response')
    }

    // 下载音频到 R2
    const { writeFile, inferContentType } = await import('../../utils/storage')
    const audioRes = await fetch(audioUrl)
    if (!audioRes.ok) throw new Error('Failed to download audio')
    const audioBlob = await audioRes.blob()
    const filename = `${song.id}.mp3`
    await writeFile('audio', filename, audioBlob, 'audio/mpeg')

    // 7. 更新状态
    await updateSong(song.id, {
      status: 'ready',
      audio_path: filename,
      duration_ms: result?.data?.duration_ms || 0,
    })

    await updateJob(job.id, {
      status: 'done',
      progress: '100%',
      result_json: JSON.stringify({ audioUrl }),
    })

    return {
      jobId: job.id,
      songId: song.id,
      status: 'ready',
      audioUrl: `/api/audio/${song.id}`,
    }
  } catch (err: any) {
    // 失败处理
    await updateSong(song.id, {
      status: 'failed',
      error_message: err.message?.slice(0, 500) || 'Generation failed',
    })
    await updateJob(job.id, {
      status: 'error',
      error_message: err.message?.slice(0, 500) || 'Generation failed',
    })

    throw createError({
      statusCode: 500,
      statusMessage: `Generation failed: ${err.message}`,
    })
  }
})
