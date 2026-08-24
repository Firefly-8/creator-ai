/**
 * 批量智能生图 API — 一句话需求 → M3 结构化拆解 → 多风格生成
 * 沿用 optimizeImagePrompt 的 prompt 规范，确保每个拆解出的 prompt 高质量
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { decomposePromptToBatch } from '../../utils/minimax'
import { createJob, updateJob } from '../../utils/jobs'
import { createImageRecord, updateImage, processImageResult } from '../../utils/images'
import { getDecryptedApiKey, getMiniMaxBaseUrl } from '../../utils/secureConfig'
import { rateLimitMiddleware } from '../../utils/rate-limit'

interface BatchImageResult {
  style: string
  colorMood: string
  status: 'ready' | 'failed'
  imageId: string | null
  imageUrl: string | null
  prompt: string
  error?: string
}

export default defineEventHandler(async (event) => {
  // 1. 认证
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  // 2. 速率限制
  await rateLimitMiddleware(event, 'generate')

  // 3. 解析参数
  const body = await readBody(event)
  const requirement = String(body?.requirement || '').trim()
  const scene = body?.scene || 'general'
  const aspectRatio = body?.aspect_ratio || body?.aspectRatio || '1:1'
  const model = body?.model === 'image-01-live' ? 'image-01-live' : 'image-01'
  const nPerPrompt = Math.min(2, Math.max(1, body?.nPerPrompt || 1))

  if (!requirement) {
    throw createError({ statusCode: 400, statusMessage: 'requirement is required' })
  }

  // 4. M3 结构化拆解 — 输出 4 个高质量 prompt
  let decomposed: { prompts: Array<{ style: string; prompt: string; colorMood: string }>; notes: string }

  try {
    decomposed = await decomposePromptToBatch({
      prompt: requirement,
      scene,
      aspectRatio,
    })
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      statusMessage: `需求拆解失败: ${err?.message || '请稍后重试'}`,
    })
  }

  const directions = decomposed.prompts.slice(0, 4)

  // 5. 创建批量任务
  const job = await createJob(auth.uid, 'image-batch', {
    requirement,
    scene,
    directions: directions.map(d => d.style),
  })

  // 6. 并行生成所有方向
  const results: BatchImageResult[] = await Promise.all(
    directions.map(async (dir) => {
      try {
        const image = await createImageRecord(auth.uid, {
          title: dir.style,
          prompt: requirement,
          promptFinal: dir.prompt,
          scene,
          model,
          mode: 't2i',
          aspectRatio,
        })

        const apiKey = await getDecryptedApiKey()
        const baseUrl = getMiniMaxBaseUrl()

        const res = await fetch(`${baseUrl}/v1/image_generation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            prompt: dir.prompt,
            model,
            aspect_ratio: aspectRatio,
            n: nPerPrompt,
            response_format: 'url',
            prompt_optimizer: true,
          }),
        })

        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`MiniMax: ${res.status} ${errText}`)
        }

        const result = await res.json() as any
        const imagePaths = await processImageResult(result)

        await updateImage(image.id, {
          status: 'ready',
          image_path: imagePaths[0] || null,
          prompt_final: dir.prompt,
        })

        return {
          style: dir.style,
          colorMood: dir.colorMood,
          status: 'ready' as const,
          imageId: image.id,
          imageUrl: imagePaths[0] ? `/api/images/${image.id}/file` : null,
          prompt: dir.prompt,
        }
      } catch (err: any) {
        return {
          style: dir.style,
          colorMood: dir.colorMood,
          status: 'failed' as const,
          imageId: null,
          imageUrl: null,
          prompt: dir.prompt,
          error: err?.message?.slice(0, 200) || '生成失败',
        }
      }
    }),
  )

  // 7. 更新任务状态
  const successCount = results.filter(r => r.status === 'ready').length
  await updateJob(job.id, {
    status: successCount > 0 ? 'done' : 'error',
    progress: '100%',
    result_json: JSON.stringify({ results, notes: decomposed.notes }),
  })

  return {
    jobId: job.id,
    requirement,
    notes: decomposed.notes,
    results,
    summary: {
      total: results.length,
      success: successCount,
      failed: results.length - successCount,
    },
  }
})
