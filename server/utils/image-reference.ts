/**
 * 参考图（i2i / 主体参考）处理
 *
 * MiniMax image_generation 的 subject_reference 要求：
 *   subject_reference: [{ type: 'character', image_file: '<公网URL 或 data:image/...;base64,...>' }]
 *
 * 注意三点：
 *   1. 必须是数组，不能直接传字符串
 *   2. image_file 必须是 MiniMax 服务器能取到的 URL 或 data URI
 *   3. 只支持单张参考图
 *
 * 本项目把上传的参考图存在 R2 的 uploads/ 前缀下，而这个前缀没有对外路由，
 * 所以这里直接把文件读出来转成 data URI 传过去（无需暴露公网可访问的文件）。
 */

import { readFile } from './storage'

/** MiniMax 参考图上限 10MB，data URI 还要再放大 ~1.34 倍，这里留出余量 */
export const MAX_REFERENCE_BYTES = 4 * 1024 * 1024

export interface SubjectReference {
  type: 'character'
  image_file: string
}

/**
 * 把 R2 里存好的上传图转成 MiniMax 可用的 subject_reference 数组
 * @param uploadId 上传接口返回的 id（形如 aBc123Xy.jpg）
 */
export async function buildSubjectReference(uploadId: string): Promise<SubjectReference[]> {
  const obj = await readFile('upload', uploadId)
  if (!obj) {
    throw new Error(`Reference image not found: ${uploadId}`)
  }

  const buffer = await obj.arrayBuffer()
  if (buffer.byteLength > MAX_REFERENCE_BYTES) {
    throw new Error(
      `Reference image too large (${Math.round(buffer.byteLength / 1024 / 1024)}MB > ` +
      `${Math.round(MAX_REFERENCE_BYTES / 1024 / 1024)}MB). Please upload a smaller photo.`
    )
  }

  const bytes = new Uint8Array(buffer)
  let binary = ''
  const CHUNK = 0x8000 // 避免 apply 参数过多
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  const mime = obj.httpMetadata?.contentType || 'image/jpeg'
  const imageFile = `data:${mime};base64,${btoa(binary)}`

  return [{ type: 'character', image_file: imageFile }]
}
