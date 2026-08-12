/**
 * 加密工具模块 — 使用 AES-GCM 256 位加密
 * 
 * 适用于 Cloudflare Workers (Web Crypto API)
 * 加密敏感数据：API Key、用户提示词、生成元数据
 */

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12 // 96 bits for GCM
const SALT_LENGTH = 16
const ITERATIONS = 100_000
const ENCRYPTION_PREFIX = 'v1:' // 版本前缀，用于识别加密数据

/**
 * 从环境主密钥派生加密密钥
 * 使用 PBKDF2 增强安全性
 */
async function deriveKey(masterSecret: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterSecret),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Uint8Array 转 Base64（安全版本，支持大数据）
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  const len = bytes.length
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Base64 转 Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * 加密字符串，返回 base64 格式
 * 格式: "v1:" + base64(salt + iv + ciphertext)
 */
export async function encrypt(plaintext: string, masterSecret: string): Promise<string> {
  if (!plaintext) return ''

  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(masterSecret, salt)

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  )

  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length)

  return ENCRYPTION_PREFIX + uint8ArrayToBase64(combined)
}

/**
 * 解密 base64 格式的加密字符串
 * 自动识别版本前缀，兼容旧数据返回原文
 */
export async function decrypt(encryptedBase64: string, masterSecret: string): Promise<string> {
  if (!encryptedBase64) return ''
  
  // 检查版本前缀
  if (!encryptedBase64.startsWith(ENCRYPTION_PREFIX)) {
    return encryptedBase64 // 旧明文数据，直接返回
  }
  
  const payload = encryptedBase64.slice(ENCRYPTION_PREFIX.length)
  const combined = base64ToUint8Array(payload)

  const salt = combined.slice(0, SALT_LENGTH)
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH)

  const key = await deriveKey(masterSecret, salt)

  const decoder = new TextDecoder()
  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  )

  return decoder.decode(plaintext)
}

/**
 * 检查字符串是否是加密数据
 */
export function isEncrypted(data: string): boolean {
  return data.startsWith(ENCRYPTION_PREFIX)
}

/**
 * 生成安全的随机密钥（用于 API Key 加密存储）
 */
export function generateSecureKey(length: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 生成密码学安全的随机 nonce
 */
export function generateSecureNonce(length: number = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * HMAC-SHA256 签名（用于请求验证）
 */
export async function sign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return uint8ArrayToBase64(new Uint8Array(signature))
}

/**
 * 验证 HMAC 签名
 */
export async function verifySignature(data: string, signature: string, secret: string): Promise<boolean> {
  const expected = await sign(data, secret)
  // 恒定时间比较，防止时序攻击
  if (signature.length !== expected.length) return false
  let result = 0
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return result === 0
}

/**
 * 哈希敏感数据（不可逆，用于 API Key 存储验证）
 */
export async function hash(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  return Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('')
}
