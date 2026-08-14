/**
 * 认证守卫 — Firebase Token 验证
 * 替换原来的 assertAppSecret / 请求签名验证
 */

import { createError } from 'h3'
import { verifyFirebaseToken } from './firebase-verify'

/**
 * 从事件中提取并验证 Firebase Token
 * 成功返回 { uid, email }，失败抛出 401
 */
export async function requireAuth(event: any): Promise<{ uid: string; email: string | undefined }> {
  const authHeader = event.node.req.headers?.authorization || ''
  const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : ''

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Missing authorization token' })
  }

  const payload = await verifyFirebaseToken(token)
  if (!payload) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired token' })
  }

  return { uid: payload.sub, email: payload.email }
}

/**
 * 旧兼容函数 — 替代原来的 assertAppSecret
 */
export async function assertAppSecret(event: any): Promise<{ uid: string; email: string | undefined }> {
  return requireAuth(event)
}
