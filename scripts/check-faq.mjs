#!/usr/bin/env node
/**
 * FAQ 手风琴验收 + 截图
 *   1. 手风琴一次只展开一个
 *   2. 再点一次已展开的 → 收起来
 *   3. 首页 / 定价页 / for/[slug] 三处长相一致
 *   4. 登录弹窗底部只剩一个隐私协议链接
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
const OUT = process.argv[3] || '/workspace/output/faq'

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

/** 当前展开的是第几个（-1 = 全收起） */
async function openIndex() {
  const items = page.locator('.ck-acc__item')
  const n = await items.count()
  for (let i = 0; i < n; i++) {
    const isOpen = await items.nth(i).evaluate(el => el.classList.contains('is-open'))
    if (isOpen) return i
  }
  return -1
}

async function gotoPage(pathname) {
  await page.goto(`${BASE}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('.ck-acc', { timeout: 30000 })
  await page.waitForTimeout(1200)
  // cookie 条会挡住页面底部，先关掉
  const cookie = page.locator('.ck-cookie__btn--primary')
  if (await cookie.count() && await cookie.first().isVisible().catch(() => false)) {
    await cookie.first().click()
    await page.waitForTimeout(400)
  }
}

// ── 1. 首页 ────────────────────────────────────────────────
await gotoPage('/')
check('首页有手风琴', await page.locator('.ck-acc__item').count() > 0,
  `${await page.locator('.ck-acc__item').count()} 条`)
check('首页默认展开第一条', await openIndex() === 0, `当前=${await openIndex()}`)

// 点第二条 → 第一条应该自动收起
await page.locator('.ck-acc__q').nth(1).click()
await page.waitForTimeout(700)
check('点第二条后只展开第二条', await openIndex() === 1, `当前=${await openIndex()}`)
await page.locator('.ck-acc').scrollIntoViewIfNeeded()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}-home.png` })

// 再点一次已展开的 → 全部收起
await page.locator('.ck-acc__q').nth(1).click()
await page.waitForTimeout(700)
check('再点一次能全部收起', await openIndex() === -1, `当前=${await openIndex()}`)

// ── 2. 定价页 ──────────────────────────────────────────────
await gotoPage('/pricing')
check('定价页有手风琴', await page.locator('.ck-acc__item').count() > 0)
await page.locator('.ck-acc').scrollIntoViewIfNeeded()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}-pricing.png` })

// ── 3. for/[slug] 落地页 ───────────────────────────────────
await gotoPage('/for/mum')
check('落地页有手风琴', await page.locator('.ck-acc__item').count() > 0)
await page.locator('.ck-acc').scrollIntoViewIfNeeded()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}-for-mum.png` })

// ── 4. 登录弹窗底部 ─────────────────────────────────────────
await gotoPage('/')
const headerBtn = page.locator('.mk-top__actions button').first()
await headerBtn.click()
await page.waitForSelector('.ck-auth', { timeout: 15000 })
await page.waitForTimeout(800)
const promiseText = ((await page.locator('.ck-auth__promise').textContent()) || '').trim()
check('弹窗底部只剩隐私协议链接', promiseText === 'Privacy Policy', `当前="${promiseText}"`)
check('隐私协议链接指向 /privacy',
  (await page.locator('.ck-auth__privacy').getAttribute('href')) === '/privacy')
await page.screenshot({ path: `${OUT}-auth.png` })

console.log(`\n通过 ${ok.length} / 失败 ${fail.length}`)
if (fail.length) process.exitCode = 1
await browser.close()
