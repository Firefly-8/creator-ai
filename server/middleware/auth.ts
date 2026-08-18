/**
 * 认证中间件 — Firebase Token 自动验证
 * 
 * 白名单路径不需要认证
 * 其他路径自动验证 Token 并注入 event.context.auth
 */

const PUBLIC_PATHS = [
  '/api/auth',
  '/api/subscriptions/plans',
  '/api/robots',
  '/api/sitemap',
  '/api/upload',      // 上传前会单独验证
  '/api/admin/auth/login',  // 管理员登录接口
  '/_nuxt',
  '/logo.png',
  '/favicon.ico',
]

export default defineEventHandler(async (event) => {
  const path = event.path || ''
  
  // 白名单路径跳过
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) return
  // OPTIONS 请求跳过
  if (event.method === 'OPTIONS') return
  
  // 只保护 /api/ 路径
  if (!path.startsWith('/api/')) return

  // 提取 Token
  const authHeader = getHeader(event, 'authorization')
  const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : ''
  
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Missing authorization token' })
  }

  // 验证 Token
  const { verifyFirebaseToken } = await import('../utils/firebase-verify')
  const payload = await verifyFirebaseToken(token)
  
  if (!payload) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired token' })
  }

  // 注入用户上下文
  event.context.auth = {
    uid: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  }
})
