import { defineEventHandler, readBody, createError } from 'h3'
import { getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const d1 = (globalThis as any).DB as D1Database
  if (!d1) throw createError({ statusCode: 500, statusMessage: 'DB not available' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing feedback ID' })

  const body = await readBody(event)
  const { status, adminReply } = body || {}
  const adminId = event.context.admin?.id
  const now = new Date().toISOString()

  if (status) {
    await d1.prepare('UPDATE feedback SET status = ?, admin_id = ?, updated_at = ? WHERE id = ?').bind(status, adminId || null, now, id).run()
  }
  if (adminReply !== undefined) {
    await d1.prepare('UPDATE feedback SET admin_reply = ?, admin_id = ?, updated_at = ? WHERE id = ?').bind(adminReply.slice(0, 2000), adminId || null, now, id).run()
  }

  return { success: true }
})
