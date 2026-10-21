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
import { buildSubjectReference, type SubjectReference } from '../../utils/image-reference'
import { buildScenarioPrompt } from '../../../utils/imageScenarios'
import { consumeDailyQuota, refundDailyQuota } from '../../utils/daily-usage'

export default defineEventHandler(async (event) => {
  console.log("[Image Generate] === Start ===")
  // 1. 认证
  const auth = event.context.auth
  console.log("[Image Generate] auth:", auth ? `uid=${auth.uid}` : "null")
  if (!auth?.uid) throw createError({ statusCode: 401 })

  // 1.5 速率检查
  console.log("[Image Generate] Checking rate limit...")
  await rateLimitMiddleware(event, 'generate')
  console.log("[Image Generate] Rate limit OK")

  // 2. 解析参数
  const body = await readBody(event)
  let prompt = String(body?.prompt || '').trim()
  const scene = body?.scene || 'general'
  // 客户端显式指定了模型才算「用户选择」；场景模式不传 model，服务端自己定
  const modelExplicit = body?.model === 'image-01-live' || body?.model === 'image-01' ? body.model : ''
  const model = modelExplicit === 'image-01-live' ? 'image-01-live' : 'image-01'
  const mode = body?.uploadId ? 'i2i' : 't2i'
  const aspectRatio = body?.aspect_ratio || body?.aspectRatio || '1:1'
  const count = Math.min(4, Math.max(1, body?.n || 1))
  const deepOptimize = !!body?.deepOptimize
  // 客户端可以显式传 true/false；不传时 t2i 开、i2i 关（参考图会压制画风）
  const promptOptimizerRaw = body?.promptOptimizer
  const usePromptOptimizer = promptOptimizerRaw !== false

  // 2.1 场景化生图：传了 scenario 就由服务端按「场景 + 画风 + 名字」拼 prompt，
  //     客户端不写 prompt（中老年用户不会写）
  let scenarioUsed = ''
  if (body?.scenario) {
    const built = buildScenarioPrompt(
      String(body.scenario),
      String(body?.style || ''),
      String(body?.name || ''),
      String(body?.extra || ''),
    )
    if (built) {
      prompt = built.prompt
      scenarioUsed = built.scenario.id
    }
  }

  if (!prompt) {
    throw createError({ statusCode: 400, statusMessage: 'prompt is required' })
  }

  // 2.2 每日免费额度（服务端强制，客户端绕不过）
  //     ⚠️ 必须按**实际出图张数**扣 —— 客户端可以传 n（最多 4），
  //     一次请求出 4 张图，扣 1 次额度就是白送 3 张。
  //     必须在调 MiniMax 之前扣 —— 否则并发请求会超发。
  //     失败时在 catch 里按张数退还（用户没拿到图就不该扣）。
  for (let i = 0; i < count; i++) {
    await consumeDailyQuota(event, auth.uid, 'image')
  }

  // 3. 自动 Prompt 优化（深度优化走两步，普通优化走一步）
  //    场景化生图的 prompt 已经按「场景+画风」拼好了，不能再被优化器改写，
  //    否则会稀释用户选的画风（实测 watercolor/anime 会被压成照片风）
  let finalPrompt = prompt
  let optimizeNotes = ''

  if (!scenarioUsed) {
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
      } else if (usePromptOptimizer && mode !== 'i2i') {
        // 普通优化：仅场景关键词注入 + MiniMax 内置 optimizer
        // i2i 时不注入通用场景词，避免和用户选的画风打架
        finalPrompt = injectSceneKeywords(prompt, scene)
      }
    } catch (err) {
      // 优化失败不阻断，用原始 prompt
      console.warn('[Image Generate] Prompt optimization failed:', err)
    }
  }

  // 4. 创建图片记录 + 任务
  const image = await createImageRecord(auth.uid, {
    prompt,
    prompt_final: finalPrompt,
    // ⚠️ 存 scenario id（而不是 body.scene 的 'general'）——
    //    「My cards」列表要按场景显示「给妈妈的生日卡」这类人话，
    //    存 'general' 就只能显示一个泛泛的标签。
    scene: scenarioUsed || scene,
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

    // i2i（主体参考）：参考图要转成 MiniMax 认的格式，且必须用 image-01-live
    let subjectReference: SubjectReference[] | undefined
    let finalModel = model
    if (mode === 'i2i' && body?.uploadId) {
      subjectReference = await buildSubjectReference(String(body.uploadId))
      // image-01-live 才是 i2i 的主力模型（实测 subject_reference 在它上面稳定生效）。
      // 高级模式里用户显式选了 image-01 就尊重用户选择（它支持自定义宽高，做打印尺寸用）；
      // 场景模式不传 model，这里默认走 image-01-live。
      finalModel = modelExplicit === 'image-01' ? 'image-01' : 'image-01-live'
    }

    await updateJob(job.id, { status: 'processing' })

    console.log("[Image Generate] Calling MiniMax API...")
  const res = await fetch(`${baseUrl}/v1/image_generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        model: finalModel,
        aspect_ratio: aspectRatio,
        n: count,
        response_format: 'url',
        // 参考图会强烈压制画风（实测：开优化器时 watercolor/anime 会被压成照片风），
        // 所以 i2i 默认关掉优化器，让用户选的风格词占主导
        prompt_optimizer: mode === 'i2i'
          ? promptOptimizerRaw === true
          : usePromptOptimizer,
        ...(subjectReference ? { subject_reference: subjectReference } : {}),
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
      scenario: scenarioUsed || null,
    }
  } catch (err: any) {
    // 生成失败 → 把额度按张数退回去（用户什么都没拿到）
    for (let i = 0; i < count; i++) {
      await refundDailyQuota(event, auth.uid, 'image')
    }
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
