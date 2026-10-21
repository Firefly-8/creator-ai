/**
 * 获取当前用户的图片列表
 */
import { defineEventHandler, createError } from 'h3'
import { listImages, publicImage } from '../../utils/images'
import { decryptImageFields } from '../../utils/db'

export default defineEventHandler(async (event) => {
  console.log('[Images] === Start ===')
  const auth = event.context.auth
  console.log('[Images] auth context:', auth ? `uid=${auth.uid}` : 'null/undefined')
  if (!auth?.uid) throw createError({ statusCode: 401 })

  console.log('[Images] Calling listImages for uid:', auth.uid)
  const images = await listImages(auth.uid, 80)
  console.log('[Images] listImages returned:', images.length, 'images')
  
  // 解密敏感字段
  const result = []
  for (const img of images) {
    const decrypted = await decryptImageFields(img)
    result.push(publicImage(decrypted))
  }

  console.log('[Images] === Done ===')
  return { images: result }
})
