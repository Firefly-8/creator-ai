/**
 * 获取任务状态
 */
import { defineEventHandler, createError } from 'h3'
import { getJob, publicJob } from '../../utils/jobs'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing job id' })
  const job = await getJob(id)
  if (!job) throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  return { job: publicJob(job) }
})
