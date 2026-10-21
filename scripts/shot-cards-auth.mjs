#!/usr/bin/env node
/**
 * 「最后一步未登录」弹窗截图（视觉验收用）
 *
 * 走真实路径：
 *   /cards → 选场合 → 继续 → 继续 → 点「Make card」
 *   → 服务端返回 401 → 弹登录弹窗 → 截图
 *
 * 用法：node scripts/shot-cards-auth.mjs [baseUrl] [outPrefix]
 */
import { chromium } from 'playwright-core'
import path from 'node:path'
import os from 'node:os'
import { existsSync } from 'node:fs'

/** 沙箱里 chromium 的路径不一定一样（HOME 被改过），挨个试 */
const EXE_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  path.join(os.homedir(), '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome'),
  path.join(os.homedir(), '.cache/ms-playwright/chromium-1243/chrome-linux/chrome'),
  '/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome',
  '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
].filter(Boolean)
const EXE = EXE_CANDIDATES.find(p => existsSync(p))
if (!EXE) {
  console.error('找不到 chromium，候选路径：', EXE_CANDIDATES)
  process.exit(1)
}
const BASE = process.argv[2] || 'http://localhost:3000'
const OUT = process.argv[3] || '/workspace/output/cards-auth'

const browser = await chromium.launch({
  executablePath: EXE,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    // 沙箱网关有中间人证书，Chromium 默认不认
    '--ignore-certificate-errors',
  ],
})

async function shot(viewport, suffix) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto(`${BASE}/cards`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('.ck-scene', { timeout: 30000 })
  await page.waitForTimeout(1200)

  // 第 1 步：选一个场合
  await page.locator('.ck-scene').first().click()
  await page.waitForTimeout(400)

  // 第 1 → 2 步
  await page.locator('.ck-nav__inner button', { hasText: 'Continue' }).first().click()
  await page.waitForTimeout(600)
  // 第 2 → 3 步
  await page.locator('.ck-nav__inner button', { hasText: 'Continue' }).first().click()
  await page.waitForTimeout(800)

  // 第 3 步：点「Make card」→ 未登录 → 401 → 弹登录框
  const makeBtn = page.locator('.ck-nav__inner button', { hasText: 'Make' }).first()
  await makeBtn.waitFor({ state: 'visible', timeout: 15000 })
  await makeBtn.click()

  // 等登录弹窗（AuthModal）
  await page.waitForSelector('.ck-auth', { timeout: 20000 })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}-${suffix}.png` })
  console.log(`✓ ${OUT}-${suffix}.png`)

  // 弹窗是否把上下文说明显示出来了
  const note = await page.locator('.ck-auth__note').count()
  console.log(`  note 元素：${note ? '有' : '无'}`)

  // 顺便看看有没有 JS 报错
  if (errors.length) {
    console.log('  ⚠️ 页面报错：')
    for (const e of errors.slice(0, 5)) console.log('   ', e.slice(0, 200))
  } else {
    console.log('  ✓ 无页面报错')
  }

  await ctx.close()
}

await shot({ width: 1280, height: 900 }, 'desktop')
await shot({ width: 390, height: 844 }, 'mobile')

await browser.close()
