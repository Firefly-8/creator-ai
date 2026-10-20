/**
 * 静态资源基址
 *
 * ⚠️ 为什么资源不在应用包里（不在 public/ 下）：
 *   1. 每次部署 CF Pages 都要重新上传全部静态资源（字体 + 成品图 ≈ 3.3MB），
 *      拖慢部署、占 Pages 文件配额
 *   2. 资源是「跨环境共享」的（字体、品牌成品图、样例图与生产/预发布无关），
 *      放 R2 只上传一次，配 immutable 长缓存
 *   3. R2 直链可单独配 cache-control 和 CORS
 *
 * 桶：craftai-assets（独立公开桶）
 * 域：assets.yozzytools.com（R2 自定义域）
 * ⚠️ 用户生成的内容在私有桶 craftai-storage 里，**绝不能**放进这个公开桶。
 *
 * CSS 里的 @font-face url() 写死域名 —— CSS 变量在 @font-face 的 url() 里不可用。
 */
export const ASSET_BASE = 'https://assets.yozzytools.com'

/** 拼一个静态资源直链 */
export function assetUrl(path: string): string {
  return `${ASSET_BASE}/${String(path).replace(/^\/+/, '')}`
}

/** 品牌字体（R2 上的 ttf，带 immutable 缓存） */
export const FONT_FILES = {
  display: 'PlayfairDisplay-SemiBold.ttf',
  displayBold: 'PlayfairDisplay-Bold.ttf',
  body: 'Lora-Regular.ttf',
  script: 'Caveat-Bold.ttf',
} as const
