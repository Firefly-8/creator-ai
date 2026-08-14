/**
 * 数据库层 — Cloudflare D1 (生产)
 * 敏感字段加密存储
 * 
 * 加密字段：prompt, lyrics, meta_json（含用户输入的敏感内容）
 * 不加密字段：id, status, created_at 等（用于查询和索引）
 */

// ============ 类型定义 ============

export interface ImageRow {
  id: string
  user_id: string
  title: string
  prompt: string
  prompt_final: string
  scene: string
  model: string
  mode: string
  aspect_ratio: string
  style_type: string | null
  image_path: string | null
  status: string
  error_message: string | null
  meta_json: string
  created_at: string
  updated_at: string
}

export type SongType = 'generate' | 'cover' | 'edit'
export type SongStatus = 'generating' | 'ready' | 'failed'
export type JobStatus = 'queued' | 'generating' | 'downloading' | 'done' | 'error'

export interface SongRow {
  id: string
  user_id: string
  title: string
  prompt: string
  lyrics: string
  model: string
  type: SongType
  status: SongStatus
  duration_ms: number
  audio_path: string | null
  cover_path: string | null
  cover_color: string
  error_message: string | null
  parent_id: string | null
  user_id: string
  meta_json: string
  created_at: string
  updated_at: string
}

export interface JobRow {
  id: string
  user_id: string
  type: string
  status: JobStatus
  progress: string
  song_id: string | null
  user_id: string
  error_message: string | null
  payload_json: string
  result_json: string | null
  created_at: string
  updated_at: string
}

// ============ D1 数据库操作 ============

let d1Instance: D1Database | null = null

/**
 * 设置 D1 数据库实例
 */
export function setD1Database(db: D1Database) {
  d1Instance = db
}

/**
 * 获取 D1 数据库实例（从 CF Workers binding）
 */
function getD1(): D1Database {
  if (d1Instance) return d1Instance
  
  // CF Workers 环境：从 globalThis 获取 DB binding
  const d1 = (globalThis as any).DB
  if (d1) {
    d1Instance = d1
    return d1
  }
  
  throw new Error('D1 database not available. Ensure DB binding is configured in wrangler.toml')
}

// ============ 异步查询接口 ============

/**
 * 执行 SELECT 查询，返回多行
 */
export async function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = getD1()
  const result = await db.prepare(sql).bind(...params).all()
  return result.results as T[]
}

/**
 * 执行 SELECT 查询，返回单行
 */
export async function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const db = getD1()
  return await db.prepare(sql).bind(...params).first<T>()
}

/**
 * 执行 INSERT/UPDATE/DELETE
 */
export async function dbRun(sql: string, params: any[] = []): Promise<D1Result> {
  const db = getD1()
  return await db.prepare(sql).bind(...params).run()
}

/**
 * 批量执行（事务）
 */
export async function dbBatch(statements: { sql: string; params?: any[] }[]): Promise<D1Result[]> {
  const db = getD1()
  const prepared = statements.map(s => db.prepare(s.sql).bind(...(s.params || [])))
  return db.batch(prepared)
}

// ============ 工具函数 ============

export function nowIso(): string {
  return new Date().toISOString()
}

const COLORS = ['#8b7cff', '#6e5ce6', '#a78bfa', '#7c6af5', '#9f8cff', '#5b4fd1', '#b4a9ff']

export function pickCoverColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return COLORS[hash % COLORS.length]
}

// ============ 加密存储辅助函数 ============

function getEncryptionKey(): string {
  const config = useRuntimeConfig()
  const key = config.encryptionMasterKey || config.appSecret || ''
  if (!key) {
    throw new Error('ENCRYPTION_MASTER_KEY or APP_SECRET must be configured')
  }
  return key
}

export async function encryptForStorage(plaintext: string): Promise<string> {
  if (!plaintext) return ''
  const { encrypt, isEncrypted } = await import('./crypto')
  if (isEncrypted(plaintext)) return plaintext
  return encrypt(plaintext, getEncryptionKey())
}

export async function decryptFromStorage(encrypted: string): Promise<string> {
  if (!encrypted) return ''
  const { decrypt } = await import('./crypto')
  return decrypt(encrypted, getEncryptionKey())
}

export async function decryptSongFields(song: SongRow): Promise<SongRow> {
  if (!song) return song
  return {
    ...song,
    prompt: await decryptFromStorage(song.prompt),
    lyrics: await decryptFromStorage(song.lyrics),
    meta_json: await decryptFromStorage(song.meta_json),
  }
}

export async function decryptImageFields(img: ImageRow): Promise<ImageRow> {
  if (!img) return img
  return {
    ...img,
    prompt: await decryptFromStorage(img.prompt),
    prompt_final: await decryptFromStorage(img.prompt_final),
    meta_json: await decryptFromStorage(img.meta_json),
  }
}

export async function decryptJobFields(job: JobRow): Promise<JobRow> {
  if (!job) return job
  return {
    ...job,
    payload_json: await decryptFromStorage(job.payload_json),
    result_json: await decryptFromStorage(job.result_json),
  }
}
