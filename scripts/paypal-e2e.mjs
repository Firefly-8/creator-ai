#!/usr/bin/env node
/**
 * PayPal 端到端验证（沙箱）：建单 → 真实付款 → capture 发额度 → 幂等检查
 *
 * 用法：
 *   # 1) 先拿到一个登录用户的 Firebase token（浏览器登录后从 devtools 里复制
 *   #    Authorization: Bearer <token>），放到环境变量里
 *   export FIREBASE_TOKEN=xxxx
 *   # 2) 沙箱买家账号（沙箱密码不是你的 PayPal 密码）
 *   export PP_EMAIL=sb-xxx@personal.example.com
 *   export PP_PASS=xxxx
 *   # 3) 跑
 *   node scripts/paypal-e2e.mjs
 *
 * 可选：
 *   BASE=https://staging.creator.yozzytools.com   # 默认就是这个
 *
 * ⚠️ 前提：目标环境的 CF 变量里已经配好 PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET /
 *    PAYPAL_SANDBOX=true / PAYPAL_CREATOR_PLAN_ID / PAYPAL_WEBHOOK_ID
 *
 * ⚠️ PayPal 沙箱结账页的界面语言随机（可能中文「完成购物」），而且偶尔会卡在
 *    「正在获取您的钱包」——那是 PayPal 沙箱侧的不稳定，重跑即可。
 */
import { chromium } from 'playwright-core'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const EXE_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  join(homedir(), '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome'),
  join(homedir(), '.cache/ms-playwright/chromium-1243/chrome-linux/chrome'),
  '/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome',
  '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
].filter(Boolean)
const EXE = EXE_CANDIDATES.find(p => existsSync(p))
if (!EXE) {
  console.error('找不到 chromium（npx playwright install chromium 装一下，或设 CHROMIUM_PATH）')
  process.exit(1)
}

const BASE = process.env.BASE || 'https://staging.creator.yozzytools.com'
const TOKEN = process.env.FIREBASE_TOKEN
const PP_EMAIL = process.env.PP_EMAIL
const PP_PASS = process.env.PP_PASS
const OUT = process.env.OUT || '/workspace/output/paypal-e2e'
mkdirSync(OUT, { recursive: true })

if (!TOKEN || !PP_EMAIL || !PP_PASS) {
  console.error('需要 FIREBASE_TOKEN / PP_EMAIL / PP_PASS 三个环境变量')
  process.exit(1)
}

const AUTH = { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }
const log = (...a) => console.log('[paypal-e2e]', ...a)
const sleep = ms => new Promise(r => setTimeout(r, ms))
let failed = false
function check(name, cond, extra) {
  log((cond ? '✅ ' : '❌ ') + name + (cond ? '' : '  ' + (extra || '')))
  if (!cond) failed = true
}
let step = 0
async function shot(page, name) {
  const f = `${OUT}/${String(++step).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: f }).catch(() => {})
  log('  📸', f)
}

/** 带重试的请求（沙箱 DNS 会抽风） */
async function api(method, path, body) {
  for (let i = 1; i <= 6; i++) {
    try {
      const r = await fetch(BASE + path, {
        method,
        headers: AUTH,
        body: body ? JSON.stringify(body) : undefined,
      })
      const text = await r.text()
      let json = null
      try { json = JSON.parse(text) } catch { json = text.slice(0, 200) }
      if (r.status >= 500 && i < 6) { await sleep(3000); continue }
      return { status: r.status, json }
    } catch {
      await sleep(3000)
    }
  }
  return { status: 0, json: 'all retries failed' }
}

// ── 1. 付款前额度 ──
log('1. 付款前额度')
const before = await api('GET', '/api/user/usage')
check('usage 可读', before.status === 200, 'status=' + before.status)
log('  ', JSON.stringify(before.json).slice(0, 220))

// ── 2. 服务端建单（金额由服务端定，前端传什么都不影响）──
log('2. POST /api/paypal/order')
const order = await api('POST', '/api/paypal/order', { planId: 'single' })
check('建单成功', order.status === 200 && !!order.json?.orderId, JSON.stringify(order.json).slice(0, 150))
if (!order.json?.orderId) process.exit(1)
check('金额由服务端决定 = 6.99', String(order.json.amount) === '6.99', '实际 ' + order.json.amount)
const orderId = order.json.orderId
log('   orderId =', orderId)

// ── 3. PayPal 真实付款 ──
log('3. PayPal 沙箱付款')
const browser = await chromium.launch({
  executablePath: EXE,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true })
const page = await ctx.newPage()

for (let i = 1; i <= 5; i++) {
  try {
    await page.goto(order.json.approveUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
    const t = await page.locator('body').innerText().catch(() => '')
    if (t.includes('DNS cache overflow') || t.trim().length < 30) { await sleep(3000); continue }
    break
  } catch (e) { log('  goto 重试:', e.message.slice(0, 60)); await sleep(3000) }
}
await sleep(3000)
await shot(page, 'approve')

if (await page.locator('#email').count()) {
  log('   沙箱买家登录…')
  await page.locator('#email').fill(PP_EMAIL)
  await page.locator('#btnNext').click({ noWaitAfter: true, timeout: 20000 }).catch(() => {})
  await sleep(4000)
  if (await page.locator('#password').count()) {
    await page.locator('#password').fill(PP_PASS)
    await page.locator('#btnLogin').click({ noWaitAfter: true, timeout: 20000 }).catch(() => {})
  }
  await sleep(8000)
}
await shot(page, 'logged-in')

// 付款按钮（PayPal 界面语言随机，中英文都试）
const PAY_SELECTORS = [
  '#payment-submit-btn',
  'button:has-text("Pay Now")',
  'button:has-text("Pay $6.99")',
  '#confirmButtonTop',
  'button:has-text("Complete Purchase")',
  'button:has-text("立即付款")',
  'button:has-text("确认付款")',
  'button:has-text("完成购物")',
  'button:has-text("完成訂單")',
]
let paid = false
for (let attempt = 1; attempt <= 12 && !paid; attempt++) {
  for (const sel of PAY_SELECTORS) {
    const el = page.locator(sel).first()
    if (await el.count()) {
      log('   点', sel)
      await el.click({ timeout: 15000, noWaitAfter: true }).catch(e => log('   click 失败:', e.message.slice(0, 60)))
      paid = true
      break
    }
  }
  if (!paid) await sleep(5000)
}
check('找到并点了付款按钮', paid, 'PayPal 结账页可能卡在「正在获取您的钱包」，重跑试试')
await sleep(9000)
await shot(page, 'after-pay')
await browser.close()

// ── 4. capture（服务端回查 PayPal 确认已付款才发额度）──
log('4. POST /api/paypal/order/capture')
const cap = await api('POST', '/api/paypal/order/capture', { orderId })
log('  ', JSON.stringify(cap.json).slice(0, 220))
check('capture 成功', cap.status === 200 && cap.json?.ok !== false, 'status=' + cap.status)

// ── 5. 额度到账 ──
log('5. 付款后额度')
const after = await api('GET', '/api/user/usage')
log('  ', JSON.stringify(after.json).slice(0, 220))
check('usage 可读', after.status === 200)
const pb = before.json?.plan, pa = after.json?.plan
check(`plan ${pb} → ${pa}`, pb !== pa || !!after.json?.credits, '额度没变化')

// ── 6. 幂等：重复 capture 不该再发额度 ──
log('6. 重复 capture（幂等）')
const cap2 = await api('POST', '/api/paypal/order/capture', { orderId })
log('  ', JSON.stringify(cap2.json).slice(0, 160))
const after2 = await api('GET', '/api/user/usage')
check('没有重复发额度', JSON.stringify(after2.json?.credits) === JSON.stringify(after.json?.credits))

log(failed ? '\n❌ 有检查项没过' : '\n✅ 全部通过')
process.exit(failed ? 1 : 0)
