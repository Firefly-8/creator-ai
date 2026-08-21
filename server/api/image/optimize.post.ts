/**
 * POST /api/image/optimize — Prompt 优化（手动触发）
 * 使用 MiniMax-M3 重写用户 prompt，提升生成质量
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { optimizeImagePrompt, MiniMaxError, resolveMiniMaxUserMessage } from '../../utils/minimax'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  const body = await readBody(event)
  const prompt = String(body?.prompt || '').trim()
  if (!prompt) throw createError({ statusCode: 400, statusMessage: 'prompt is required' })

  try {
    const result = await optimizeImagePrompt({
      prompt,
      scene: body?.scene || 'general',
      aspectRatio: body?.aspect_ratio || body?.aspectRatio || '1:1',
    })
    return result
  } catch (err: any) {
    if (err instanceof MiniMaxError) {
      throw createError({
        statusCode: 502,
        statusMessage: await resolveMiniMaxUserMessage(err.statusCode, err.message),
      })
    }
    throw err
  }
})
