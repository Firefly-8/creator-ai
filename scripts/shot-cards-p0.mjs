/**
 * P0 视觉验收：桌面 + 移动视口
 *   1. /cards 打开参数弹窗（匿名可开始）
 *   2. ?uiPreview=composer 本地注入编辑器（不调真实 AI）
 *      → Keep / Take 分区、权限条、Finish
 *
 * 用法：node scripts/shot-cards-p0.mjs [baseUrl] [outDir]
 */
import { chromium } from 'playwright-core'
import path from 'node:path'
import os from 'node:os'
import { existsSync, mkdirSync } from 'node:fs'

const EXE_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  path.join(os.homedir(), '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome'),
  path.join(os.homedir(), '.cache/ms-playwright/chromium-1243/chrome-linux/chrome'),
  '/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome',
  '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome',
].filter(Boolean)
const EXE = EXE_CANDIDATES.find(p => existsSync(p))
if (!EXE) {
  console.error('找不到 chromium/chrome')
  process.exit(1)
}

const BASE = process.argv[2] || 'http://127.0.0.1:5175'
const OUT = process.argv[3] || '/opt/cursor/artifacts/cards-p0'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  executablePath: EXE,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
})

async function dismissCookie(page) {
  const btn = page.locator('.ck-cookie__btn--primary')
  if (await btn.count() && await btn.first().isVisible().catch(() => false)) {
    await btn.first().click().catch(() => {})
    await page.waitForTimeout(300)
  }
}

async function shot(name, viewport, pathSuffix, fn) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(String(e)))
  try {
    await fn(page)
    const file = path.join(OUT, `${pathSuffix}.png`)
    await page.screenshot({ path: file, fullPage: true })
    console.log(`✓ ${name} → ${file}`)
    if (errors.length) console.log(`  pageerrors: ${errors.slice(0, 3).join(' | ')}`)
  } catch (e) {
    console.error(`✗ ${name}:`, e.message)
    await page.screenshot({ path: path.join(OUT, `${pathSuffix}-FAIL.png`), fullPage: true }).catch(() => {})
    throw e
  } finally {
    await ctx.close()
  }
}

const desktop = { width: 1280, height: 900 }
const mobile = { width: 390, height: 844 }

await shot('desktop form modal', desktop, '01-desktop-form', async (page) => {
  await page.goto(`${BASE}/cards?format=card`, { waitUntil: 'networkidle', timeout: 90000 })
  await dismissCookie(page)
  await page.locator('.ck-hero__cta').first().click()
  await page.waitForSelector('.ck-formmodal__panel', { timeout: 15000 })
  await page.waitForTimeout(500)
})

await shot('mobile form modal', mobile, '02-mobile-form', async (page) => {
  await page.goto(`${BASE}/cards?format=card`, { waitUntil: 'networkidle', timeout: 90000 })
  await dismissCookie(page)
  await page.locator('.ck-hero__cta').first().click()
  await page.waitForSelector('.ck-formmodal__panel', { timeout: 15000 })
  await page.waitForTimeout(500)
})

await shot('desktop composer Keep/Take', desktop, '03-desktop-composer', async (page) => {
  await page.goto(`${BASE}/cards?format=card&uiPreview=composer`, { waitUntil: 'networkidle', timeout: 90000 })
  await dismissCookie(page)
  await page.waitForSelector('.ck-comp', { timeout: 20000 })
  await page.waitForSelector('[data-sec="keep"]', { timeout: 10000 })
  await page.waitForSelector('[data-sec="take"]', { timeout: 5000 })
  await page.waitForSelector('[data-act="export-permission"]', { timeout: 5000 })
  // 滚到交付区
  await page.locator('[data-sec="take"]').scrollIntoViewIfNeeded()
  await page.waitForTimeout(800)
})

await shot('mobile composer Keep/Take', mobile, '04-mobile-composer', async (page) => {
  await page.goto(`${BASE}/cards?format=card&uiPreview=composer`, { waitUntil: 'networkidle', timeout: 90000 })
  await dismissCookie(page)
  await page.waitForSelector('.ck-comp', { timeout: 20000 })
  await page.locator('[data-sec="keep"]').scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await page.locator('[data-sec="take"]').scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
})

await browser.close()
console.log('done', OUT)
