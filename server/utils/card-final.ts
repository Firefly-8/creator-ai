/**
 * 成品卡（final）与草稿/作品状态 — 元数据工具
 *
 * 背景（2026-11-23 原型对齐）：
 *   编辑器里用户填的名字/留言只画在客户端 canvas 上，从来没落库。
 *   结果分享页 /card/:id 只能回传模型底图 —— 朋友看到的不是用户做的那张卡。
 *
 * 方案（零 D1 迁移）：
 *   成品图（合成文字 + 水印）导出后上传 R2，文件名 `{id}-final.png`，
 *   路径连同资产状态一起塞进 generated_images.meta_json（该字段本来就是
 *   明文 JSON，decryptFromStorage 对明文直接放行）。
 *
 *   状态语义对齐原型：
 *     - 刚生成的候选图 = 草稿（draft），3 天后过期不可分享
 *     - 用户点「完成设计」= 作品（work），永久保存
 *     - 免费作品照样带水印、照样能下载/分享/打印；付费墙只在去水印时出现
 */
import type { ImageRow } from './db'

/** meta_json 里由本模块维护的字段 */
export interface CardFinalMeta {
  /** 成品图在 R2 的文件名（未带 images/ 前缀），有值即代表用户完成过设计 */
  finalPath?: string
  /** 'draft' | 'work'；缺省按 draft 处理 */
  assetType?: 'draft' | 'work'
  /** 完成设计的时间戳（ISO） */
  finalizedAt?: string
  /** 卡片格式 id（invite / card），仅作展示用 */
  format?: string
  /** 完成时的水印状态（免费 true / 付费 false） */
  watermarked?: boolean
}

/** 草稿过期天数（原型：未做完的草稿保留 3 天） */
export const DRAFT_TTL_DAYS = 3

/**
 * 安全解析 meta_json —— 永远返回对象，坏数据不抛错。
 * 兼容明文 JSON 和历史上的密文（调用方应先过 decryptImageFields）。
 */
export function parseCardMeta(raw: string | null | undefined): CardFinalMeta {
  if (!raw) return {}
  try {
    const obj = JSON.parse(raw)
    return obj && typeof obj === 'object' ? obj as CardFinalMeta : {}
  } catch {
    return {}
  }
}

/** 合并成品字段回 meta_json 字符串 */
export function withCardMeta(raw: string | null | undefined, patch: CardFinalMeta): string {
  return JSON.stringify({ ...parseCardMeta(raw), ...patch })
}

/** 这张图是不是「已完成的作品」 */
export function isWork(img: Pick<ImageRow, 'meta_json'>): boolean {
  return parseCardMeta(img.meta_json).assetType === 'work'
}

/**
 * 这张草稿是否已过期（仅草稿参与判断）。
 * 作品永远不过期 —— 对齐原型「作品永久保存」。
 */
export function isExpiredDraft(img: Pick<ImageRow, 'meta_json' | 'created_at'>, now = Date.now()): boolean {
  if (isWork(img)) return false
  const t = Date.parse(img.created_at)
  if (Number.isNaN(t)) return false
  return now - t > DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000
}

/** 成品图 R2 文件名（统一命名规则） */
export function finalFileName(id: string): string {
  return `${id}-final.png`
}
