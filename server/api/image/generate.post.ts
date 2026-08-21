/**
 * 图片生成 API — D1 + MiniMax
 * 自动 prompt 优化 + 场景增强
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { createJob, updateJob } from '../../utils/jobs'
import { createImageRecord, updateImage, processImageResult } from '../../utils/images'
import { getDecryptedApiKey, getMiniMaxBaseUrl } from '../../utils/secureConfig'
import { rateLimitMiddleware } from '../../utils/rate-limit'
import { optimizeImagePrompt } from '../../utils/minimax'

export default defineEventHandler(async (event) => {
  // 1. 认证
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  // 1.5 速率检查
  await rateLimitMiddleware(event, 'generate')

  // 2. 解析参数
  const body = await readBody(event)
  let prompt = String(body?.prompt || '').trim()
  const scene = body?.scene || 'general'
  const model = body?.model === 'image-01-live' ? 'image-01-live' : 'image-01'
  const mode = body?.subject_reference || body?.uploadId ? 'i2i' : 't2i'
  const aspectRatio = body?.aspect_ratio || body?.aspectRatio || '1:1'
  const count = Math.min(4, Math.max(1, body?.n || 1))
  const deepOptimize = !!body?.deepOptimize
  const usePromptOptimizer = body?.promptOptimizer !== false // 默认开启

  if (!prompt) {
    throw createError({ statusCode: 400, statusMessage: 'prompt is required' })
  }

  // 3. 自动 Prompt 优化（深度优化走两步，普通优化走一步）
  let finalPrompt = prompt
  let optimizeNotes = ''

  try {
    if (deepOptimize) {
      // 深度优化：M3 重写 + 场景增强
      const optimized = await optimizeImagePrompt({
        prompt,
        scene,
        aspectRatio,
      })
      finalPrompt = optimized.optimized
      optimizeNotes = optimized.notes
    } else if (usePromptOptimizer) {
      // 普通优化：仅场景关键词注入 + MiniMax 内置 optimizer
      finalPrompt = injectSceneKeywords(prompt, scene)
    }
  } catch (err) {
    // 优化失败不阻断，用原始 prompt
    console.warn('[Image Generate] Prompt optimization failed:', err)
  }

  // 4. 创建图片记录 + 任务
  const image = await createImageRecord(auth.uid, {
    prompt,
    prompt_final: finalPrompt,
    scene,
    model,
    mode,
    aspectRatio,
  })

  const job = await createJob(auth.uid, 'image', {
    prompt, prompt_final: finalPrompt, scene, model, mode, aspectRatio,
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
        prompt: finalPrompt,
        model,
        aspect_ratio: aspectRatio,
        n: count,
        response_format: 'url',
        prompt_optimizer: true, // ✅ 始终开启 MiniMax 内置优化
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
      prompt_final: finalPrompt,
    })

    await updateJob(job.id, {
      status: 'done',
      progress: '100%',
      result_json: JSON.stringify({ imagePaths, promptFinal: finalPrompt }),
    })

    return {
      jobId: job.id,
      imageId: image.id,
      status: 'ready',
      imageUrl: imagePaths[0] ? `/api/images/${image.id}/file` : null,
      promptFinal: finalPrompt,
      notes: optimizeNotes,
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

/**
 * 场景关键词注入 — 在用户 prompt 中补充场景相关的质量关键词
 */
function injectSceneKeywords(prompt: string, scene: string): string {
  const sceneKeywords: Record<string, string> = {
    logo: ', clean vector, flat design, minimal, centered, high contrast, scalable, professional brand mark',
    ui: ', modern UI design, clean hierarchy, readable layout, professional product design, high-end interface',
    design: ', editorial design, bold typography, Swiss layout, print-ready, professional composition',
    portrait: ', cinematic portrait, soft lighting, shallow depth of field, natural skin detail, 85mm lens, photorealistic',
    product: ', studio product photography, softbox lighting, commercial catalog, sharp material detail, professional',
    album: ', album cover art, cinematic color grade, atmospheric, professional music artwork, square composition',
    general: ', high quality, detailed, professional, sharp focus, well-composed',
  }

  const suffix = sceneKeywords[scene] || sceneKeywords.general
  // 避免重复添加
  const lowerPrompt = prompt.toLowerCase()
  const alreadyHasKeywords = Object.values(sceneKeywords).some(kw =>
    kw.split(',').some(w => lowerPrompt.includes(w.trim().toLowerCase()))
  )

  if (alreadyHasKeywords) return prompt
  return prompt + suffix
}
