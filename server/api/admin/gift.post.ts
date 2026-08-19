import { defineEventHandler, readBody, createError } from 'h3'
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const { getDB } = await import('../../utils/db-runtime')
  const d1 = getDB(event)
  if (!d1) throw createError({ statusCode: 500, statusMessage: 'DB not available' })

  const body = await readBody(event)
  const { targetEmail, privilege, expiresAt } = body || {}

  if (!targetEmail) throw createError({ statusCode: 400, statusMessage: 'Target email is required' })
  if (!privilege) throw createError({ statusCode: 400, statusMessage: 'Privilege type is required' })

  const validPrivileges = ['svip', 'admin', 'moderator', 'unlimited_credits']
  if (!validPrivileges.includes(privilege)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid privilege type' })
  }

  const targetUser = await d1.prepare('SELECT id, email, name FROM users WHERE email = ?').bind(targetEmail.toLowerCase().trim()).first()
  if (!targetUser) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const now = new Date().toISOString()
  const privId = nanoid(12)

  await d1.prepare('INSERT INTO user_privileges (id, user_id, privilege, granted_by, admin_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(privId, targetUser.id, privilege, 'manual', event.context.admin?.id || null, expiresAt || null, now).run()

  if (privilege === 'svip' || privilege === 'unlimited_credits') {
    await d1.prepare('UPDATE subscriptions SET plan = ?, credits_remaining = -1, updated_at = ? WHERE user_id = ?').bind('svip', now, targetUser.id).run()
  }

  return { success: true, user: { id: targetUser.id, email: targetUser.email, name: targetUser.name }, privilege, grantedAt: now }
})
