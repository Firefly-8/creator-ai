/**
 * 上传图片文件（用于图生图参考）
 */
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  if (!form?.length) throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })

  const file = form.find((p) => p.name === 'file' || p.name === 'image')
  if (!file?.data?.length || !file.filename) {
    throw createError({ statusCode: 400, statusMessage: 'Missing image file' })
  }

  // 参考图最终要转成 data URI 发给 MiniMax，base64 之后体积还要再涨 1/3，
  // 所以这里卡在 4MB（和 server/utils/image-reference.ts 的上限一致），
  // 前端上传前会先用 canvas 缩到长边 1024，正常手机照片都能过。
  if (file.data.length > 4 * 1024 * 1024) {
    throw createError({
      statusCode: 400,
      statusMessage: '图片太大（超过 4MB），请换一张小一点的，或者用手机相册里的「小尺寸」版本',
    })
  }

  const lower = file.filename.toLowerCase()
  if (!/\.(jpe?g|png)$/.test(lower)) {
    throw createError({ statusCode: 400, statusMessage: 'Only JPG/PNG are supported' })
  }

  const { nanoid } = await import('nanoid')
  const ext = lower.endsWith('.png') ? '.png' : '.jpg'
  const uploadId = `${nanoid(12)}${ext}`

  // file.data is already Uint8Array in Nitro/CF Workers
  const { writeFile } = await import('../../utils/storage')
  await writeFile('upload', uploadId, file.data as Uint8Array, ext === '.png' ? 'image/png' : 'image/jpeg', event)

  return {
    uploadId,
    filename: file.filename,
    mime: ext === '.png' ? 'image/png' : 'image/jpeg',
  }
})
