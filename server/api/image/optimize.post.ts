export default defineEventHandler(async (event) => {
  assertAppSecret(event)
  const body = await readBody(event)
  const prompt = String(body?.prompt || '').trim()
  if (!prompt) throw createError({ statusCode: 400, statusMessage: 'prompt is required' })

  try {
    const result = await createOptimizedPrompt({
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
