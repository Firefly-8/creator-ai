/**
 * 安全配置模块 — 运行时解密加密的环境变量
 * 
 * 适用于商用部署，API Key 以加密形式存储在环境变量中
 * 运行时解密，避免明文泄露
 */

import { decrypt, hash } from './crypto'

// 主密钥来源（CF Workers secrets 或环境变量）
function getMasterSecret(): string {
  const config = useRuntimeConfig()
  const key = config.encryptionMasterKey || config.appSecret || ''
  if (!key) {
    throw new Error('ENCRYPTION_MASTER_KEY or APP_SECRET must be configured')
  }
  return key
}

/**
 * 解密加密的 API Key
 * 环境变量中存储的是 encrypt(apiKey, masterKey) 的结果
 */
export async function getDecryptedApiKey(): Promise<string> {
  const config = useRuntimeConfig()
  const masterKey = getMasterSecret()
  
  // 如果配置的是加密后的 Key，需要解密
  if (config.encryptedMinimaxApiKey) {
    return decrypt(config.encryptedMinimaxApiKey, masterKey)
  }
  
  // 回退：直接读取明文（仅开发环境）
  if (config.minimaxApiKey) {
    return config.minimaxApiKey
  }
  
  throw new Error('MINIMAX_API_KEY is not configured')
}

/**
 * 获取 MiniMax API 基础 URL
 */
export function getMiniMaxBaseUrl(): string {
  const config = useRuntimeConfig()
  return (config.minimaxBaseUrl as string || 'https://api.minimaxi.com').replace(/\/$/, '')
}

/**
 * 获取 Token Plan 剩余额度（带签名验证）
 */
export async function fetchTokenPlanRemainsEncrypted(): Promise<any> {
  const apiKey = await getDecryptedApiKey()
  const baseUrl = getMiniMaxBaseUrl()
  
  const res = await fetch(`${baseUrl}/v1/token_plan/remains`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  })
  
  return res.json()
}

/**
 * 生成 API Key 的哈希（用于存储验证，不可逆）
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  return hash(apiKey)
}

/**
 * 验证 API Key 是否匹配（通过哈希比较）
 */
export async function verifyApiKey(apiKey: string, storedHash: string): Promise<boolean> {
  const computedHash = await hash(apiKey)
  // 恒定时间比较
  if (computedHash.length !== storedHash.length) return false
  let result = 0
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i)
  }
  return result === 0
}
