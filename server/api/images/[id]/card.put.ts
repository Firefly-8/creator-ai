/**
 * 保存一张卡的**成品状态**（版式 + 文字 + 位置）
 *
 * ⚠️ 2026-11-17 为什么要有这个接口：
 *   用户在编辑器里挑版式、拖字、改颜色 —— 这些**只存在浏览器内存里**。
 *   以前出了图就只存了图（其实连字都没存），用户下次从「我的作品」打开，
 *   得到的是一张没有字、也没有他选的版式的图，等于白做。
 *
 *   现在：编辑器每次改动后防抖保存一次，打开旧卡能拿回一模一样的东西。
 *
 *   只写 meta_json 里的 card 字段，不动其他 meta（模型/参数等），
 *   也不动 generated_images 的其他列。
 */
import { defineEventHandler, createError, readBody } from 'h3'
import { getImage } from '../../../utils/images'
// ⚠️ dbRun 在 server/utils/db.ts（不是 db-runtime.ts —— 那个只有 getDB/requireDB）
import { dbRun } from '../../../utils/db'

interface CardPayload {
  name?: string
  message?: string
  style?: string
  layout?: string
  texts?: unknown[]
}

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })

  // ⚠️ 归属校验：按 (id, user_id) 查，查不到就是 404（别按 id 裸查）
  const row = await getImage(id, auth.uid)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Image not found' })

  const body = await readBody<CardPayload>(event).catch(() => ({} as CardPayload))
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  }

  // ⚠️ 只收白名单字段 —— 别让前端往 meta_json 里塞别的东西
  const card: CardPayload = {
    name: String(body.name || '').slice(0, 200),
    message: String(body.message || '').slice(0, 2000),
    style: String(body.style || '').slice(0, 80),
    layout: String(body.layout || '').slice(0, 80),
  }
  // texts 是位置+样式数组，最多 20 条（超了就是被塞了脏数据）
  if (Array.isArray(body.texts)) {
    card.texts = body.texts.slice(0, 20)
  }

  // ⚠️ 合并写入，别整块覆盖 —— meta_json 里可能还有别的业务数据
  let meta: any = {}
  try {
    meta = row.meta_json ? JSON.parse(row.meta_json) : {}
  } catch {
    meta = {}
  }
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) meta = {}
  meta.card = { ...(meta.card || {}), ...card }

  await dbRun(
    'UPDATE generated_images SET meta_json = ?, updated_at = ? WHERE id = ? AND user_id = ?',
    [JSON.stringify(meta), new Date().toISOString(), id, auth.uid]
  )

  return { ok: true, card: meta.card }
})
