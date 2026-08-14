/**
 * 图片生成 API — D1 + MiniMax 实际调用
 * Phase 2: 接通 MiniMax + 用户同步 + 额度检查
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { nanoid } from 'nanoid'
import { encryptForStorage } from '../../utils/db'
import { checkQuota } from '../../utils/quota'
import { createJob, updateJob } from '../../utils/jobs'
import { createImageRecord, updateImage, processImageResult } from '../../utils/images'
import { getDecryptedApiKey, getMiniMaxBaseUrl } from '../../utils/secureConfig'
import { rateLimitMiddleware } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  // 1. 认证
  n  // 1.5 速率检查n  await rateLimitMiddleware(event, 'generate')n
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  // 2. 解析参数
  const body = await readBody(event)
  const prompt = String(body?.prompt || '').trim()
  const scene = body?.scene || 'general'
  const model = body?.model === 'image-01-live' ? 'image-01-live' : 'image-01'
  const mode = body?.subject_reference || body?.uploadId ? 'i2i' : 't2i'
  const aspectRatio = body?.aspect_ratio || body?.aspectRatio || '1:1'

  if (!prompt) {
    throw createError({ statusCode: 400, statusMessage: 'prompt is required' })
  }

  // 3. 额度检查
  const quota = checkQuota('free', 'image', 0) // TODO: 从 DB 获取已使用量
  if (!quota.allowed) {
    throw createError({ statusCode: 402, statusMessage: 'Quota exceeded' })
  }

  // 4. 创建图片记录 + 任务
  const image = await createImageRecord(auth.uid, {
    prompt,
    scene,
    model,
    mode,
    aspectRatio,
  })

  const job = await createJob(auth.uid, 'image', {
    prompt, scene, model, mode, aspectRatio,
  })

  // 5. 调用 MiniMax API
  try {
    const apiKey = await getDecryptedApiKey()
    const baseUrl = getMiniMaxBaseUrl()

    await updateJob(job.id, { status: 'processing' })

    const res = await fetch(`${baseUrl}/v1/image_generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        model,
        aspect_ratio: aspectRatio,
        ...(mode === 'i2i' && body?.uploadId ? { subject_reference: body.uploadId } : {}),
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`MiniMax error: ${res.status} ${errText}`)
    }

    const result = await res.json() as any

    // 6. 处理图片结果（下载到 R2）
    const imagePaths = await processImageResult(result)

    await updateImage(image.id, {
      status: 'ready',
      image_path: imagePaths[0] || null,
      prompt_final: prompt,
    })

    await updateJob(job.id, {
      status: 'done',
      progress: '100%',
      result_json: JSON.stringify({ imagePaths }),
    })

    return {
      jobId: job.id,
      imageId: image.id,
      status: 'ready',
      imageUrl: imagePaths[0] ? `/api/images/${image.id}/file` : null,
    }
  } catch (err: any) {
    await updateImage(image.id, {
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
