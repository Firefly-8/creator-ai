/**
 * 认证中间件 — Firebase Token 自动验证
 * 
 * 白名单路径不需要认证
 * 其他路径自动验证 Token 并注入 event.context.auth
 */

const PUBLIC_PATHS = [
  '/api/auth',
  '/api/subscriptions/plans',
  '/api/gallery',
  '/api/blog',
  '/api/health',
  // ⚠️ '/api/minimax/quota' 曾经是公开的 —— 任何人都能看账户额度，
  // 而且带 ?probe=N 会**真的调 MiniMax 生成 N 张图**（白嫖额度）。
  // 现在要求登录；probe 模式另外要求 admin 身份。
  // '/api/minimax/quota',
  // 样例底图：用户「没有照片？用样例」的兜底入口，
  // 必须在登录前可用（纯静态资源，无隐私风险）
  '/api/image/samples',
  // PayPal webhook 是 PayPal 服务器调过来的，没有用户 token ——
  // 它靠**签名验证**保护（server/utils/paypal-webhook.ts）✅
  '/api/subscriptions/webhook',
  '/api/robots',
  '/api/sitemap',
  // 运维端点：自己用 X-Ops-Secret 鉴权（跟 Firebase token 无关）
  '/api/ops',
  // ⚠️ '/api/upload' 曾经是公开的 —— 任何人都能往 R2 塞文件（白嫖存储）。
  // 上传是 i2i 流程的第一步，生成必须登录，所以上传也必须登录。
  // 前端已有「上传 401 → 降级成 t2i」的兜底，不会白屏。
  '/api/admin',
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
  
  console.log(`[Auth Middleware] ${event.method} ${path}, has token: ${!!token}`)
  
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
  
  console.log(`[Auth Middleware] OK, uid=${payload.sub}`)
})
