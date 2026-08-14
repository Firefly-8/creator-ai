/**
 * 管理后台 API 认证中间件
 * 校验 admin session token
 */

export default defineEventHandler(async (event) => {
  const path = event.path || ''

  // 只保护 /api/admin/* 路径
  if (!path.startsWith('/api/admin/')) return

  // 登录接口不需要认证
  if (path === '/api/admin/auth/login') return

  // 从 cookie 获取 session token
  const token = getCookie(event, 'admin_session')

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const d1 = (globalThis as any).DB as D1Database
  if (!d1) throw createError({ statusCode: 500, statusMessage: 'DB not available' })

  // 查询 session
  const session = await d1.prepare(`
    SELECT s.id, s.admin_id, s.expires_at, a.username, a.display_name
    FROM admin_sessions s
    JOIN admins a ON s.admin_id = a.id
    WHERE s.token = ? AND s.expires_at > datetime('now') AND a.is_active = 1
  `).bind(token).first()

  if (!session) {
    // 清除无效 cookie
    deleteCookie(event, 'admin_session')
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired session' })
  }

  // 注入 admin 上下文
  event.context.admin = {
    id: session.admin_id,
    username: session.username,
    displayName: session.display_name,
    sessionId: session.id,
  }
})
