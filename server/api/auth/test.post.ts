/**
 * 测试端点 — 调试 token 接收和验证
 * 临时用于排查 401 问题
 */
import { defineEventHandler, createError } from 'h3'
import { getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : ''
  
  if (!token) {
    return { ok: false, reason: 'no_token', header: authHeader }
  }

  // 尝试解码 token
  const parts = token.split('.')
  if (parts.length !== 3) {
    return { ok: false, reason: 'invalid_parts', count: parts.length, preview: token.substring(0, 50) }
  }

  try {
    // 解码 header
    const pad1 = '='.repeat((4 - parts[0].length % 4) % 4)
    const headerB64 = parts[0].replace(/-/g, '+').replace(/_/g, '/') + pad1
    const header = JSON.parse(atob(headerB64))

    // 解码 payload
    const pad2 = '='.repeat((4 - parts[1].length % 4) % 4)
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/') + pad2
    const payload = JSON.parse(atob(payloadB64))

    return {
      ok: true,
      header,
      payload: {
        sub: payload.sub,
        aud: payload.aud,
        exp: payload.exp,
        iat: payload.iat,
        email: payload.email,
        iss: payload.iss,
      },
      expReadable: new Date(payload.exp * 1000).toISOString(),
      now: new Date().toISOString(),
      isExpired: payload.exp * 1000 < Date.now(),
    }
  } catch (err: any) {
    return { ok: false, reason: 'decode_error', error: err?.message }
  }
})
