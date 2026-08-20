/**
 * Firebase Token 验证 — 使用 JWKS 公钥
 * 轻量级实现，无需 firebase-admin SDK
 * 
 * Firebase 公钥地址: https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com
 * 公钥缓存 24 小时
 */

import { createError } from 'h3'

// JWKS 公钥缓存
let cachedKeys: Record<string, string> | null = null
let cacheExpiry = 0
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 小时

// Firebase 项目 ID（用于验证 aud）
const FIREBASE_PROJECT_ID = 'creator-cab02'

interface FirebasePayload {
  sub: string        // UID
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
  aud: string
  exp: number
  iat: number
  iss: string
}

/**
 * 获取 Firebase 公钥
 */
async function getPublicKeys(): Promise<Record<string, string>> {
  if (cachedKeys && Date.now() < cacheExpiry) {
    return cachedKeys
  }

  try {
    const res = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    )
    if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`)
    
    const data = await res.json() as Record<string, string>
    cachedKeys = data
    cacheExpiry = Date.now() + CACHE_TTL
    return data
  } catch (err) {
    console.error('[Firebase] JWKS fetch error:', err)
    // 如果缓存存在但过期，仍返回旧缓存
    if (cachedKeys) return cachedKeys
    throw err
  }
}

/**
 * 将 X.509 PEM 转为 Uint8Array (SPKI format)
 */
function pemToKey(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/, '')
    .replace(/-----END CERTIFICATE-----/, '')
    .replace(/\s/g, '')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Base64URL 解码
 */
function base64UrlDecode(str: string): string {
  const padding = '='.repeat((4 - str.length % 4) % 4)
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding
  return atob(base64)
}

/**
 * 验证 Firebase ID Token
 * 返回解码后的 payload，验证失败返回 null
 */
export async function verifyFirebaseToken(token: string): Promise<FirebasePayload | null> {
  try {
    // 1. 解析 JWT 结构
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const header = JSON.parse(base64UrlDecode(parts[0])) as { kid: string; alg: string }
    const payload = JSON.parse(base64UrlDecode(parts[1])) as FirebasePayload
    const signature = parts[2]

    // 2. 基本验证
    if (header.alg !== 'RS256') return null
    if (payload.aud !== FIREBASE_PROJECT_ID) return null
    if (payload.exp * 1000 < Date.now()) return null
    if (!payload.sub) return null

    // 3. 获取公钥
    const keys = await getPublicKeys()
    const pem = keys[header.kid]
    if (!pem) return null

    // 4. 验证签名
    const keyData = pemToKey(pem)
    const key = await crypto.subtle.importKey(
      'spki',
      keyData,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    const sigPadding = '='.repeat((4 - signature.length % 4) % 4)
    const sigBase64 = signature.replace(/-/g, '+').replace(/_/g, '/') + sigPadding
    const sigBytes = Uint8Array.from(atob(sigBase64), c => c.charCodeAt(0))

    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      sigBytes,
      data
    )

    if (!isValid) return null

    return payload
  } catch (err) {
    console.error('[Firebase] Token verification error:', err)
    return null
  }
}
