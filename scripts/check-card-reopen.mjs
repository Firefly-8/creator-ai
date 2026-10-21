#!/usr/bin/env node
/**
 * 「从 My cards 打开旧卡」验收
 *   /cards?from=<imageId>  →  把那张图放回编辑区（能改字、能再下载）
 *
 * ⚠️ 以前这个参数根本没人读 —— 点 My cards 里的卡片只是开了一张新卡。
 *
 * 怎么测：拦掉 /api/images 返回一张假图（不真注册账号）
 */
import { chromium } from 'playwright-core'
import path from 'node:path'
import os from 'node:os'
import { existsSync } from 'node:fs'

const EXE_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  path.join(os.homedir(), '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome'),
  path.join(os.homedir(), '.cache/ms-playwright/chromium-1243/chrome-linux/chrome'),
  '/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome',
  '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
].filter(Boolean)
const EXE = EXE_CANDIDATES.find(p => existsSync(p))
if (!EXE) { console.error('找不到 chromium'); process.exit(1) }

const BASE = process.argv[2] || 'http://localhost:3000'
const OUT = process.argv[3] || '/workspace/output/reopen'

const browser = await chromium.launch({
  executablePath: EXE,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
})
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
  ignoreHTTPSErrors: true,
})
const page = await ctx.newPage()
const fail = []
const ok = []
function check(name, cond, extra = '') {
  ;(cond ? ok : fail).push(name)
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`)
}

// 拦掉「我的卡片列表」接口，返回一张假卡
await page.route('**/api/images', route => {
  if (route.request().method() !== 'GET') return route.continue()
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      images: [
        { id: 'card-123', imageUrl: '/api/images/card-123/file', createdAt: '2026-10-21' },
        { id: 'other-999', imageUrl: '/api/images/other-999/file', createdAt: '2026-10-20' },
      ],
    }),
  })
})
// 图片本体也拦掉（免得 401 报红）
await page.route('**/api/images/*/file', route =>
  route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>' }),
)

await page.goto(`${BASE}/cards?from=card-123`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(2500)

check('旧卡被打开了（进了第 4 步）', await page.locator('.ck-cand').count() === 1,
  `候选数=${await page.locator('.ck-cand').count()}`)
check('编辑器出来了', await page.locator('.ck-editor').count() === 1)
check('有下载按钮', await page.locator('.ck-btn', { hasText: 'Download' }).count() >= 1)
const headline = ((await page.locator('.ck-h1').textContent().catch(() => '')) || '').trim()
check('标题说的是「这张卡」而不是「挑一张」', headline.includes('Your card'), `当前="${headline}"`)
await page.screenshot({ path: `${OUT}-reopen.png` })

// 不带 from 时不应该进第 4 步
await page.goto(`${BASE}/cards`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(2000)
check('普通进入还是第 1 步', await page.locator('.ck-cand').count() === 0)

console.log(`\n通过 ${ok.length} / 失败 ${fail.length}`)
if (fail.length) process.exitCode = 1
await browser.close()
