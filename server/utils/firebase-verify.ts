/**
 * Firebase Token 验证 — 使用 JWKS 公钥
 * 轻量级实现，无需 firebase-admin SDK
 */

import { createError } from 'h3'

// JWKS 公钥缓存
let cachedKeys: Record<string, string> | null = null
let cacheExpiry = 0
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 小时

// Firebase 项目 ID（用于验证 aud）
const FIREBASE_PROJECT_ID = 'creator-cab02'

interface FirebasePayload {
  sub: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
  aud: string
  exp: number
  iat: number
  iss: string
}

async function getPublicKeys(): Promise<Record<string, string>> {
  if (cachedKeys && Date.now() < cacheExpiry) {
    console.log('[Firebase] Using cached JWKS keys')
    return cachedKeys
  }

  try {
    console.log('[Firebase] Fetching JWKS from Google...')
    const res = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    )
    if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`)
    
    const data = await res.json() as Record<string, string>
    cachedKeys = data
    cacheExpiry = Date.now() + CACHE_TTL
    console.log(`[Firebase] JWKS fetched OK, ${Object.keys(data).length} keys cached`)
    return data
  } catch (err) {
    console.error('[Firebase] JWKS fetch error:', err)
    if (cachedKeys) return cachedKeys
    throw err
  }
}

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

function base64UrlDecode(str: string): string {
  const padding = '='.repeat((4 - str.length % 4) % 4)
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding
  return atob(base64)
}

export async function verifyFirebaseToken(token: string): Promise<FirebasePayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      console.log('[Firebase] FAIL: token does not have 3 parts')
      return null
    }

    const header = JSON.parse(base64UrlDecode(parts[0])) as { kid: string; alg: string }
    const payload = JSON.parse(base64UrlDecode(parts[1])) as FirebasePayload
    console.log(`[Firebase] Token header: kid=${header.kid}, alg=${header.alg}`)
    console.log(`[Firebase] Token payload: aud=${payload.aud}, exp=${payload.exp}, sub=${payload.sub}`)

    if (header.alg !== 'RS256') {
      console.log('[Firebase] FAIL: alg is not RS256:', header.alg)
      return null
    }
    if (payload.aud !== FIREBASE_PROJECT_ID) {
      console.log(`[Firebase] FAIL: aud mismatch. Expected ${FIREBASE_PROJECT_ID}, got ${payload.aud}`)
      return null
    }
    if (payload.exp * 1000 < Date.now()) {
      console.log(`[Firebase] FAIL: token expired. exp=${payload.exp}, now=${Math.floor(Date.now()/1000)}`)
      return null
    }
    if (!payload.sub) {
      console.log('[Firebase] FAIL: no sub')
      return null
    }

    const keys = await getPublicKeys()
    const pem = keys[header.kid]
    if (!pem) {
      console.log(`[Firebase] FAIL: no key for kid=${header.kid}`)
      return null
    }

    const keyData = pemToKey(pem)
    const key = await crypto.subtle.importKey(
      'spki',
      keyData,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    const sigPadding = '='.repeat((4 - parts[2].length % 4) % 4)
    const sigBase64 = parts[2].replace(/-/g, '+').replace(/_/g, '/') + sigPadding
    const sigBytes = Uint8Array.from(atob(sigBase64), c => c.charCodeAt(0))

    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      sigBytes,
      data
    )

    if (!isValid) {
      console.log('[Firebase] FAIL: signature verification failed')
      return null
    }

    console.log('[Firebase] Token verified OK, sub=', payload.sub)
    return payload
  } catch (err) {
    console.error('[Firebase] Token verification exception:', err)
    return null
  }
}
