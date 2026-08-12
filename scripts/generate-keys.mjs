/**
 * 密钥生成脚本
 * 用于生成加密所需的主密钥和加密 API Key
 * 
 * 使用方法：
 * 1. node scripts/generate-keys.mjs
 * 2. 将输出的值填入 .env 或 CF Workers secrets
 */

// 动态导入 crypto 模块（Node.js 20+ 和 CF Workers 兼容）
const cryptoProvider = globalThis.crypto

function generateSecureHex(length = 32) {
  const bytes = cryptoProvider.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

async function encryptWithKey(plaintext, masterKey) {
  const encoder = new TextEncoder()
  const salt = cryptoProvider.getRandomValues(new Uint8Array(16))
  const iv = cryptoProvider.getRandomValues(new Uint8Array(12))
  
  const keyMaterial = await cryptoProvider.subtle.importKey(
    'raw',
    encoder.encode(masterKey),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  
  const key = await cryptoProvider.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
  
  const ciphertext = await cryptoProvider.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  )
  
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length)
  
  return btoa(String.fromCharCode(...combined))
}

async function main() {
  console.log('=== CraftAI 密钥生成器 ===\n')
  
  // 1. 生成主密钥
  const encryptionMasterKey = generateSecureHex(32)
  const urlSigningSecret = generateSecureHex(32)
  const requestSigningSecret = generateSecureHex(32)
  const appSecret = generateSecureHex(16)
  
  console.log('--- 基础密钥（直接填入环境变量）---')
  console.log(`ENCRYPTION_MASTER_KEY=${encryptionMasterKey}`)
  console.log(`URL_SIGNING_SECRET=${urlSigningSecret}`)
  console.log(`REQUEST_SIGNING_SECRET=${requestSigningSecret}`)
  console.log(`APP_SECRET=${appSecret}`)
  console.log('')
  
  // 2. 加密 API Key（如果提供了）
  const apiKeyToEncrypt = process.argv[2]
  if (apiKeyToEncrypt) {
    const encrypted = await encryptWithKey(apiKeyToEncrypt, encryptionMasterKey)
    console.log('--- 加密后的 MiniMax API Key ---')
    console.log(`ENCRYPTED_MINIMAX_API_KEY=${encrypted}`)
    console.log('')
    console.log('⚠️  生产环境只使用 ENCRYPTED_MINIMAX_API_KEY，不要暴露明文')
  } else {
    console.log('--- 加密 MiniMax API Key ---')
    console.log('运行: node scripts/generate-keys.mjs <your-minimax-api-key>')
    console.log('将输出 ENCRYPTED_MINIMAX_API_KEY 用于生产环境')
  }
  
  console.log('\n=== 安全提示 ===')
  console.log('1. 这些密钥只生成一次，请安全保存')
  console.log('2. 不要提交到 Git 仓库')
  console.log('3. 生产环境通过 CF Workers secrets 注入')
  console.log('4. 定期轮换密钥（建议每 90 天）')
}

main().catch(console.error)
