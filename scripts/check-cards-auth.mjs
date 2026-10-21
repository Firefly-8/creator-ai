#!/usr/bin/env node
/**
 * 登录弹窗行为验收（不只是截图）
 *   1. 未登录点「Make card」→ 弹登录框，note 可见
 *   2. 关掉弹窗 → 页面状态还在（还在第 3 步）
 *   3. 再点一次 → 还是弹登录框
 *   4. 手动切过标签之后再点「Make」→ 必须回到「Create an account」
 *      （旧代码只在 initialMode 的**值变化**时才重置标签 → 这里会串味）
 *   5. 从顶栏打开登录框 → **不该**还带着上一句 note（不能串味）
 *   6. 切到 Sign in 标签 → 布局正常
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
const OUT = process.argv[3] || '/workspace/output/cards-auth-check'

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
  ;(cond ? ok : fail).push(name + (extra ? ` (${extra})` : ''))
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`)
}
const activeTab = async () =>
  ((await page.locator('.ck-auth__tab.is-active').textContent().catch(() => '')) || '').trim()

async function openMakeModal() {
  await page.locator('.ck-nav__inner button', { hasText: 'Make' }).first().click()
  await page.waitForSelector('.ck-auth', { timeout: 20000 })
  await page.waitForTimeout(700)
}
async function closeModal() {
  await page.locator('.ck-auth__close').click()
  await page.waitForTimeout(500)
}

await page.goto(`${BASE}/cards`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForSelector('.ck-scene', { timeout: 30000 })
await page.waitForTimeout(1000)

// 线上有 cookie 同意条 —— 它 z-100，会挡住底部的「Make」按钮，先关掉
const cookieBtn = page.locator('.ck-cookie__btn--primary')
if (await cookieBtn.count() && await cookieBtn.first().isVisible().catch(() => false)) {
  await cookieBtn.first().click()
  await page.waitForTimeout(500)
  console.log('· 已关掉 cookie 同意条')
}

// 点第一个场景（页面还在 hydration 的话第一次点击不生效 → 重试）
const continueBtn = page.locator('.ck-nav__inner button', { hasText: 'Continue' }).first()
for (let i = 0; i < 20; i++) {
  await page.locator('.ck-scene').first().click().catch(() => {})
  await page.waitForTimeout(300)
  if (await continueBtn.isEnabled().catch(() => false)) break
}
check('选了场合后「Continue」可点', await continueBtn.isEnabled())
await continueBtn.click()
await page.waitForTimeout(500)
await continueBtn.click()
await page.waitForTimeout(700)

// 1. 点 Make → 弹登录框
await openMakeModal()
check('未登录点生成会弹登录框', await page.locator('.ck-auth').isVisible())
check('弹窗带上下文说明 note', await page.locator('.ck-auth__note').count() === 1,
  ((await page.locator('.ck-auth__note').textContent()) || '').trim())
check('默认停在「Create an account」', await activeTab() === 'Create an account', `当前=${await activeTab()}`)
await page.screenshot({ path: `${OUT}-1-open.png` })

// 2. 关掉弹窗
await closeModal()
check('弹窗能关掉', await page.locator('.ck-auth').count() === 0)
const step3 = ((await page.locator('.ck-steps-nav li.is-current').textContent()) || '')
check('关掉后还在第 3 步', step3.includes('Style'), step3.trim())

// 3. 再点一次 → 还是弹登录框
await openMakeModal()
check('再点一次还是弹登录框', await page.locator('.ck-auth').isVisible())
await closeModal()

// 4. 手动切到 Sign in → 关掉 → 再点 Make → 必须回到 Create an account
await openMakeModal()
await page.locator('.ck-auth__tab', { hasText: 'Sign in' }).first().click()
await page.waitForTimeout(400)
check('能手动切到 Sign in', await activeTab() === 'Sign in', `当前=${await activeTab()}`)
await closeModal()
await openMakeModal()
check('手动切过标签后仍按调用方的意图打开', await activeTab() === 'Create an account', `当前=${await activeTab()}`)
await page.screenshot({ path: `${OUT}-2-after-switch.png` })
await closeModal()

// 5. 从顶栏打开登录框 → 不该有 note
const headerBtn = page.locator('.mk-top__actions button').first()
if (await headerBtn.count()) {
  await headerBtn.click()
  await page.waitForSelector('.ck-auth', { timeout: 15000 })
  await page.waitForTimeout(600)
  check('顶栏打开的登录框没有残留 note', await page.locator('.ck-auth__note').count() === 0)
  await page.screenshot({ path: `${OUT}-3-header.png` })
  // 6. 切到 Sign in 标签 → 布局正常
  const tab = page.locator('.ck-auth__tab', { hasText: 'Sign in' })
  await tab.first().click()
  await page.waitForTimeout(500)
  check('Sign in 标签能切', await page.locator('.ck-auth__submit').textContent() === 'Sign in')
  await page.screenshot({ path: `${OUT}-4-signin.png` })
} else {
  check('顶栏登录按钮存在', false, '没找到 .mk-top__actions button')
}

console.log(`\n通过 ${ok.length} / 失败 ${fail.length}`)
if (fail.length) process.exitCode = 1
await browser.close()
