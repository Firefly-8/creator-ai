/**
 * /robots.txt —— 爬虫入口
 *
 * ⚠️ 收录策略（test 环境禁收录 / master 正常收录）：
 *   判断逻辑在 `utils/robots.ts`，**和页面里的 <meta name="robots"> 是同一套**。
 *   两边以前各写各的 → craftai 项目的 preview 部署出现了
 *   「robots.txt 说可以收录、meta 说 noindex」的矛盾。
 *
 *   判断顺序：
 *     1. env var NUXT_PUBLIC_DISABLE_INDEX（部署时快照，改了要重新部署才生效）
 *     2. hostname 兜底（staging / localhost / *.pages.dev …）
 *   任一命中 → 全部禁收录。
 */
import { shouldDisallowIndex } from '../../utils/robots'
import { envString } from '../utils/env'

export default defineEventHandler((event) => {
  const host = getRequestHost(event, { xForwardedHost: true })
  const disableIndex = envString(event, 'NUXT_PUBLIC_DISABLE_INDEX', '')

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')

  if (shouldDisallowIndex(host, disableIndex)) {
    // 非正式环境：全部禁掉，也不要给 sitemap（别把生产站的 URL 列表喂出去）
    setHeader(event, 'Cache-Control', 'public, max-age=300')
    return [
      'User-Agent: *',
      'Disallow: /',
      '',
    ].join('\n')
  }

  // 正式环境：允许正常爬取
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return [
    'User-Agent: *',
    'Disallow:',
    'Allow: /',
    '',
    // 告诉爬虫 sitemap 在哪
    'Sitemap: https://create.yozzytools.com/sitemap.xml',
    '',
  ].join('\n')
})
