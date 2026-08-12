/**
 * 文件上传 — R2 版本
 */

import { defineEventHandler, createError, readMultipartFormData } from 'h3'
import { nanoid } from 'nanoid'
import { writeFile } from '../utils/storage'

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  if (!form?.length) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const file = form.find((p) => p.name === 'file' || p.name === 'audio')
  if (!file?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Missing audio file' })
  }

  const maxBytes = 50 * 1024 * 1024
  if (file.data.length > maxBytes) {
    throw createError({ statusCode: 400, statusMessage: 'File exceeds 50MB limit' })
  }

  const original = file.filename || 'upload.mp3'
  const ext = original.includes('.') ? `.${original.split('.').pop()}` : '.mp3'
  const id = `${nanoid(12)}${ext}`

  // 上传到 R2
  await writeFile('upload', id, file.data as any, file.type || 'audio/mpeg')

  return {
    uploadId: id,
    filename: original,
    size: file.data.length,
  }
})
