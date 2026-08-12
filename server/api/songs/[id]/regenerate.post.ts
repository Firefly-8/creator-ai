export default defineEventHandler(async (event) => {
  assertAppSecret(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  return regenerateSong(id)
})
