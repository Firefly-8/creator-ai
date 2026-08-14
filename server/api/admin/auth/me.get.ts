/**
 * 获取当前管理员信息
 */
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const admin = event.context.admin
  if (!admin) throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  return {
    admin: {
      id: admin.id,
      username: admin.username,
      displayName: admin.displayName,
    },
  }
})
