#!/usr/bin/env node
/**
 * 全站页面审计：逐个访问 + 截图 + 提取风格信号
 *
 * 风格判定信号：
 *   - body 背景色（浅色系 = 新品牌；深色 #0a0910 附近 = 旧工作台）
 *   - 页面里是否用了 .ck-* 新风格类名
 *   - 主标题文字（能看出还是不是旧文案）
 *   - 页面用了哪个布局（marketing = 新 / default = 旧深色工作台）
 *
 * 用法：node scripts/audit-pages.mjs [baseUrl] [outDir]
 */
import { chromium } from 'playwright-core'
import path from 'node:path'
import os from 'node:os'
import { mkdir, writeFile } from 'node:fs/promises'

const EXE = path.join(
  os.homedir(),
  '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
)
const BASE = process.argv[2] || 'https://staging.creator.yozzytools.com'
const OUT = process.argv[3] || '/workspace/output/audit'
await mkdir(OUT, { recursive: true })

const ROUTES = [
  '/', '/cards', '/pricing', '/blog', '/my-cards', '/gallery',
  '/about', '/contact', '/privacy', '/terms',
  '/tools', '/dashboard', '/ai-image-generator', '/ai-music-generator',
  '/image', '/create', '/cover', '/music-library', '/song/1',
  '/login', '/signup',
  '/admin', '/admin/dashboard', '/admin/users', '/admin/feedback', '/admin/gift', '/admin/blog',
]

/** 判断颜色是不是「浅色系」 */
function isLight(rgb) {
  const m = String(rgb).match(/(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/)
  if (!m) return null
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])]
  return (r * 299 + g * 587 + b * 114) / 1000 > 140
}

const browser = await chromium.launch({
  executablePath: EXE,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
})

const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 1,
  ignoreHTTPSErrors: true,
})

const results = []

for (const route of ROUTES) {
  const page = await ctx.newPage()
  const url = BASE + route
  const rec = { route, url, status: 0, error: '' }
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
    rec.status = resp?.status() || 0
    await page.waitForTimeout(2200)

    rec.title = await page.title()
    rec.bg = await page.evaluate(() => {
      const b = getComputedStyle(document.body).backgroundColor
      const h = document.querySelector('.ck-home, .ck-cards, .ck-blog, .ck-pricing, .ck-mine, .ck-post, .marketing, .mk-shell')
      if (h) {
        const s = getComputedStyle(h).backgroundColor
        if (s && s !== 'rgba(0, 0, 0, 0)') return s
      }
      return b
    })
    rec.light = isLight(rec.bg)
    rec.newStyle = await page.evaluate(() => {
      const c = document.querySelectorAll('[class*="ck-"], .mk-shell, .mk-top, .mk-foot')
      return c.length
    })
    rec.h1 = await page.evaluate(() => {
      const h = document.querySelector('h1')
      return h ? h.textContent.trim().slice(0, 70) : ''
    })
    rec.hasSidebar = await page.evaluate(() => !!document.querySelector('.studio-sidebar'))
    rec.ckCount = await page.evaluate(() => document.querySelectorAll('[class*="ck-"]').length)
    rec.dupMeta = await page.evaluate(() => {
      // 检查 head 里是否有重复的 meta name（SEO bug）
      const names = {}
      let dup = []
      document.querySelectorAll('head meta[name]').forEach(m => {
        const n = m.getAttribute('name')
        names[n] = (names[n] || 0) + 1
      })
      for (const k in names) if (names[k] > 1) dup.push(`${k}×${names[k]}`)
      return dup
    })

    const name = route.replace(/\//g, '_') || '_root'
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false })
  } catch (e) {
    rec.error = String(e?.message || e).split('\n')[0].slice(0, 120)
  }
  await page.close()
  results.push(rec)
  const flag = rec.status >= 400 ? 'XX' : rec.light === false ? 'DARK' : 'light'
  console.log(
    `${flag.padEnd(5)} ${String(rec.status).padEnd(4)} ck=${String(rec.ckCount || 0).padEnd(4)} ${route.padEnd(24)} ${rec.h1 || rec.error || ''}`,
  )
}

await browser.close()
await writeFile(path.join(OUT, 'audit.json'), JSON.stringify(results, null, 2))
console.log(`\n→ ${OUT}/audit.json`)
