/**
 * 任务管理 — Cloudflare D1 版本
 * 异步 API，兼容 CF Workers
 * Phase 1: 增加 user_id 数据隔离
 */

import { nanoid } from 'nanoid'
import { createError } from 'h3'
import {
  dbAll, dbGet, dbRun,
  nowIso, pickCoverColor,
  type JobStatus, type JobRow, type SongRow,
} from './db'
import { writeFile, deleteFile, readFile } from './storage'
import { writeSongCoverSvg } from './coverArt'

// ============ 内存状态 ============

const activeJobs = new Set<string>()
const STALE_JOB_MS = 15 * 60 * 1000

// ============ 任务事件（简化版）============

type JobListener = (job: JobRow) => void
const jobListeners = new Map<string, Set<JobListener>>()

export function onJobUpdate(jobId: string, listener: JobListener) {
  if (!jobListeners.has(jobId)) {
    jobListeners.set(jobId, new Set())
  }
  jobListeners.get(jobId)!.add(listener)
  return () => {
    jobListeners.get(jobId)?.delete(listener)
  }
}

async function emitJob(job: JobRow) {
  const listeners = jobListeners.get(job.id)
  if (listeners) {
    for (const fn of listeners) {
      try { fn(job) } catch { /* ignore */ }
    }
  }
}

// ============ 数据库操作 ============

async function touchSong(id: string) {
  await dbRun('UPDATE songs SET updated_at = ? WHERE id = ?', [nowIso(), id])
}

export async function getJob(id: string, userId?: string): Promise<JobRow | null> {
  if (userId) {
    return dbGet<JobRow>('SELECT * FROM jobs WHERE id = ? AND user_id = ?', [id, userId])
  }
  return dbGet<JobRow>('SELECT * FROM jobs WHERE id = ?', [id])
}

export async function getJobBySongId(songId: string, userId?: string): Promise<JobRow | null> {
  if (userId) {
    return dbGet<JobRow>('SELECT * FROM jobs WHERE song_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1', [songId, userId])
  }
  return dbGet<JobRow>('SELECT * FROM jobs WHERE song_id = ? ORDER BY created_at DESC LIMIT 1', [songId])
}

export async function getSong(id: string, userId?: string): Promise<SongRow | null> {
  if (userId) {
    return dbGet<SongRow>('SELECT * FROM songs WHERE id = ? AND user_id = ?', [id, userId])
  }
  return dbGet<SongRow>('SELECT * FROM songs WHERE id = ?', [id])
}

export async function listSongs(userId: string, limit = 50): Promise<SongRow[]> {
  return dbAll<SongRow>('SELECT * FROM songs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit])
}

export async function deleteSong(id: string, userId?: string) {
  const song = await getSong(id, userId)
  if (!song) return null
  if (song.audio_path) {
    try { await deleteFile('audio', song.audio_path) } catch { /* ignore */ }
  }
  if (song.cover_path) {
    try { await deleteFile('cover', song.cover_path) } catch { /* ignore */ }
  }
  await dbRun('DELETE FROM song_versions WHERE song_id = ?', [id])
  await dbRun('DELETE FROM songs WHERE id = ?', [id])
  return song
}

// ============ 任务操作 ============

export async function createJob(userId: string, type: string, payload: Record<string, unknown>, songId?: string): Promise<JobRow> {
  const id = nanoid(12)
  const ts = nowIso()
  const row: JobRow = {
    id,
    type,
    status: 'queued',
    progress: '',
    song_id: songId || null,
    error_message: null,
    payload_json: JSON.stringify(payload),
    result_json: null,
    created_at: ts,
    updated_at: ts,
  }
  await dbRun(
    `INSERT INTO jobs (id, user_id, type, status, progress, song_id, error_message, payload_json, result_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [row.id, userId, row.type, row.status, row.progress, row.song_id, row.error_message, row.payload_json, row.result_json, row.created_at, row.updated_at]
  )
  return row
}

export async function updateJob(id: string, patch: Partial<JobRow>): Promise<JobRow | null> {
  const current = await getJob(id)
  if (!current) return null
  const next: JobRow = {
    ...current,
    ...patch,
    updated_at: nowIso(),
  }
  await dbRun(
    `UPDATE jobs SET status = ?, progress = ?, song_id = ?, error_message = ?, result_json = ?, updated_at = ? WHERE id = ?`,
    [next.status, next.progress, next.song_id, next.error_message, next.result_json, next.updated_at, id]
  )
  await emitJob(next)
  return next
}

export async function updateSong(id: string, patch: Partial<SongRow>): Promise<SongRow | null> {
  const current = await getSong(id)
  if (!current) return null
  const next = { ...current, ...patch, updated_at: nowIso() }
  await dbRun(
    `UPDATE songs SET title = ?, prompt = ?, lyrics = ?, model = ?, type = ?, status = ?,
      duration_ms = ?, audio_path = ?, cover_path = ?, cover_color = ?, error_message = ?, parent_id = ?, meta_json = ?, updated_at = ?
     WHERE id = ?`,
    [next.title, next.prompt, next.lyrics, next.model, next.type, next.status,
     next.duration_ms, next.audio_path, next.cover_path, next.cover_color,
     next.error_message, next.parent_id, next.meta_json, next.updated_at, id]
  )
  return next
}

// ============ 歌曲创建 ============

export async function createSongDraft(userId: string, input: {
  title?: string
  prompt?: string
  lyrics?: string
  model?: string
  type?: SongRow['type']
  parent_id?: string | null
  meta_json?: string
}): Promise<SongRow> {
  const id = nanoid(12)
  const ts = nowIso()
  const row: SongRow = {
    id,
    user_id: userId,
    title: input.title || 'Untitled Track',
    prompt: input.prompt || '',
    lyrics: input.lyrics || '',
    model: input.model || 'music-3.0',
    type: input.type || 'generate',
    status: 'generating',
    duration_ms: 0,
    audio_path: null,
    cover_path: null,
    cover_color: pickCoverColor(id),
    error_message: null,
    parent_id: input.parent_id || null,
    meta_json: input.meta_json || '{}',
    created_at: ts,
    updated_at: ts,
  }
  await dbRun(
    `INSERT INTO songs (id, user_id, title, prompt, lyrics, model, type, status, duration_ms, audio_path, cover_path, cover_color, error_message, parent_id, meta_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [row.id, row.user_id, row.title, row.prompt, row.lyrics, row.model, row.type, row.status,
     row.duration_ms, row.audio_path, row.cover_path, row.cover_color,
     row.error_message, row.parent_id, row.meta_json, row.created_at, row.updated_at]
  )
  return row
}

// ============ 封面生成 ============

export async function ensureSongCover(song: SongRow): Promise<SongRow> {
  if (song.cover_path) return song
  const coverFilename = `${song.id}.svg`
  const svg = writeSongCoverSvg({
    songId: song.id,
    title: song.title,
    prompt: song.prompt,
    color: song.cover_color || pickCoverColor(song.id),
  })
  await writeFile('cover', coverFilename, svg, 'image/svg+xml')
  return updateSong(song.id, { cover_path: coverFilename }) || song
}

// ============ 任务恢复 ============

export async function reconcileStaleJobs(options?: { forceAllInactive?: boolean }): Promise<number> {
  const open = await dbAll<JobRow>(
    "SELECT * FROM jobs WHERE status IN ('queued', 'generating', 'downloading')"
  )
  const now = Date.now()
  let cleaned = 0
  
  for (const job of open) {
    if (activeJobs.has(job.id)) continue
    const age = now - Date.parse(job.updated_at || job.created_at)
    const stale = options?.forceAllInactive || !Number.isFinite(age) || age >= STALE_JOB_MS
    if (!stale) continue
    await abandonJob(job, 'Generation interrupted — no active worker')
    cleaned++
  }
  
  const orphans = await dbAll<SongRow>("SELECT * FROM songs WHERE status = 'generating'")
  for (const song of orphans) {
    const job = await getJobBySongId(song.id)
    if (job && (activeJobs.has(job.id) || ['queued', 'generating', 'downloading'].includes(job.status))) {
      continue
    }
    await deleteSong(song.id)
    cleaned++
  }
  
  return cleaned
}

export async function abandonJob(job: JobRow, reason: string) {
  await updateJob(job.id, { status: 'error', error_message: reason })
  if (job.song_id) {
    const song = await getSong(job.song_id)
    if (song?.status === 'generating') {
      await updateSong(song.id, { status: 'failed', error_message: reason })
    }
  }
  activeJobs.delete(job.id)
}

// ============ 公开格式 ============

export function publicSong(song: SongRow) {
  return {
    id: song.id,
    title: song.title,
    prompt: song.prompt,
    lyrics: song.lyrics,
    model: song.model,
    type: song.type,
    status: song.status,
    durationMs: song.duration_ms,
    coverColor: song.cover_color,
    coverUrl: song.cover_path ? `/api/cover-art/${song.id}` : null,
    errorMessage: song.error_message,
    parentId: song.parent_id,
    audioUrl: song.audio_path ? `/api/audio/${song.id}` : null,
    downloadUrl: song.audio_path ? `/api/audio/${song.id}?download=1` : null,
    meta: safeJson(song.meta_json),
    createdAt: song.created_at,
    updatedAt: song.updated_at,
  }
}

export function publicJob(job: JobRow) {
  return {
    id: job.id,
    type: job.type,
    status: job.status as JobStatus,
    progress: job.progress,
    songId: job.song_id,
    errorMessage: job.error_message,
    result: safeJson(job.result_json),
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  }
}

function safeJson(raw: string | null) {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

// ============ 重新生成 ============

export async function regenerateSong(id: string, userId?: string): Promise<{ ok: true; id: string }> {
  const song = await getSong(id, userId)
  if (!song) throw createError({ statusCode: 404, statusMessage: 'Song not found' })
  // TODO: 重新触发生成（Phase 2 实现）
  return { ok: true, id }
}
