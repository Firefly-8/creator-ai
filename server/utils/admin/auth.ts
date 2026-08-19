/**
 * 管理后台认证工具
 * bcrypt-like password hashing using Web Crypto PBKDF2
 */

// ============ 密码哈希 ============

const PBKDF2_ITERATIONS = 100000
const SALT_BYTES = 16
const KEY_BYTES = 32

async function importKey(password: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  return baseKey
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new SALT_BYTES > 0 ? new Uint8Array(SALT_BYTES) : new Uint8Array(16))
  const key = await importKey(password)
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_BYTES * 8
  )
  const hashBytes = new Uint8Array(bits)
  // Format: pbkdf2$<iterations>$<salt_hex>$<hash_hex>
  return `pbkdf2$${PBKDF2_ITERATIONS}${bytesToHex(salt)}${bytesToHex(hashBytes)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false

  const iterations = parseInt(parts[1], 10)
  const salt = hexToBytes(parts[2])
  const storedHash = hexToBytes(parts[3])

  const baseKey = await importKey(password)
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    storedHash.length * 8
  )
  const computedHash = new Uint8Array(bits)

  // Constant-time comparison
  if (computedHash.length !== storedHash.length) return false
  let result = 0
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash[i] ^ storedHash[i]
  }
  return result === 0
}

// ============ Session Token ============

export function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return bytesToHex(bytes)
}

// ============ 辅助函数 ============

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}
