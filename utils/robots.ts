/**
 * 收录策略判断（robots.txt 和 <meta name="robots"> 共用同一套逻辑）
 *
 * ⚠️ 背景（2026-10-22 审计 robots 时发现）：
 *   这两件事以前是**两套互不相干的判断**，会打架：
 *     · /robots.txt        → 看 env var NUXT_PUBLIC_DISABLE_INDEX === 'true'
 *     · <meta name=robots> → 看 hostname 里有没有 'staging' / 'localhost' / 'pages.dev'
 *   结果：craftai 项目的 **preview 部署**（test.craftai.pages.dev）
 *   —— env var 没配 → robots.txt 写着「允许收录」；
 *      而 meta 又写着 noindex。两边矛盾，Google 取严的那个（noindex），
 *      但别的爬虫/工具只读 robots.txt → **等于对外说「可以收录」**。
 *
 * 现在统一成一个函数：env var 优先，hostname 兜底。
 * 任何一边判断成「不收录」，就都不收录。
 */

/** hostname 兜底规则：命中就一律不收录 */
const NON_INDEXABLE_HOST_PATTERNS = [
  'staging',      // staging.creator.yozzytools.com
  'localhost',    // 本地开发
  '127.0.0.1',
  'pages.dev',    // *.pages.dev 是 CF 的默认域名 —— 不该和品牌域名抢收录
  'preview',
  '-qa',
  'test.',
]

/**
 * 这个 host 是不是「非正式环境」
 */
export function isNonProductionHost(host: string): boolean {
  // 去掉端口（x-forwarded-host 可能带 :443）
  const h = String(host || '').toLowerCase().split(':')[0]
  if (!h) return false
  return NON_INDEXABLE_HOST_PATTERNS.some(p => h.includes(p))
}

/**
 * 要不要禁止收录
 * @param host      当前请求的 hostname
 * @param envValue  NUXT_PUBLIC_DISABLE_INDEX 的值（'true' / '1' / 'yes' 都算 true）
 */
export function shouldDisallowIndex(host: string, envValue?: string | null): boolean {
  const v = String(envValue ?? '').trim().toLowerCase()
  if (v === 'true' || v === '1' || v === 'yes') return true
  return isNonProductionHost(host)
}

/** 收录时用的 robots meta 内容 */
export const INDEX_META = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
/** 不收录时用的 robots meta 内容 */
export const NOINDEX_META = 'noindex, nofollow'
