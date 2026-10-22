#!/usr/bin/env node
/**
 * 本地截图工具（UI 迭代验收用）
 *
 * 用法：node scripts/shot.mjs <baseUrl> <path> <out.png> [width] [height] [--full]
 *
 * ⚠️ 沙箱要点：
 *   - 出口有中间人证书 → 必须 --ignore-certificate-errors + ignoreHTTPSErrors
 *   - networkidle 等不到 → 用 domcontentloaded
 *   - 必须等字体加载完（document.fonts.ready），否则量的是 fallback 字体
 *   - cookie 条会挡住底部 → 截图前先点掉
 */
import { chromium } from 'playwright-core'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const BASE = process.argv[2] || 'http://127.0.0.1:8801'
const PATHNAME = process.argv[3] || '/pricing'
const OUT = process.argv[4] || '/workspace/output/shot.png'
const W = Number(process.argv[5] || 1280)
const H = Number(process.argv[6] || 900)
const FULL = process.argv.includes('--full')

function findChrome() {
  // ⚠️ 沙箱里 HOME 可能不是 /root，浏览器缓存常常在 /root/.cache/ms-playwright。
  //    而且同一个版本号下目录名可能是 chrome-linux 或 chrome-linux64（两种都见过）。
  const bases = [
    join(homedir(), '.cache/ms-playwright'),
    '/root/.cache/ms-playwright',
  ]
  const rels = [
    'chromium-1248/chrome-linux64/chrome',
    'chromium-1248/chrome-linux/chrome',
    'chromium-1243/chrome-linux64/chrome',
    'chromium-1243/chrome-linux/chrome',
    'chromium/chrome-linux/chrome',
  ]
  for (const base of bases) {
    for (const rel of rels) {
      const p = join(base, rel)
      if (existsSync(p)) return p
    }
  }
  throw new Error('找不到 chromium：npx playwright-core install chromium')
}

const browser = await chromium.launch({
  executablePath: findChrome(),
  args: ['--ignore-certificate-errors', '--no-sandbox', '--disable-dev-shm-usage'],
})
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  ignoreHTTPSErrors: true,
  deviceScaleFactor: 2,
})
const page = await ctx.newPage()
await page.goto(BASE + PATHNAME, { waitUntil: 'domcontentloaded', timeout: 45000 })
await page.evaluate(() => document.fonts?.ready).catch(() => {})
await page.waitForTimeout(1000)

// cookie 条挡视线 → 先点掉
for (const sel of ['button:has-text("Only necessary")', 'button:has-text("Accept all")']) {
  const b = page.locator(sel).first()
  if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(300) }
}
await page.screenshot({ path: OUT, fullPage: FULL })
console.log('✅ 截图：' + OUT)
await browser.close()
