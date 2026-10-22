/**
 * 重新生成图片
 *
 * ⚠️ 归属校验：必须带上 auth.uid（同 delete，避免 IDOR）。
 */
import { defineEventHandler, createError } from 'h3'
import { regenerateImage, publicImage } from '../../../utils/images'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })

  const rows = await regenerateImage(id, auth.uid)
  return {
    images: await Promise.all(rows.map((r) => publicImage(r))),
    promptFinal: rows[0]?.prompt_final || null,
  }
})
