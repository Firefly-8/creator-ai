/**
 * 图片生成 API — D1 + 加密版本
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
  const prompt = String(body?.prompt || '').trim()
  const scene = body?.scene || 'general'
  const model = body?.model === 'image-01-live' ? 'image-01-live' : 'image-01'
  const mode = body?.subject_reference || body?.uploadId ? 'i2i' : 't2i'
  const aspectRatio = body?.aspect_ratio || body?.aspectRatio || '1:1'

  if (!prompt) {
    throw createError({ statusCode: 400, statusMessage: 'prompt is required' })
  }

  const imageId = nanoid(12)
  const encryptedPrompt = await encryptForStorage(prompt)

  const apiKey = await getDecryptedApiKey()
  
  return {
    imageId,
    status: 'processing',
    message: 'Image generation started',
  }
})
