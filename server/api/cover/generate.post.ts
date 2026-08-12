export default defineEventHandler(async (event) => {
  assertAppSecret(event)
  const body = await readBody(event)
  const prompt = String(body?.prompt || '').trim()

  if (!prompt || prompt.length < 10) {
    throw createError({ statusCode: 400, statusMessage: 'Cover prompt must be 10–300 characters' })
  }

  const hasFeature = !!body?.cover_feature_id
  const hasAudio = !!(body?.audio_upload_id || body?.audio_url || body?.audio_base64)

  if (!hasFeature && !hasAudio) {
    throw createError({ statusCode: 400, statusMessage: 'Provide audio or cover_feature_id' })
  }

  if (hasFeature && !body?.lyrics) {
    throw createError({ statusCode: 400, statusMessage: 'lyrics required when using cover_feature_id' })
  }

  // Do not write to library yet — song is created only when MiniMax call actually starts.
  const job = createJob('cover', {
    title: body?.title || 'Cover Track',
    prompt,
    lyrics: body?.lyrics || '',
    model: 'music-cover',
    cover_feature_id: body?.cover_feature_id,
    audio_upload_id: body?.audio_upload_id,
    audio_url: body?.audio_url,
    audio_base64: body?.audio_base64,
    audio_setting: body?.audio_setting || {
      sample_rate: 44100,
      bitrate: 256000,
      format: 'mp3',
    },
  })

  return {
    job: publicJob(job),
    song: null,
  }
})
