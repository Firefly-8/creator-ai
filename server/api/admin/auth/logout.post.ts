/**
 * 管理员登出
 */
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'admin_session')

  if (token) {
    const { getDB } = await import('../../../utils/db-runtime')
  const d1 = getDB(event)
    if (d1) {
      await d1.prepare('DELETE FROM admin_sessions WHERE token = ?').bind(token).run()
    }
    deleteCookie(event, 'admin_session')
  }

  return { success: true }
})
