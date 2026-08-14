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

  if (file.data.length > 10 * 1024 * 1024) {
    throw createError({ statusCode: 400, statusMessage: 'Image exceeds 10MB limit' })
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
  await writeFile('upload', uploadId, file.data as Uint8Array, ext === '.png' ? 'image/png' : 'image/jpeg')

  return {
    uploadId,
    filename: file.filename,
    mime: ext === '.png' ? 'image/png' : 'image/jpeg',
  }
})
