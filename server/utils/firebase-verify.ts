/**
 * Firebase Token 验证 — 使用 JWKS 公钥
 * 轻量级实现，无需 firebase-admin SDK
 * 
 * Firebase 公钥地址: https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com
 * 公钥缓存 24 小时
 */

// JWKS 公钥缓存（缓存解析后的 JWK）
let cachedJwks: Record<string, { n: string; e: string }> = {}
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

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function parseASN1(data: Uint8Array, offset: number) {
  const tag = data[offset++]
  let len = data[offset++]
  let headerSize = 2
  if (len & 0x80) {
    const numBytes = len & 0x7f
    len = 0
    for (let i = 0; i < numBytes; i++) {
      len = (len << 8) | data[offset++]
    }
    headerSize += numBytes
  }
  return { tag, length: len, offset, headerSize }
}

function parseX509PublicKey(certData: Uint8Array): { n: string; e: string } | null {
  try {
    let pos = 0
    const cert = parseASN1(certData, pos)
    pos = cert.offset
    const tbs = parseASN1(certData, pos)
    pos = tbs.offset
    if (certData[pos] === 0xa0) {
      const skip = parseASN1(certData, pos)
      pos = skip.offset + skip.length
    }
    const serial = parseASN1(certData, pos)
    pos = serial.offset + serial.length
    const sig = parseASN1(certData, pos)
    pos = sig.offset + sig.length
    const issuer = parseASN1(certData, pos)
    pos = issuer.offset + issuer.length
    const validity = parseASN1(certData, pos)
    pos = validity.offset + validity.length
    const subject = parseASN1(certData, pos)
    pos = subject.offset + subject.length
    const spki = parseASN1(certData, pos)
    let spkiPos = spki.offset
    const alg = parseASN1(certData, spkiPos)
    spkiPos = alg.offset + alg.length
    const pubKey = parseASN1(certData, spkiPos)
    const keyBytes = certData.slice(pubKey.offset + 1, pubKey.offset + 1 + pubKey.length - 1)
    let keyPos = 0
    const rsaSeq = parseASN1(keyBytes, keyPos)
    keyPos = rsaSeq.offset
    const modulus = parseASN1(keyBytes, keyPos)
    keyPos = modulus.offset + modulus.length
    const exponent = parseASN1(keyBytes, keyPos)
    keyPos = exponent.offset + exponent.length
    const nBytes = keyBytes.slice(modulus.offset, modulus.offset + modulus.length)
    const eBytes = keyBytes.slice(exponent.offset, exponent.offset + exponent.length)
    const nClean = nBytes[0] === 0 ? nBytes.slice(1) : nBytes
    const eClean = eBytes[0] === 0 ? eBytes.slice(1) : eBytes
    return { n: toBase64Url(nClean), e: toBase64Url(eClean) }
  } catch (err) {
    console.error('[Firebase] X.509 parse error:', err)
    return null
  }
}

async function getPublicKeys(): Promise<Record<string, { n: string; e: string }>> {
  if (Object.keys(cachedJwks).length > 0 && Date.now() < cacheExpiry) {
    return cachedJwks
  }
  try {
    const res = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    )
    if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`)
    const data = (await res.json()) as Record<string, string>
    const jwks: Record<string, { n: string; e: string }> = {}
    for (const [kid, pem] of Object.entries(data)) {
      const b64 = pem.replace(/-----BEGIN CERTIFICATE-----/, '').replace(/-----END CERTIFICATE-----/, '').replace(/\s/g, '')
      const binary = atob(b64)
      const certData = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) certData[i] = binary.charCodeAt(i)
      const jwk = parseX509PublicKey(certData)
      if (jwk) jwks[kid] = jwk
    }
    cachedJwks = jwks
    cacheExpiry = Date.now() + CACHE_TTL
    return jwks
  } catch (err) {
    console.error('[Firebase] JWKS fetch error:', err)
    if (Object.keys(cachedJwks).length > 0) return cachedJwks
    throw err
  }
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
    const signature = parts[2]
    console.log(`[Firebase] kid=${header.kid}, alg=${header.alg}, aud=${payload.aud}, exp=${payload.exp}, sub=${payload.sub}`)
    if (header.alg !== 'RS256') {
      console.log('[Firebase] FAIL: alg is not RS256')
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
    console.log(`[Firebase] JWKS keys loaded: ${Object.keys(keys).length} keys`)
    const jwk = keys[header.kid]
    if (!jwk) {
      console.log(`[Firebase] FAIL: kid not found. Available kids: ${Object.keys(keys).join(', ')}`)
      return null
    }
    console.log(`[Firebase] JWK n length: ${jwk.n.length}, e length: ${jwk.e.length}`)
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    const sigPadding = '='.repeat((4 - signature.length % 4) % 4)
    const sigBase64 = signature.replace(/-/g, '+').replace(/_/g, '/') + sigPadding
    const sigBytes = Uint8Array.from(atob(sigBase64), (c) => c.charCodeAt(0))
    const isValid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sigBytes, data)
    if (!isValid) {
      console.log('[Firebase] FAIL: signature verification failed')
      return null
    }
    console.log('[Firebase] Token verified OK')
    return payload
  } catch (err) {
    console.error('[Firebase] Token verification error:', err)
    return null
  }
}
