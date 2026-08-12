/**
 * 图片处理工具 — Cloudflare Workers 兼容版本
 * 使用 R2 存储，移除 node:fs/node:stream 依赖
 */

import { createError } from 'h3'
import { nanoid } from 'nanoid'
import { dbAll, dbGet, dbRun, nowIso, type ImageRow } from './db'
import { generateImage, optimizeImagePrompt, MiniMaxError, resolveMiniMaxUserMessage } from './minimax'
import { deleteFile, readUploadBase64, imagesAbsolutePath, writeFile } from './storage'

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
 * 写入 base64 图片到 R2
 */
async function writeBase64ImageToR2(dataUrlOrB64: string, filename: string): Promise<string> {
  const raw = dataUrlOrB64.includes('base64,')
    ? dataUrlOrB64.split('base64,')[1]
    : dataUrlOrB64
  const buffer = Buffer.from(raw, 'base64')
  await writeFile('image', filename, buffer as any, 'image/png')
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

export async function listImages(limit = 50): Promise<ImageRow[]> {
  return dbAll<ImageRow>('SELECT * FROM generated_images ORDER BY created_at DESC LIMIT ?', [limit])
}

export async function getImage(id: string): Promise<ImageRow | null> {
  return dbGet<ImageRow>('SELECT * FROM generated_images WHERE id = ?', [id])
}

export async function deleteImage(id: string) {
  const img = await getImage(id)
  if (img?.image_path) {
    try { await deleteFile('image', img.image_path) } catch { /* ignore */ }
  }
  await dbRun('DELETE FROM generated_images WHERE id = ?', [id])
  return img
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
