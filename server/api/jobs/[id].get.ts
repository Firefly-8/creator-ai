
export default defineEventHandler((event) => {
  assertAppSecret(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing job id' })
  const job = getJob(id)
  if (!job) throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  return { job: publicJob(job) }
})
