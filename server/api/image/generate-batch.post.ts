/**
 * 批量智能生图 API — 一句话需求 → M3 结构化拆解 → 多风格生成
 * 沿用 optimizeImagePrompt 的 prompt 规范，确保每个拆解出的 prompt 高质量
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { decomposePromptToBatch, generateImage } from '../../utils/minimax'
import { createJob, updateJob } from '../../utils/jobs'
import { createImageRecord, updateImage, processImageResult } from '../../utils/images'
import { rateLimitMiddleware } from '../../utils/rate-limit'
import { consumeDailyQuota, consumeQuota, refundDailyQuota, refundQuota } from '../../utils/daily-usage'
import { recordGenerationFailure } from '../../utils/failure-monitor'

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

  // 拆解需求本身要调 M3 —— 记 text 档
  await consumeDailyQuota(event, auth.uid, 'text')

  try {
    decomposed = await decomposePromptToBatch({
      prompt: requirement,
      scene,
      aspectRatio,
    })
  } catch (err: any) {
    // 需求拆解失败也是上游失败 —— 一样要进失败流水
    await recordGenerationFailure(event, {
      userId: auth.uid,
      endpoint: 'image/generate-batch:decompose',
      error: err,
    }).catch((e) => console.error('[failure-monitor] 记录失败出错:', e))

    await refundDailyQuota(event, auth.uid, 'text')
    throw createError({
      statusCode: 502,
      statusMessage: `需求拆解失败: ${err?.message || '请稍后重试'}`,
    })
  }

  const directions = decomposed.prompts.slice(0, 4)

  // ⚠️ 批量一次能出 4 方向 × 2 张 = 8 张图 —— 免费档必须按**实际张数**扣额度，
  // 否则一个请求就能把一天的额度一次掏空。
  // 付费档：整批算 **1 张卡**（一次会话 = 一张卡，用户从候选里挑一张）。
  const totalImages = directions.length * nPerPrompt
  const batchQuota = await consumeQuota(event, auth.uid, 'image', totalImages)

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

        // ⚠️ 走 generateImage（内部会检查 base_resp.status_code）：
        //   MiniMax 的业务错误（2056 额度耗尽 / 1008 余额不足…）是 HTTP 200，
        //   只判断 res.ok 会把「额度用完」走成「成功但没图」的静默失败。
        const result = await generateImage({
          prompt: dir.prompt,
          model,
          aspect_ratio: aspectRatio,
          n: nPerPrompt,
          response_format: 'url',
          prompt_optimizer: true,
        })

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
        // 失败流水 + 多用户失败告警判定
        // ⚠️ 一个方向失败会记 1 条流水（批量 4 个方向 = 最多 4 条，但都是同一个用户）
        //    —— 告警判定用的是**不同用户数**，所以一个人连点 20 次不会误报。
        await recordGenerationFailure(event, {
          userId: auth.uid,
          endpoint: 'image/generate-batch',
          error: err,
        }).catch((e) => console.error('[failure-monitor] 记录失败出错:', e))

        // 这个方向失败了 → 免费档把它占掉的每日额度退回去
        // 付费档不退卡：整批只扣了 1 张，而且这个方向失败不代表整批颗粒无收，
        // 退卡会让「故意让一个方向失败」变成薅卡漏洞。
        if (batchQuota.mode !== 'credit') {
          await refundQuota(event, auth.uid, 'image', nPerPrompt, 'daily')
        }
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
