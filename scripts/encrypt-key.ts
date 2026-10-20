/**
 * 用仓库自己的加密实现生成 ENCRYPTED_MINIMAX_API_KEY。
 *
 * 直接复用 server/utils/crypto.ts，保证与运行时 decrypt() 完全兼容
 * （格式："v1:" + base64(salt + iv + ciphertext)）。
 *
 * 用法:
 *   npx tsx scripts/encrypt-key.ts <明文key> [主密钥]
 *   # 不传主密钥则自动生成一个 64 位 hex
 *
 * 输出 JSON: { masterKey, encrypted, verified }
 */
import { encrypt, decrypt, generateSecureKey } from '../server/utils/crypto'

const [, , plaintext, masterArg] = process.argv

if (!plaintext) {
  console.error('用法: npx tsx scripts/encrypt-key.ts <明文key> [主密钥]')
  process.exit(1)
}

const masterKey = masterArg || generateSecureKey(32)
const encrypted = await encrypt(plaintext, masterKey)

// 往返校验：确保运行时能解回原文
const decrypted = await decrypt(encrypted, masterKey)
if (decrypted !== plaintext) {
  console.error('❌ 往返校验失败，解密结果与原文不一致')
  process.exit(1)
}

console.log(JSON.stringify({ masterKey, encrypted, verified: true }))
