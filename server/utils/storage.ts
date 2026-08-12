/**
 * 文件存储 + 签名 URL 安全访问
 * 
 * Cloudflare Workers 使用 R2 存储
 * 所有文件访问通过签名 URL 控制，防止未授权访问
 * 签名有效期 15 分钟，过期需重新生成
 */

import { sign, verifySignature, generateSecureNonce } from './crypto'

// ============ R2 存储辅助函数 ============

/**
 * 获取 R2 binding
 */
function getR2(): R2Bucket {
  const r2 = (globalThis as any).STORAGE || (globalThis as any).__R2_BUCKET__
  if (!r2) {
    throw new Error('R2 binding not available. Ensure STORAGE binding is configured in wrangler.toml')
  }
  return r2
}

/**
 * 根据文件类型确定 R2 key 前缀
 */
function keyForType(type: 'audio' | 'image' | 'cover' | 'upload'): string {
  return `${type}s`
}

// ============ 文件写入/读取 (R2) ============

/**
 * 写入文件到 R2
 */
export async function writeFile(
  type: 'audio' | 'image' | 'cover' | 'upload',
  filename: string,
  data: ArrayBuffer | Uint8Array | Blob | string,
  contentType?: string
): Promise<string> {
  const r2 = getR2()
  const key = `${keyForType(type)}/${filename}`
  
  let body: ArrayBuffer | Uint8Array | string
  if (data instanceof Blob) {
    body = await data.arrayBuffer()
  } else {
    body = data
  }
  
  const headers: Record<string, string> = {}
  if (contentType) headers['Content-Type'] = contentType
  
  await r2.put(key, body, { httpMetadata: contentType ? { contentType } : undefined })
  return filename
}

/**
 * 从 R2 读取文件
 */
export async function readFile(
  type: 'audio' | 'image' | 'cover' | 'upload',
  filename: string
): Promise<R2ObjectBody | null> {
  const r2 = getR2()
  const key = `${keyForType(type)}/${filename}`
  return r2.get(key)
}

/**
 * 检查文件是否存在
 */
export async function fileExists(
  type: 'audio' | 'image' | 'cover' | 'upload',
  filename: string
): Promise<boolean> {
  const r2 = getR2()
  const key = `${keyForType(type)}/${filename}`
  const obj = await r2.head(key)
  return obj !== null
}

/**
 * 删除文件
 */
export async function deleteFile(
  type: 'audio' | 'image' | 'cover' | 'upload',
  filename: string
): Promise<void> {
  const r2 = getR2()
  const key = `${keyForType(type)}/${filename}`
  await r2.delete(key)
}

// ============ 下载到 R2 ============

/**
 * 下载远程文件到 R2 存储
 */
export async function downloadToR2(
  url: string,
  type: 'audio' | 'image' | 'cover',
  filename: string
): Promise<string> {
  const res = await fetch(url)
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download: ${res.status}`)
  }
  
  const contentType = res.headers.get('content-type') || undefined
  const blob = await res.blob()
  return writeFile(type, filename, blob, contentType)
}

/**
 * 获取文件内容类型
 */
export function inferContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'wav': return 'audio/wav'
    case 'flac': return 'audio/flac'
    case 'pcm': return 'audio/L16'
    case 'png': return 'image/png'
    case 'jpg': case 'jpeg': return 'image/jpeg'
    case 'webp': return 'image/webp'
    case 'svg': return 'image/svg+xml'
    case 'json': return 'application/json'
    default: return 'audio/mpeg'
  }
}

// ============ 兼容性别名（供旧代码引用）============

/**
 * @deprecated 使用 writeFile('audio', ...) 代替
 */
export async function downloadToAudio(url: string, filename: string) {
  return downloadToR2(url, 'audio', filename)
}

/**
 * @deprecated 使用 writeFile 代替
 */
export function writeAudioBuffer(filename: string, buffer: Buffer) {
  return writeFile('audio', filename, buffer as any, 'audio/mpeg')
}

/**
 * @deprecated 使用 writeFile 代替
 */
export function writeImageBuffer(filename: string, buffer: Buffer) {
  return writeFile('image', filename, buffer as any, 'image/png')
}

/**
 * @deprecated 使用 writeFile 代替
 */
export function writeUploadBuffer(filename: string, buffer: Buffer) {
  return writeFile('upload', filename, buffer as any)
}

/**
 * @deprecated 使用 readFile 代替
 */
export async function readUploadBase64(filename: string): Promise<string> {
  const obj = await readFile('upload', filename)
  if (!obj) throw new Error('Upload not found')
  const buffer = await obj.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * @deprecated 不再需要路径拼接
 */
export function audioAbsolutePath(filename: string) {
  return `audio/${filename}`
}

/**
 * @deprecated 不再需要路径拼接
 */
export function uploadsAbsolutePath(filename: string) {
  return `uploads/${filename}`
}

/**
 * @deprecated 不再需要路径拼接
 */
export function imagesAbsolutePath(filename: string) {
  return `images/${filename}`
}

/**
 * @deprecated 使用 deleteFile 代替
 */
export function safeUnlink(path: string) {
  // R2 模式下无需操作，保留兼容性
}

export function fileExtFromFormat(format?: string) {
  if (format === 'wav') return '.wav'
  if (format === 'pcm') return '.pcm'
  return '.mp3'
}

// ============ 签名 URL 系统 ============

/**
 * 获取签名密钥
 */
function getSigningSecret(): string {
  const config = useRuntimeConfig()
  return config.urlSigningSecret || config.appSecret || ''
}

/**
 * 生成签名 URL（有效期 15 分钟）
 * @param fileId 文件 ID
 * @param type 文件类型: audio | image | cover
 */
export async function generateSignedUrl(fileId: string, type: 'audio' | 'image' | 'cover'): Promise<string> {
  const secret = getSigningSecret()
  if (!secret) throw new Error('URL signing secret not configured')
  
  const expires = Date.now() + 15 * 60 * 1000 // 15 分钟
  const data = `${fileId}:${type}:${expires}`
  const signature = await sign(data, secret)
  
  const params = new URLSearchParams({
    expires: expires.toString(),
    signature,
  })
  
  return `/api/${type}/${fileId}?${params.toString()}`
}

/**
 * 验证签名 URL 是否有效
 */
export async function verifySignedUrl(fileId: string, type: string, expires: string, signature: string): Promise<boolean> {
  // 检查是否过期
  if (Date.now() > parseInt(expires)) {
    return false
  }
  
  const secret = getSigningSecret()
  if (!secret) return false
  
  // 验证签名
  const data = `${fileId}:${type}:${expires}`
  return verifySignature(data, signature, secret)
}

/**
 * 生成一次性下载令牌（带签名验证）
 * 格式: base64url(fileId:nonce).signature
 */
export async function generateDownloadToken(fileId: string): Promise<string> {
  const secret = getSigningSecret()
  if (!secret) throw new Error('URL signing secret not configured')
  
  const nonce = generateSecureNonce(8)
  const tokenData = `${fileId}:${nonce}`
  const signature = await sign(tokenData, secret)
  
  // 使用 URL 安全的 base64 编码
  const payload = btoa(tokenData).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${payload}.${signature.slice(0, 24)}`
}

/**
 * 验证下载令牌（完整签名验证）
 */
export async function verifyDownloadToken(fileId: string, token: string): Promise<boolean> {
  try {
    const secret = getSigningSecret()
    if (!secret) return false
    
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return false
    
    // 解码 payload
    const tokenData = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const [tokenFileId, nonce] = tokenData.split(':')
    
    // 验证 fileId 匹配
    if (tokenFileId !== fileId) return false
    
    // 验证签名
    const expectedSignature = await sign(tokenData, secret)
    const expectedPrefix = expectedSignature.slice(0, 24)
    
    // 恒定时间比较
    if (sig.length !== expectedPrefix.length) return false
    let result = 0
    for (let i = 0; i < sig.length; i++) {
      result |= sig.charCodeAt(i) ^ expectedPrefix.charCodeAt(i)
    }
    return result === 0
  } catch {
    return false
  }
}
