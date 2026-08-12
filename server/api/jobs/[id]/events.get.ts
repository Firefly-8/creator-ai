
export default defineEventHandler(async (event) => {
  assertAppSecret(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing job id' })

  const job = getJob(id)
  if (!job) throw createError({ statusCode: 404, statusMessage: 'Job not found' })

  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache, no-transform')
  setHeader(event, 'Connection', 'keep-alive')

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      send({ job: publicJob(job) })

      if (job.status === 'done' || job.status === 'error') {
        controller.close()
        return
      }

      const off = onJobUpdate(id, (updated) => {
        send({ job: publicJob(updated) })
        if (updated.status === 'done' || updated.status === 'error') {
          off()
          try {
            controller.close()
          } catch {
            // closed
          }
        }
      })

      // heartbeat
      const timer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`))
        } catch {
          clearInterval(timer)
          off()
        }
      }, 15000)

      event.node.req.on('close', () => {
        clearInterval(timer)
        off()
        try {
          controller.close()
        } catch {
          // ignore
        }
      })
    },
  })

  return stream
})
