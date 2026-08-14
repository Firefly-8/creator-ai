/**
 * 获取当前用户的图片列表
 */
import { defineEventHandler, createError } from 'h3'
import { listImages, publicImage } from '../../utils/images'
import { decryptImageFields } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.uid) throw createError({ statusCode: 401 })

  const images = await listImages(auth.uid, 80)
  
  // 解密敏感字段
  const result = []
  for (const img of images) {
    const decrypted = await decryptImageFields(img)
    result.push(publicImage(decrypted))
  }

  return { images: result }
})
