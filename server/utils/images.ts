/**
 * 图片处理工具 — Cloudflare Workers 兼容版本
 * 使用 R2 存储，移除 node:fs/node:stream 依赖
 * Phase 1: 增加 user_id 数据隔离
 */

import { createError } from 'h3'
import type { H3Event } from 'h3'
import { nanoid } from 'nanoid'
import { dbAll, dbGet, dbRun, nowIso, type ImageRow } from './db'
import { generateImage, optimizeImagePrompt, MiniMaxError, resolveMiniMaxUserMessage } from './minimax'
import { deleteFile, readUploadBase64, writeFile, generateSignedUrl } from './storage'
import { parseCardMeta, isWork, isExpiredDraft, finalFileName } from './card-final'

/**
 * 下载图片到 R2
 */
async function downloadImageToR2(url: string, filename: string, event?: H3Event): Promise<string> {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`Failed to download image: ${res.status}`)
  const blob = await res.blob()
  await writeFile('image', filename, blob, 'image/png', event)
  return filename
}

/**
 * 写入 base64 图片到 R2 (CF Workers 兼容)
 */
async function writeBase64ImageToR2(dataUrlOrB64: string, filename: string, event?: H3Event): Promise<string> {
  const raw = dataUrlOrB64.includes('base64,')
    ? dataUrlOrB64.split('base64,')[1]
    : dataUrlOrB64
  const binary = atob(raw)
  const buffer = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i)
  }
  await writeFile('image', filename, buffer, 'image/png', event)
  return filename
}

/**
 * 处理 MiniMax 返回的图片结果
 */
export async function processImageResult(result: any, event?: H3Event): Promise<string[]> {
  const images = result?.data?.image_urls || result?.data?.image_base64 || []
  const outputs: string[] = []

  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    const filename = `${nanoid(12)}.png`

    if (img.startsWith('http')) {
      await downloadImageToR2(img, filename, event)
    } else {
      await writeBase64ImageToR2(img, filename, event)
    }
    outputs.push(filename)
  }

  return outputs
}

export async function listImages(userId: string, limit = 50): Promise<ImageRow[]> {
  const rows = await dbAll<ImageRow>('SELECT * FROM generated_images WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit])
  // 原型规则：未做完的草稿保留 3 天，到期从资产列表消失；作品（work）永久保留。
  // 这里只做「过滤掉过期草稿」的惰性清理，不删 R2 文件（非破坏性，符合仓库纪律）。
  return rows.filter(row => !isExpiredDraft(row))
}

export async function getImage(id: string, userId?: string): Promise<ImageRow | null> {
  if (userId) {
    return dbGet<ImageRow>('SELECT * FROM generated_images WHERE id = ? AND user_id = ?', [id, userId])
  }
  return dbGet<ImageRow>('SELECT * FROM generated_images WHERE id = ?', [id])
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

/**
 * 对外暴露的图片信息
 *
 * ⚠️ imageUrl 是**签名 URL**（带 expires + signature）：
 *    浏览器里的 <img src> 带不了 Authorization 头，只能靠签名授权。
 *    签名密钥没配时返回 null —— 不能让整个列表接口跟着炸掉。
 */
export async function publicImage(img: ImageRow) {
  let imageUrl: string | null = null
  if (img.image_path) {
    try {
      imageUrl = await generateSignedUrl(img.id, 'image', { path: `/api/images/${img.id}/file` })
    } catch (err: any) {
      console.error('[publicImage] 生成签名 URL 失败:', err?.message || err)
    }
  }

  const meta = parseCardMeta(img.meta_json)

  // 成品图（用户完成设计后合成文字 + 水印的图）—— 分享页/资产卡片优先用它。
  // 老数据没有 finalPath → 降级回传底图，行为不变。
  let finalUrl: string | null = null
  if (meta.finalPath) {
    try {
      finalUrl = await generateSignedUrl(img.id, 'image', { path: `/api/images/${img.id}/final-file` })
    } catch (err: any) {
      console.error('[publicImage] 成品图签名 URL 失败:', err?.message || err)
    }
  }

  // ⚠️ 2026-11-17（远端线）：把卡面数据（名字/留言/版式）一起带出去 ——
  //    以前只存图不存字，用户从「我的作品」打开旧卡得重写一遍。
  //    meta_json 里没有 card 字段的老记录 → undefined，前端跳过。
  const rawCard = (meta as unknown as Record<string, unknown>).card
  const card = rawCard && typeof rawCard === 'object'
    ? rawCard as { name?: string; message?: string; style?: string; layout?: string; texts?: unknown[] }
    : undefined

  return {
    id: img.id,
    title: img.title,
    scene: img.scene,
    model: img.model,
    mode: img.mode,
    aspect_ratio: img.aspect_ratio,
    status: img.status,
    imageUrl,
    /** 成品图 URL（有则优先展示）；null = 还是草稿/老数据 */
    finalUrl,
    /** 'work' = 完成的作品永久保存；'draft' = 3 天过期的草稿 */
    assetType: isWork(img) ? 'work' : 'draft',
    expired: isExpiredDraft(img),
    format: meta.format || null,
    finalizedAt: meta.finalizedAt || null,
    /** 卡面数据（名字/留言/版式/文字位置），老记录无此字段 */
    card,
    errorMessage: img.error_message,
    createdAt: img.created_at,
    updatedAt: img.updated_at,
  }
}

/**
 * 标记一张图为「完成的作品」并把成品图路径写进 meta_json。
 * 供 POST /api/images/:id/finalize 调用。
 */
export async function finalizeImage(id: string, finalPath: string, extra: {
  format?: string
  watermarked?: boolean
} = {}): Promise<ImageRow | null> {
  const { withCardMeta } = await import('./card-final')
  const current = await getImage(id)
  if (!current) return null
  const meta = withCardMeta(current.meta_json, {
    finalPath,
    assetType: 'work',
    finalizedAt: nowIso(),
    format: extra.format,
    watermarked: extra.watermarked,
  })
  return updateImage(id, { meta_json: meta })
}

/** 删图时连成品图一起删 */
export async function deleteImage(id: string, userId?: string) {
  const img = await getImage(id, userId)
  if (!img) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  if (img.image_path) {
    try { await deleteFile('image', img.image_path) } catch { /* ignore */ }
  }
  const meta = parseCardMeta(img.meta_json)
  if (meta.finalPath) {
    try { await deleteFile('image', meta.finalPath) } catch { /* ignore */ }
  }
  await dbRun('DELETE FROM generated_images WHERE id = ?', [id])
  return img
}

// ============ 重新生成 ============

export async function regenerateImage(id: string, userId?: string): Promise<ImageRow[]> {
  const img = await getImage(id, userId)
  if (!img) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  // TODO: 重新触发生成（Phase 2 实现）
  return [img]
}
