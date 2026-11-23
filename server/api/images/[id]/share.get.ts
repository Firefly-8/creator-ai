/**
 * GET /api/images/:id/share — 免登录的分享卡数据
 *
 * 原型对齐：分享 = 复制一个「无需登录鉴权」的资产详情页链接给朋友。
 * 这里只返回展示成品所必需的最小字段（标题 + 签名图 URL），**不返回任何用户数据**。
 *
 * 安全口径：
 *   - id 本身是难以猜测的随机串（能力凭证，等价于原型里的 hash 链接）
 *   - 图片文件仍走签名 URL（?expires=&signature=），有有效期，无法被滥用成永久公开图床
 *   - 没有用户邮箱 / user_id / 其他资产，泄露面仅限这一张卡的成品图
 */
import { defineEventHandler, getRouterParam, createError, setResponseStatus } from 'h3'
import { getImage, publicImage } from '../../../utils/images'
import { decryptImageFields } from '../../../utils/db'
import { isExpiredDraft } from '../../../utils/card-final'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const row = await getImage(id)
  // 分享只对「完成的作品」开放：草稿（含过了 3 天的）不能生成分享页。
  // 这是原型规则的延伸——草稿还没做完，不该有个对外链接。
  if (!row || row.status !== 'ready' || isExpiredDraft(row)) {
    // 分享链接过期/删卡是正常分支：用状态码 + null 响应，
    // 不 throw createError —— 否则 Nitro 会在 SSR 日志里打
    // [request error] [unhandled]，把正常 404 当成服务端异常。
    setResponseStatus(event, 404)
    return null
  }

  const decrypted = await decryptImageFields(row)
  const pub = await publicImage(decrypted)

  // 老数据没有 finalPath → finalUrl 为 null，降级回底图（历史分享链接仍可用）
  return {
    id: pub.id,
    title: pub.title || 'A card for you',
    scene: pub.scene,
    imageUrl: pub.finalUrl || pub.imageUrl,
    /** 是不是带水印的成品（给分享页显示提示用） */
    watermarked: pub.assetType === 'work' ? true : null,
  }
})
