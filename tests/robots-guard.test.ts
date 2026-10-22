/**
 * 收录策略守卫（robots）
 *
 * ⚠️ 背景（2026-10-22 审计 robots 时发现）：
 *   「能不能被谷歌收录」这件事，代码里有**两套互不相干的判断**：
 *     · /robots.txt        → 看 env var NUXT_PUBLIC_DISABLE_INDEX === 'true'
 *     · <meta name=robots> → 看 hostname 里有没有 'staging' / 'pages.dev'
 *   两边会打架 —— 实际后果：craftai 项目的 **preview 部署**
 *   （test.craftai.pages.dev）的 robots.txt 写着「允许收录」，
 *   而页面 meta 写着 noindex。
 *
 *   目标（产品要求）：
 *     · test / 预发布环境 → **不能**被谷歌收录
 *     · master / 正式环境 → 正常收录
 *
 * 这个测试锁住：
 *   1. 两处判断**必须**走同一个 utils/robots.ts
 *   2. 旧的 server/api/robots.txt.get.ts 不许复活
 *      （它写着 Allow: / + Sitemap: https://craftai.ai/... —— craftai.ai 不是我们的域名）
 *   3. 预发布不许吐 sitemap
 *   4. hostname 兜底规则覆盖 staging / pages.dev / localhost
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { shouldDisallowIndex, isNonProductionHost } from '../utils/robots'

const ROOT = process.cwd()
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8')

const robotsRoute = read('server/routes/robots.txt.ts')
const composable = read('composables/useRobots.ts')
const sitemapRoute = read('server/routes/sitemap.xml.get.ts')
const authMw = read('server/middleware/auth.ts')

describe('收录策略：判断逻辑只有一套', () => {
  it('/robots.txt 走 utils/robots.ts', () => {
    expect(robotsRoute).toContain('shouldDisallowIndex')
    expect(robotsRoute).toContain("from '../../utils/robots'")
  })

  it('<meta name="robots"> 也走 utils/robots.ts', () => {
    expect(composable).toContain('shouldDisallowIndex')
    expect(composable).toContain("from '~/utils/robots'")
  })

  it('两边用的是同一个模块（不许各写各的判断）', () => {
    expect(robotsRoute).toContain("utils/robots")
    expect(composable).toContain("utils/robots")
  })
})

describe('收录策略：行为', () => {
  it('env var 说禁 → 禁', () => {
    expect(shouldDisallowIndex('create.yozzytools.com', 'true')).toBe(true)
    expect(shouldDisallowIndex('create.yozzytools.com', '1')).toBe(true)
    expect(shouldDisallowIndex('create.yozzytools.com', 'yes')).toBe(true)
  })

  it('env var 没配 → 靠 hostname 判断', () => {
    expect(shouldDisallowIndex('staging.creator.yozzytools.com', '')).toBe(true)
    expect(shouldDisallowIndex('test.craftai.pages.dev', '')).toBe(true)
    expect(shouldDisallowIndex('craftai.pages.dev', '')).toBe(true)
    expect(shouldDisallowIndex('localhost', '')).toBe(true)
  })

  it('正式域名 → 允许收录', () => {
    expect(shouldDisallowIndex('create.yozzytools.com', '')).toBe(false)
    expect(shouldDisallowIndex('creator.yozzytools.com', '')).toBe(false)
    expect(shouldDisallowIndex('admin.yozzytools.com', '')).toBe(false)
  })

  it('isNonProductionHost 能识别预发布域名', () => {
    expect(isNonProductionHost('staging.creator.yozzytools.com')).toBe(true)
    expect(isNonProductionHost('craftai-staging.pages.dev')).toBe(true)
    expect(isNonProductionHost('create.yozzytools.com')).toBe(false)
  })
})

describe('收录策略：旧文件不许复活', () => {
  it('server/api/robots.txt.get.ts 已删（它指向 craftai.ai）', () => {
    expect(existsSync(join(ROOT, 'server/api/robots.txt.get.ts'))).toBe(false)
  })

  it('auth 白名单里也不该再有 /api/robots', () => {
    expect(authMw).not.toContain("'/api/robots'")
  })
})

describe('收录策略：预发布不吐 sitemap', () => {
  it('sitemap 处理器会先判断环境，是预发布就 404', () => {
    expect(sitemapRoute).toContain('shouldDisallowIndex')
    expect(sitemapRoute).toContain('404')
  })
})
