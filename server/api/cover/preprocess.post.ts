
export default defineEventHandler(async (event) => {
  assertAppSecret(event)
  const body = await readBody(event)

  if (!body?.audio_upload_id && !body?.audio_url && !body?.audio_base64) {
    throw createError({ statusCode: 400, statusMessage: 'Reference audio is required' })
  }

  const job = createJob('cover_preprocess', {
    audio_upload_id: body.audio_upload_id,
    audio_url: body.audio_url,
    audio_base64: body.audio_base64,
  })

  return { job: publicJob(job) }
})
