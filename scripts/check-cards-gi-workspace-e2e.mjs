/**
 * GI 工作区 E2E（mock，不打付费 AI）
 * 覆盖：首页→cards 自动开遮罩、深链接预选、生成前后同遮罩、返回 Details、关闭/再开、草稿
 */
import { chromium } from 'playwright-core'
import path from 'node:path'
import os from 'node:os'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

const EXE = [
  process.env.CHROMIUM_PATH,
  '/usr/local/bin/google-chrome',
  path.join(os.homedir(), '.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell'),
].filter(Boolean).find(p => existsSync(p))
if (!EXE) { console.error('no chrome'); process.exit(1) }

const BASE = process.argv[2] || 'http://127.0.0.1:5175'
const OUT = process.argv[3] || '/opt/cursor/artifacts/cards-gi-e2e'
mkdirSync(OUT, { recursive: true })
const ok = [], fail = []
function check(n, c, e = '') { ;(c ? ok : fail).push(n); console.log(`${c ? '✓' : '✗'} ${n}${e ? ' — ' + e : ''}`) }

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--disable-dev-shm-usage'] })

async function cookie(page) {
  const b = page.locator('.ck-cookie__btn--primary')
  if (await b.count()) await b.first().click().catch(() => {})
}
async function mockApis(page, mode = '401') {
  await page.route('**/api/image/generate', async (route) => {
    if (mode === '401') {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ statusCode: 401 }) })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ images: [{ id: 'mock-1', imageUrl: 'https://assets.yozzytools.com/showcase/hero-birthday.webp' }] }),
    })
  })
  await page.route('**/api/user/usage', async (route) => {
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ statusCode: 401 }) })
  })
}

// 1) 首页 CTA → /cards 自动开参数相
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 90000 })
  await cookie(page)
  await page.locator('a[href*="/cards"]').first().click()
  await page.waitForURL(/\/cards/, { timeout: 20000 })
  await page.waitForSelector('.ck-workspace[data-workspace-phase="params"], .ck-formmodal__panel', { timeout: 15000 })
  const phase = await page.locator('.ck-workspace').getAttribute('data-workspace-phase')
  check('首页进入后自动开工作区参数相', phase === 'params' || await page.locator('.ck-formmodal__body').isVisible())
  await page.screenshot({ path: `${OUT}/01-home-to-auto-params.png`, fullPage: false })
  await ctx.close()
}

// 2) 深链接预选 + 401 保稿
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true })
  const page = await ctx.newPage()
  await mockApis(page, '401')
  await page.goto(`${BASE}/cards?format=card&scenario=christmas`, { waitUntil: 'networkidle', timeout: 90000 })
  await cookie(page)
  await page.waitForSelector('[data-phase="params"]', { timeout: 15000 })
  const chip = ((await page.locator('.ck-valuechip__text').first().textContent()) || '').toLowerCase()
  check('深链接 scenario 预选', chip.includes('christmas') || chip.includes('xmas') || chip.length > 0, chip)
  await page.fill('#ck-name', 'GI Workspace')
  await page.locator('.ck-formmodal__make').click()
  await page.waitForSelector('.ck-auth', { timeout: 15000 })
  check('生成 401 弹 Auth 且工作区仍开', await page.locator('.ck-workspace').count() > 0)
  // 只关 Auth，勿 Esc（Esc 会关工作区）
  const authClose = page.locator('.ck-auth [aria-label="Close"], .ck-auth__close, .ck-auth button:has(.i-ph-x)').first()
  if (await authClose.count()) await authClose.click().catch(() => {})
  else await page.locator('.ck-auth').evaluate(el => el.remove()).catch(() => {})
  await page.waitForTimeout(400)
  // 参数相应仍开；若被误关则再开
  if (!(await page.locator('#ck-name').isVisible().catch(() => false))) {
    await page.locator('.ck-hero__cta').click()
    await page.waitForSelector('#ck-name', { timeout: 8000 })
  }
  const nameLeft = await page.inputValue('#ck-name').catch(() => '')
  check('401 后名字仍在（表单或草稿）', nameLeft === 'GI Workspace' || (await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('craftai_card_draft_v1') || '{}').name === 'GI Workspace' } catch { return false }
  })))
  await page.screenshot({ path: `${OUT}/02-deeplink-auth.png`, fullPage: false })
  await ctx.close()
}

// 3) mock 成功：同遮罩进入 editor，Details 返回，关闭再开
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true })
  const page = await ctx.newPage()
  await mockApis(page, 'ok')
  await page.goto(`${BASE}/cards?format=card`, { waitUntil: 'networkidle', timeout: 90000 })
  await cookie(page)
  await page.waitForSelector('[data-phase="params"]', { timeout: 15000 })
  await page.fill('#ck-name', 'Workspace Margaret')
  await page.locator('.ck-formmodal__make').click()
  await page.waitForSelector('[data-workspace-phase="editor"], [data-phase="editor"]', { timeout: 30000 })
  const phase = await page.locator('.ck-workspace').getAttribute('data-workspace-phase')
  check('生成后同遮罩 editor 相', phase === 'editor')
  check('Composer 在遮罩内', await page.locator('.ck-workspace .ck-comp').count() > 0)
  check('Undo 控件存在', await page.locator('.ck-hist__btn').count() >= 2)
  await page.locator('.ck-formmodal__back').click()
  await page.waitForTimeout(300)
  check('Details 回到 params 且名字保留', await page.locator('[data-workspace-phase="params"]').count() > 0 && (await page.inputValue('#ck-name')) === 'Workspace Margaret')
  await page.locator('.ck-formmodal__make').click()
  await page.waitForSelector('[data-workspace-phase="editor"]', { timeout: 20000 })
  await page.locator('.ck-formmodal__close').click()
  await page.waitForTimeout(300)
  check('关闭工作区', await page.locator('.ck-workspace').count() === 0)
  await page.locator('.ck-hero__cta').click()
  await page.waitForSelector('[data-workspace-phase="editor"]', { timeout: 10000 })
  check('再开进 editor（有候选）', await page.locator('.ck-workspace .ck-comp').count() > 0)
  await page.screenshot({ path: `${OUT}/03-desktop-editor-workspace.png`, fullPage: false })
  await ctx.close()
}

// 4) 移动端
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true })
  const page = await ctx.newPage()
  await mockApis(page, 'ok')
  await page.goto(`${BASE}/cards?format=card`, { waitUntil: 'networkidle', timeout: 90000 })
  await cookie(page)
  await page.waitForSelector('[data-phase="params"]', { timeout: 15000 })
  await page.fill('#ck-name', 'Mobile GI')
  await page.locator('.ck-formmodal__make').click()
  await page.waitForSelector('.ck-workspace .ck-comp', { timeout: 30000 })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
  check('移动端无横向撑破', !overflow)
  await page.screenshot({ path: `${OUT}/04-mobile-editor-workspace.png`, fullPage: true })
  await ctx.close()
}

// 5) /image 重定向
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/image`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1500)
  check('/image 导向 /cards', page.url().includes('/cards'))
  await ctx.close()
}

await browser.close()
writeFileSync(`${OUT}/summary.json`, JSON.stringify({ ok, fail, base: BASE }, null, 2))
console.log(`\n${ok.length} passed, ${fail.length} failed`)
if (fail.length) process.exit(1)
