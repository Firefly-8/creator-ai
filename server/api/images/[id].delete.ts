export default defineEventHandler(async (event) => {
  assertAppSecret(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  const row = getImage(id)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  deleteImage(id)
  return { ok: true }
})
