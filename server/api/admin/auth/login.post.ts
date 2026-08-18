/**
 * 管理员登录
 * 验证用户名/密码，创建 session
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body || {}

  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Username and password required' })
  }

  const { getDB } = await import('../../utils/db-runtime')
  const d1 = getDB(event)
  if (!d1) throw createError({ statusCode: 500, statusMessage: 'DB not available' })

  // 查找管理员
  const admin = await d1.prepare(
    'SELECT * FROM admins WHERE username = ? AND is_active = 1'
  ).bind(username.trim().toLowerCase()).first()

  // 用户不存在也执行一次 verify 防止时序攻击
  if (!admin) {
    // Dummy hash to prevent timing attacks
    await verifyPassword('dummy', 'pbkdf2$100000$6162636465666768$00000000000000000000000000000000')
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  // 检查是否被锁定
  if (admin.locked_until) {
    const lockedUntil = new Date(admin.locked_until)
    if (lockedUntil > new Date()) {
      throw createError({ statusCode: 423, statusMessage: 'Account temporarily locked. Try again later.' })
    }
  }

  // 验证密码
  const { verifyPassword } = await import('../../../utils/admin/auth')
  const valid = await verifyPassword(password, admin.password_hash)

  if (!valid) {
    // 增加失败次数
    const attempts = (admin.login_attempts || 0) + 1
    const lockedUntil = attempts >= 3
      ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
      : null

    await d1.prepare(
      'UPDATE admins SET login_attempts = ?, locked_until = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(attempts, lockedUntil, admin.id).run()

    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  // 登录成功：重置失败次数，更新登录时间
  await d1.prepare(
    'UPDATE admins SET login_attempts = 0, locked_until = NULL, last_login_at = datetime("now"), updated_at = datetime("now") WHERE id = ?'
  ).bind(admin.id).run()

  // 创建 session
  const { generateSessionToken } = await import('../../../utils/admin/auth')
  const token = generateSessionToken()
  const sessionId = nanoid(12)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await d1.prepare(`
    INSERT INTO admin_sessions (id, admin_id, token, ip_address, user_agent, expires_at)
    VALUES (?, ?, ?, ?, ?, datetime(?))
  `).bind(
    sessionId,
    admin.id,
    token,
    getRequestIP(event) || '',
    getRequestHeader(event, 'user-agent') || '',
    expiresAt
  ).run()

  // 设置 cookie
  setCookie(event, 'admin_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    expires: new Date(expiresAt),
    path: '/',
  })

  return {
    success: true,
    admin: {
      id: admin.id,
      username: admin.username,
      displayName: admin.display_name,
    },
  }
})
