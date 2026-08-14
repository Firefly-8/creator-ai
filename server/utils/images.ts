/**
 * 图片处理工具 — Cloudflare Workers 兼容版本
 * 使用 R2 存储，移除 node:fs/node:stream 依赖
 * Phase 1: 增加 user_id 数据隔离
 */

import { createError } from 'h3'
import { nanoid } from 'nanoid'
import { dbAll, dbGet, dbRun, nowIso, type ImageRow } from './db'
import { generateImage, optimizeImagePrompt, MiniMaxError, resolveMiniMaxUserMessage } from './minimax'
import { deleteFile, readUploadBase64, writeFile } from './storage'

/**
 * 下载图片到 R2
 */
async function downloadImageToR2(url: string, filename: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`Failed to download image: ${res.status}`)
  const blob = await res.blob()
  await writeFile('image', filename, blob, 'image/png')
  return filename
}

/**
 * 写入 base64 图片到 R2 (CF Workers 兼容)
 */
async function writeBase64ImageToR2(dataUrlOrB64: string, filename: string): Promise<string> {
  const raw = dataUrlOrB64.includes('base64,')
    ? dataUrlOrB64.split('base64,')[1]
    : dataUrlOrB64
  const binary = atob(raw)
  const buffer = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i)
  }
  await writeFile('image', filename, buffer, 'image/png')
  return filename
}

/**
 * 处理 MiniMax 返回的图片结果
 */
export async function processImageResult(result: any): Promise<string[]> {
  const images = result?.data?.image_urls || result?.data?.image_base64 || []
  const outputs: string[] = []

  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    const filename = `${nanoid(12)}.png`

    if (img.startsWith('http')) {
      await downloadImageToR2(img, filename)
    } else {
      await writeBase64ImageToR2(img, filename)
    }
    outputs.push(filename)
  }

  return outputs
}

export async function listImages(userId: string, limit = 50): Promise<ImageRow[]> {
  return dbAll<ImageRow>('SELECT * FROM generated_images WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit])
}

export async function getImage(id: string, userId?: string): Promise<ImageRow | null> {
  if (userId) {
    return dbGet<ImageRow>('SELECT * FROM generated_images WHERE id = ? AND user_id = ?', [id, userId])
  }
  return dbGet<ImageRow>('SELECT * FROM generated_images WHERE id = ?', [id])
}

export async function deleteImage(id: string, userId?: string) {
  const img = await getImage(id, userId)
  if (!img) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  if (img.image_path) {
    try { await deleteFile('image', img.image_path) } catch { /* ignore */ }
  }
  await dbRun('DELETE FROM generated_images WHERE id = ?', [id])
  return img
}

export async function createImageRecord(userId: string, input: {
  title?: string
  prompt?: string
  promptFinal?: string
  scene?: string
  model?: string
  mode?: string
  aspectRatio?: string
  styleType?: string
  metaJson?: string
}): Promise<ImageRow> {
  const id = nanoid(12)
  const ts = nowIso()
  const row: ImageRow = {
    id,
    user_id: userId,
    title: input.title || '',
    prompt: input.prompt || '',
    prompt_final: input.promptFinal || '',
    scene: input.scene || 'general',
    model: input.model || 'image-01',
    mode: input.mode || 't2i',
    aspect_ratio: input.aspectRatio || '1:1',
    style_type: input.styleType || null,
    image_path: null,
    status: 'pending',
    error_message: null,
    meta_json: input.metaJson || '{}',
    created_at: ts,
    updated_at: ts,
  }
  await dbRun(
    `INSERT INTO generated_images (id, user_id, title, prompt, prompt_final, scene, model, mode, aspect_ratio, style_type, image_path, status, error_message, meta_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [row.id, row.user_id, row.title, row.prompt, row.prompt_final, row.scene, row.model, row.mode,
     row.aspect_ratio, row.style_type, row.image_path, row.status, row.error_message,
     row.meta_json, row.created_at, row.updated_at]
  )
  return row
}

export async function updateImage(id: string, patch: Partial<ImageRow>): Promise<ImageRow | null> {
  const current = await getImage(id)
  if (!current) return null
  const next = { ...current, ...patch, updated_at: nowIso() }
  await dbRun(
    `UPDATE generated_images SET title = ?, prompt = ?, prompt_final = ?, scene = ?, model = ?, mode = ?,
      aspect_ratio = ?, style_type = ?, image_path = ?, status = ?, error_message = ?, meta_json = ?, updated_at = ?
     WHERE id = ?`,
    [next.title, next.prompt, next.prompt_final, next.scene, next.model, next.mode,
     next.aspect_ratio, next.style_type, next.image_path, next.status, next.error_message,
     next.meta_json, next.updated_at, id]
  )
  return next
}

export function publicImage(img: ImageRow) {
  return {
    id: img.id,
    title: img.title,
    scene: img.scene,
    model: img.model,
    mode: img.mode,
    aspect_ratio: img.aspect_ratio,
    status: img.status,
    imageUrl: img.image_path ? `/api/images/${img.id}/file` : null,
    errorMessage: img.error_message,
    createdAt: img.created_at,
    updatedAt: img.updated_at,
  }
}

// ============ 重新生成 ============

export async function regenerateImage(id: string, userId?: string): Promise<ImageRow[]> {
  const img = await getImage(id, userId)
  if (!img) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  // TODO: 重新触发生成（Phase 2 实现）
  return [img]
}
