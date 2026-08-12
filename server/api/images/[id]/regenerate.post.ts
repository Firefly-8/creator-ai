export default defineEventHandler(async (event) => {
  assertAppSecret(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const rows = await regenerateImage(id)
  return {
    images: rows.map(publicImage),
    promptFinal: rows[0]?.prompt_final || null,
  }
})
