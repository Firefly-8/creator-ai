/**
 * 音乐生成 API — D1 + 加密版本
 */

import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { nanoid } from 'nanoid'
import { encryptForStorage } from '../../utils/db'
import { checkQuota } from '../../utils/quota'
import { getDecryptedApiKey } from '../../utils/secureConfig'

export default defineEventHandler(async (event) => {
  const timestamp = getHeader(event, 'x-request-timestamp')
  const signature = getHeader(event, 'x-request-signature')
  
  if (!timestamp || !signature) {
    throw createError({ statusCode: 401, statusMessage: 'Missing request signature' })
  }

  const body = await readBody(event)
  const mode = body?.mode || 'custom'
  const prompt = String(body?.prompt || '').trim()
  const lyrics = String(body?.lyrics || '').trim()
  const title = String(body?.title || '').trim()
  const model = body?.model || 'music-3.0'

  if (mode === 'instrumental' || body?.is_instrumental) {
    if (!prompt) throw createError({ statusCode: 400, statusMessage: 'prompt is required for instrumental' })
  } else if (mode === 'simple' || body?.lyrics_optimizer) {
    if (!prompt) throw createError({ statusCode: 400, statusMessage: 'prompt is required' })
  } else if (!lyrics) {
    throw createError({ statusCode: 400, statusMessage: 'lyrics are required for custom mode' })
  }

  const jobId = nanoid(12)
  const songId = nanoid(12)
  
  const encryptedPrompt = await encryptForStorage(prompt)
  const encryptedLyrics = await encryptForStorage(lyrics)

  const apiKey = await getDecryptedApiKey()
  
  return {
    jobId,
    songId,
    status: 'processing',
    message: 'Music generation started',
  }
})
