/**
 * POST /api/images/:id/finalize — 提交「完成设计」的成品图
 *
 * 原型对齐：编辑器里用户写好名字/留言、拖好位置后点「完成设计」，
 * 把客户端 canvas 合成好的成品（带水印或付费无水印）上传落库。
 * 之后分享页 /card/:id 和「我的作品」卡片展示的就是这张成品，而不是模型底图。
 *
 * 安全：
 *   - 必须登录 + 校验图片归属（IDOR）
 *   - 只接受受控 format id；finalPath 由服务端按 id 生成，不信任客户端路径
 *   - body 大小由 Nitro 默认限制约束；base64 图解码后写 R2
 */
import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { getImage, finalizeImage } from '../../../utils/images'
import { writeFile } from '../../../utils/storage'
import { finalFileName } from '../../../utils/card-final'

interface FinalizeBody {
  /** data URL（data:image/png;base64,...）或裸 base64 */
  imageBase64?: string
  format?: string
  watermarked?: boolean
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })

  const img = await getImage(id, auth.uid)
  if (!img) throw createError({ statusCode: 404, statusMessage: 'Image not found' })

  const body = await readBody<FinalizeBody>(event)
  const raw = String(body?.imageBase64 || '')
  if (!raw) throw createError({ statusCode: 400, statusMessage: 'Missing image data' })

  // 解 base64（兼容 data URL 前缀）
  const base64 = raw.includes('base64,') ? raw.split('base64,')[1] : raw
  let bytes: Uint8Array
  try {
    const binary = atob(base64)
    bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image data' })
  }

  // 文件名完全由服务端生成，避免客户端塞任意路径
  const finalPath = finalFileName(id)
  await writeFile('image', finalPath, bytes, 'image/png', event)

  const format = body?.format === 'invite' || body?.format === 'card' ? body.format : undefined
  const updated = await finalizeImage(id, finalPath, {
    format,
    watermarked: !!body?.watermarked,
  })

  return {
    ok: true,
    id,
    finalUrl: `/api/images/${id}/final-file`,
    assetType: 'work',
    finalizedAt: updated?.updated_at || null,
  }
})
