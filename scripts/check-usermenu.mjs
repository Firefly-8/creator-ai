#!/usr/bin/env node
/**
 * 账号菜单（UserMenu）验收
 *   1. 登录后顶栏出现「头像 + 名字」，不是两个并排按钮
 *   2. 点开是菜单：My cards + Sign out
 *   3. 菜单项能跳 /my-cards
 *   4. Sign out 之后回到未登录状态
 *   5. 移动端汉堡菜单里也有账号 + 登出（以前登不出去）
 *
 * ⚠️ 怎么假装「已登录」：
 *   不去真的注册生产 Firebase 账号（会留垃圾用户），
 *   而是在 dev 模式下直接改 Vue 组件实例里的 user ref。
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
const OUT = process.argv[3] || '/workspace/output/usermenu'

/** 在页面里把 layout 的 user ref 换成假用户 */
async function fakeLogin(page, name, email) {
  return page.evaluate(([n, e]) => {
    const app = document.querySelector('#__nuxt')?.__vue_app__
    if (!app) throw new Error('找不到 __vue_app__')
    const list = []
    const walk = (vnode) => {
      if (!vnode || typeof vnode !== 'object') return
      if (vnode.component) {
        list.push(vnode.component)
        walk(vnode.component.subTree)
      }
      // Nuxt 的根是 Suspense，真正的内容在 ssContent 里
      walk(vnode.ssContent)
      if (Array.isArray(vnode.children)) vnode.children.forEach(walk)
    }
    walk(app._instance.subTree)
    const layout = list.find(c => String(c.type?.__file || '').includes('layouts/marketing'))
    if (!layout) throw new Error('找不到 marketing layout 实例')
    layout.setupState.user = { displayName: n, email: e, photoURL: null }
    return layout.type.__file
  }, [name, email])
}

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
const errors = []
page.on('pageerror', e => errors.push(String(e)))
const fail = []
const ok = []
function check(name, cond, extra = '') {
  ;(cond ? ok : fail).push(name)
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`)
}

await page.goto(`${BASE}/cards`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForSelector('.mk-top__actions', { timeout: 30000 })
await page.waitForTimeout(1500)

// cookie 条先关掉
const cookie = page.locator('.ck-cookie__btn--primary')
if (await cookie.count() && await cookie.first().isVisible().catch(() => false)) {
  await cookie.first().click()
  await page.waitForTimeout(400)
}

// ── 未登录时：还是两个按钮 ────────────────────────────────
check('未登录时顶栏是 Log in / Start free',
  await page.locator('.mk-top__actions .mk-btn').count() === 2)
check('未登录时没有账号菜单', await page.locator('.um').count() === 0)

// ── 登录后 ───────────────────────────────────────────────
await fakeLogin(page, 'Margaret Smith', 'margaret.smith@example.com')
await page.waitForTimeout(800)
check('登录后顶栏出现账号菜单', await page.locator('.um__trigger').count() === 1)
const shown = ((await page.locator('.um__name').textContent().catch(() => '')) || '').trim()
check('显示账号名字', shown === 'Margaret Smith', `当前="${shown}"`)
check('头像是首字母', ((await page.locator('.um__avatar').textContent().catch(() => '')) || '').trim() === 'M')
check('原来的 Log out 按钮没了', await page.locator('.mk-top__actions .mk-btn').count() === 0)
await page.screenshot({ path: `${OUT}-1-header.png` })

// ── 点开菜单 ─────────────────────────────────────────────
await page.locator('.um__trigger').click()
await page.waitForTimeout(500)
check('点开是下拉菜单', await page.locator('.um__panel').isVisible())
const items = (await page.locator('.um__item').allTextContents()).map(t => t.trim())
check('菜单里有 My cards', items.some(t => t.includes('My cards')), items.join(' | '))
check('菜单里有 Sign out', items.some(t => t.includes('Sign out')), items.join(' | '))
check('菜单里有邮箱', ((await page.locator('.um__head-mail').textContent()) || '').includes('margaret.smith@example.com'))
await page.screenshot({ path: `${OUT}-2-menu.png` })

// ── 点外面关闭 ───────────────────────────────────────────
await page.mouse.click(200, 500)
await page.waitForTimeout(400)
check('点外面菜单关闭', await page.locator('.um__panel').count() === 0)

// ── My cards 能跳 ────────────────────────────────────────
await page.locator('.um__trigger').click()
await page.waitForTimeout(400)
await page.locator('.um__item', { hasText: 'My cards' }).click()
await page.waitForTimeout(2000)
check('My cards 能跳转', page.url().includes('/my-cards'), page.url())

// ── Sign out ────────────────────────────────────────────
await fakeLogin(page, 'Margaret Smith', 'margaret.smith@example.com')
await page.waitForTimeout(500)
await page.locator('.um__trigger').click()
await page.waitForTimeout(400)
await page.locator('.um__item', { hasText: 'Sign out' }).click()
await page.waitForTimeout(2000)
// ⚠️ 这里没法断言「顶栏变回未登录」：我们注入的是假 user，
//    Firebase 那边根本没登录过 → signOut 不会触发 auth 状态变化 →
//    顶栏不会自己变回去。真实登录时这一步由 onAuthStateChanged 负责。
//    能验的是：点了没报错、并且跳回了首页（logout() + navigateTo('/') 走通）。
check('登出后回到首页', !page.url().includes('/my-cards'), page.url())
check('登出后没有 JS 报错', errors.length === 0, errors.slice(0, 2).join(' | '))

// ── 移动端：汉堡菜单里也得有登出 ────────────────────────
await page.setViewportSize({ width: 390, height: 844 })
await page.goto(`${BASE}/cards`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForSelector('.mk-burger', { state: 'attached', timeout: 30000 })
await page.waitForTimeout(1500)
await fakeLogin(page, 'Margaret Smith', 'margaret.smith@example.com')
await page.waitForTimeout(600)
await page.locator('.mk-burger').click()
await page.waitForTimeout(600)
check('移动端汉堡菜单里有账号菜单', await page.locator('.mk-mobile .um').count() === 1)
await page.locator('.mk-mobile .um__trigger').click()
await page.waitForTimeout(500)
const mobileItems = (await page.locator('.mk-mobile .um__item').allTextContents()).map(t => t.trim())
check('移动端菜单里有 Sign out', mobileItems.some(t => t.includes('Sign out')), mobileItems.join(' | '))
await page.screenshot({ path: `${OUT}-3-mobile.png` })

console.log(`\n通过 ${ok.length} / 失败 ${fail.length}`)
if (fail.length) process.exitCode = 1
await browser.close()
