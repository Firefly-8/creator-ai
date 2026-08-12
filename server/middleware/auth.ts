/**
 * 认证中间件 — 验证请求签名和会话
 * 
 * 保护敏感 API 端点，防止：
 * 1. 未授权访问
 * 2. 重放攻击（通过时间戳和签名）
 * 3. CSRF 攻击
 */

import { verifySignature } from '../utils/crypto'

export default defineEventHandler(async (event) => {
  // 只对敏感端点进行签名验证
  const path = event.path
  const signedPaths = [
    '/api/music/generate',
    '/api/image/generate',
    '/api/cover/generate',
    '/api/lyrics',
    '/api/subscriptions/create',
    '/api/subscriptions/webhook',
  ]
  
  const needsSignature = signedPaths.some(p => path.startsWith(p))
  if (!needsSignature) return
  
  // 获取签名头
  const timestamp = getHeader(event, 'x-request-timestamp')
  const signature = getHeader(event, 'x-request-signature')
  
  if (!timestamp || !signature) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Missing request signature',
    })
  }
  
  // 检查时间戳是否在 5 分钟内（防重放）
  const ts = parseInt(timestamp as string)
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Request timestamp expired',
    })
  }
  
  // 获取签名密钥 - 必须配置，否则拒绝请求
  const config = useRuntimeConfig()
  const secret = config.requestSigningSecret || config.appSecret || ''
  
  if (!secret) {
    // 未配置签名密钥时拒绝所有受保护端点
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error: signing secret not set',
    })
  }
  
  // 验证签名
  const body = event.node.req.method !== 'GET' ? await readRawBody(event).catch(() => null) : null
  const payload = `${path}:${timestamp}:${body || ''}`
  const isValid = await verifySignature(payload, signature as string, secret)
  
  if (!isValid) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid request signature',
    })
  }
})
