/**
 * 删除图片
 *
 * ⚠️ 归属校验：必须带上 auth.uid。
 *   以前只按 id 查（getImage(id)），任何登录用户改一下 URL 里的 id
 *   就能删掉别人的图（IDOR）。现在按 (id, user_id) 查，查不到就是 404。
 */
import { defineEventHandler, createError } from 'h3'
import { getImage, deleteImage } from '../../utils/images'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })

  const row = await getImage(id, auth.uid)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Image not found' })

  await deleteImage(id, auth.uid)
  return { ok: true }
})
