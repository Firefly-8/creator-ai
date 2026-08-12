
export default defineEventHandler(async (event) => {
  assertAppSecret(event)
  const body = await readBody(event)

  if (!body?.mode || !['write_full_song', 'edit'].includes(body.mode)) {
    throw createError({ statusCode: 400, statusMessage: 'mode must be write_full_song or edit' })
  }

  try {
    const result = await generateLyrics({
      mode: body.mode,
      prompt: body.prompt || '',
      lyrics: body.lyrics || undefined,
      title: body.title || undefined,
    })
    return {
      title: result.song_title || body.title || '',
      styleTags: result.style_tags || '',
      lyrics: result.lyrics || '',
    }
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
