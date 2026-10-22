/**
 * 文件服务访问授权
 *
 * ## 为什么需要这一层
 * 浏览器里的 `<img src>` / `<audio src>` / `<a href="..." download>` **带不了
 * Authorization 头** —— 所以文件服务不能只靠「必须登录」保护，
 * 必须支持一种**自带凭证**的访问方式：签名 URL（`?expires=&signature=`）。
 *
 * 之前项目里其实已经写好了签名机制（server/utils/storage.ts 的
 * generateSignedUrl / verifySignedUrl），但有两个致命问题：
 *   1. auth 中间件在端点之前就 401 了 → 签名校验永远执行不到
 *   2. 签名密钥 URL_SIGNING_SECRET / APP_SECRET **线上根本没配**
 *      → 就算走到校验也是「密钥为空」
 * 结果就是：所有图片、音频、封面在页面上全是裂的。
 *
 * ## 两种凭证
 *   1. 签名 URL —— 页面直接用它渲染，天然免登录（URL 不可猜 + 有有效期）
 *   2. Bearer token —— 给脚本 / 下载器用；此时**必须校验归属**，
 *      否则任何登录用户改一下 URL 里的 id 就能读别人的图（IDOR）
 */

import { createError, getQuery } from 'h3'
import type { H3Event } from 'h3'
import { verifySignedUrl } from './storage'

export type FileType = 'audio' | 'image' | 'cover'

export interface FileAccessRequest {
  /** 资源 id（签名时用的就是它） */
  id: string
  type: FileType
  /** 资源归属的用户 id；给了就校验 token 路径的归属 */
  ownerId?: string | null
}

export type FileAccessMethod = 'signature' | 'token'

/**
 * 校验文件访问权限；不通过直接抛 401/403。
 * @param query 查询参数（默认从 event 取；测试里可以直接传）
 * @returns 用的哪种凭证（便于日志 / 排查）
 */
export async function assertFileAccess(
  event: H3Event,
  req: FileAccessRequest,
  query: Record<string, any> = getQuery(event)
): Promise<FileAccessMethod> {
  const expires = query.expires
  const signature = query.signature

  // ── 方式 1：签名 URL ────────────────────────────────
  if (expires && signature) {
    const ok = await verifySignedUrl(req.id, req.type, String(expires), String(signature))
    if (!ok) {
      throw createError({ statusCode: 403, statusMessage: 'Access denied: invalid or expired URL' })
    }
    return 'signature'
  }

  // ── 方式 2：Bearer token（必须校验归属）─────────────
  const auth = (event.context as any)?.auth
  if (!auth?.uid) {
    throw createError({ statusCode: 401, statusMessage: 'Missing authorization token' })
  }
  if (req.ownerId && auth.uid !== req.ownerId) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied: this is not your file' })
  }
  return 'token'
}
