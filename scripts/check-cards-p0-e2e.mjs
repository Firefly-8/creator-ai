/**
 * P0 贺卡核心流程 · 运行时端到端（mock，不打真实付费 AI）
 *
 * 覆盖：
 *   1. 入口弹窗可匿名打开并填表
 *   2. 点生成 → mock 401 → Auth 弹窗 + note；关 Auth 后表单仍开、字段仍在
 *   3. localStorage 草稿写入；刷新后名字恢复
 *   4. ?from= 优先：有 from 时不覆盖成草稿场景（用 uiPreview 代替真实旧卡）
 *   5. uiPreview=composer：Keep/Take、权限条、免费下载文案、Finish 存在
 *   6. 桌面 + 390px 移动视口无横向撑破
 *   7. mock generate 成功路径：候选保留 / Try again 文案（不调 MiniMax）
 *
 * 用法：node scripts/check-cards-p0-e2e.mjs [baseUrl] [outDir]
 */
import { chromium } from 'playwright-core'
import path from 'node:path'
import os from 'node:os'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

const EXE_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  path.join(os.homedir(), '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome'),
  path.join(os.homedir(), '.cache/ms-playwright/chromium-1243/chrome-linux/chrome'),
  '/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome',
  '/usr/local/bin/google-chrome',
].filter(Boolean)
const EXE = EXE_CANDIDATES.find(p => existsSync(p))
if (!EXE) { console.error('找不到 chromium'); process.exit(1) }

const BASE = process.argv[2] || 'http://127.0.0.1:5175'
const OUT = process.argv[3] || '/opt/cursor/artifacts/cards-p0-e2e'
mkdirSync(OUT, { recursive: true })

const ok = []
const fail = []
function check(name, cond, extra = '') {
  ;(cond ? ok : fail).push(name + (extra ? ` (${extra})` : ''))
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`)
}

const browser = await chromium.launch({
  executablePath: EXE,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
})

async function dismissCookie(page) {
  const btn = page.locator('.ck-cookie__btn--primary')
  if (await btn.count() && await btn.first().isVisible().catch(() => false)) {
    await btn.first().click().catch(() => {})
    await page.waitForTimeout(250)
  }
}

async function openForm(page) {
  await page.locator('.ck-hero__cta').first().click()
  await page.waitForSelector('.ck-formmodal__panel', { timeout: 20000 })
}

/** mock 生成：401 或假成功图（公开 showcase，非付费调用） */
async function installApiMocks(page, mode = '401') {
  await page.route('**/api/image/generate', async (route) => {
    if (mode === '401') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 401, statusMessage: 'Not signed in' }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        images: [{
          id: 'mock-cand-1',
          imageUrl: 'https://assets.yozzytools.com/showcase/hero-birthday.webp',
        }],
      }),
    })
  })
  // 用量/上传等：避免真请求
  await page.route('**/api/user/usage', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 401 }),
    })
  })
  await page.route('**/api/image/upload', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 401 }),
    })
  })
}

// ── 1) 桌面：匿名填表 → mock 401 → 保稿 ─────────────────
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
  })
  const page = await ctx.newPage()
  const pageErrors = []
  page.on('pageerror', e => pageErrors.push(String(e)))
  await installApiMocks(page, '401')
  await page.goto(`${BASE}/cards?format=card`, { waitUntil: 'networkidle', timeout: 90000 })
  await dismissCookie(page)
  await openForm(page)

  await page.fill('#ck-name', 'E2E Margaret')
  await page.fill('#ck-extra', 'the garden joke')
  check('表单可匿名填写名字', (await page.inputValue('#ck-name')) === 'E2E Margaret')

  await page.locator('.ck-formmodal__make').click()
  await page.waitForSelector('.ck-auth', { timeout: 15000 })
  check('点生成 mock 401 弹出 Auth', await page.locator('.ck-auth').isVisible())
  const note = ((await page.locator('.ck-auth__note').textContent().catch(() => '')) || '').trim()
  check('Auth 带保稿说明 note', /kept|entered/i.test(note), note.slice(0, 80))
  check('表单在 Auth 下方仍打开', await page.locator('.ck-formmodal__panel').isVisible())

  await page.locator('.ck-auth__close').click()
  await page.waitForTimeout(400)
  check('关 Auth 后表单仍开', await page.locator('.ck-formmodal__panel').isVisible())
  check('关 Auth 后名字仍在', (await page.inputValue('#ck-name')) === 'E2E Margaret')

  // 草稿应已写入
  const draftRaw = await page.evaluate(() => localStorage.getItem('craftai_card_draft_v1'))
  let draftOk = false
  try {
    const d = JSON.parse(draftRaw || '{}')
    draftOk = d.name === 'E2E Margaret' && d.format === 'card'
  } catch { /* */ }
  check('localStorage 草稿含名字+format', draftOk)

  await page.screenshot({ path: path.join(OUT, '01-auth-gate-desktop.png'), fullPage: true })
  check('无致命 pageerror (getActiveHead 等)', !pageErrors.some(e => /getActiveHead|is not a function/i.test(e)), pageErrors.slice(0, 2).join(' | '))
  await ctx.close()
}

// ── 2) 刷新恢复草稿 ─────────────────────────────────────
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
  })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    localStorage.setItem('craftai_card_draft_v1', JSON.stringify({
      format: 'card',
      scenario: 'birthday',
      style: 'watercolor',
      name: 'Restored Ada',
      message: '',
      extra: 'from draft',
      count: 1,
      step: 1,
      thumb: '',
      at: Date.now(),
    }))
  })
  await page.goto(`${BASE}/cards?format=invite`, { waitUntil: 'networkidle', timeout: 90000 })
  await dismissCookie(page)
  await openForm(page)
  // 草稿 format=card 应覆盖 URL invite
  await page.waitForTimeout(600)
  check('刷新恢复草稿名字', (await page.inputValue('#ck-name')) === 'Restored Ada')
  const eyebrow = ((await page.locator('.ck-formmodal__eyebrow').textContent()) || '')
  check('草稿 format 覆盖 URL invite → card 文案', /Card/i.test(eyebrow), eyebrow.trim())
  await page.screenshot({ path: path.join(OUT, '02-draft-restore.png'), fullPage: true })
  await ctx.close()
}

// ── 3) ?from= 优先于草稿（用 uiPreview 模拟已有结果；from 走加载失败仍不吞草稿抢占逻辑靠源码守卫，这里验 from 时不 restore 错格式）──
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
  })
  const page = await ctx.newPage()
  // from= 会调 /api/images → mock 空，避免真登录
  await page.route('**/api/images**', async (route) => {
    if (route.request().method() === 'GET' && !route.request().url().includes('/share')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          images: [{
            id: 'from-fixture-1',
            imageUrl: 'https://assets.yozzytools.com/showcase/hero-birthday.webp',
            format: 'invite',
            card: {
              name: 'From Card',
              message: 'See you Saturday',
              style: 'watercolor',
              layout: 'classic',
              texts: [
                { id: 'name', kind: 'name', text: 'From Card', x: 0.5, y: 0.79, size: 0.075, color: '#c8543d', align: 'center', font: 'display', rotate: 0 },
                { id: 'message', kind: 'message', text: 'See you Saturday', x: 0.5, y: 0.868, size: 0.028, color: '#3a2f28', align: 'center', font: 'body', rotate: 0 },
              ],
            },
          }],
        }),
      })
      return
    }
    await route.continue()
  })
  await page.addInitScript(() => {
    localStorage.setItem('craftai_card_draft_v1', JSON.stringify({
      format: 'card',
      scenario: 'birthday',
      style: 'watercolor',
      name: 'Should Not Win',
      message: '',
      extra: '',
      count: 1,
      step: 1,
      thumb: '',
      at: Date.now(),
    }))
  })
  await page.goto(`${BASE}/cards?from=from-fixture-1&format=card`, { waitUntil: 'networkidle', timeout: 90000 })
  await dismissCookie(page)
  await page.waitForSelector('.ck-comp', { timeout: 20000 })
  const nameField = page.locator('.ck-field input').first()
  await page.waitForTimeout(800)
  const nameVal = ((await nameField.inputValue().catch(() => '')) || '')
  check('?from= 重开名字来自旧卡而非草稿', nameVal.includes('From Card'), nameVal)
  const badge = ((await page.locator('.ck-format-hint__badge').textContent().catch(() => '')) || '')
  check('?from= format 用旧卡 invite', /SINGLE/i.test(badge), badge.trim())
  await page.screenshot({ path: path.join(OUT, '03-from-priority.png'), fullPage: true })
  await ctx.close()
}

// ── 4) Composer Keep/Take + 移动视口 ─────────────────────
for (const [label, viewport, shot] of [
  ['desktop', { width: 1280, height: 900 }, '04-composer-desktop.png'],
  ['mobile', { width: 390, height: 844 }, '05-composer-mobile.png'],
]) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, ignoreHTTPSErrors: true })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/cards?format=card&uiPreview=composer`, { waitUntil: 'networkidle', timeout: 90000 })
  await dismissCookie(page)
  await page.waitForSelector('[data-sec="keep"]', { timeout: 20000 })
  await page.waitForSelector('[data-sec="take"]', { timeout: 10000 })
  check(`${label}: Keep 区存在`, await page.locator('[data-sec="keep"]').isVisible())
  check(`${label}: Take 区存在`, await page.locator('[data-sec="take"]').count() === 1)
  check(`${label}: 权限条存在`, await page.locator('[data-act="export-permission"]').count() === 1)
  const dl = ((await page.locator('[data-act="download"]').textContent()) || '').replace(/\s+/g, ' ')
  check(`${label}: 下载标明 with mark`, /with mark/i.test(dl), dl.trim())
  check(`${label}: Finish 在 Keep`, await page.locator('[data-sec="keep"] [data-act="finish"]').count() === 1)
  check(`${label}: Take 无 Finish`, await page.locator('[data-sec="take"] [data-act="finish"]').count() === 0)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)
  check(`${label}: 无横向溢出`, !overflow)
  await page.locator('[data-sec="take"]').scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT, shot), fullPage: true })
  await ctx.close()
}

// ── 5) mock 生成成功：候选 + Try again 文案（仍不调真实 AI）──
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
  })
  const page = await ctx.newPage()
  // 先装 401 以外的 mocks，再对 generate 返回成功 —— 但未登录客户端会弹 Auth。
  // 因此直接走 uiPreview 后点 Try again 并 mock generate：
  await page.route('**/api/user/usage', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        image: { limit: 3, used: 0, remaining: 3, unlimited: false, mode: 'daily' },
        paid: false,
      }),
    })
  })
  let genHits = 0
  await page.route('**/api/image/generate', async (route) => {
    genHits++
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        images: [{
          id: `mock-cand-${genHits}`,
          imageUrl: 'https://assets.yozzytools.com/showcase/hero-birthday.webp',
        }],
      }),
    })
  })
  await page.goto(`${BASE}/cards?format=card&uiPreview=composer`, { waitUntil: 'networkidle', timeout: 90000 })
  await dismissCookie(page)
  await page.waitForSelector('.ck-regen', { timeout: 15000 })
  const cost = ((await page.locator('.ck-nav__cost').textContent().catch(() => '')) || '')
  check('Try again 标消耗（usage 已加载）', /uses 1 of your free goes/i.test(cost), cost.trim())
  await page.locator('.ck-regen button').first().click()
  await page.waitForTimeout(1200)
  const candCount = await page.locator('.ck-cand').count()
  check('Try again mock 后候选 ≥ 1（保留逻辑可跑）', candCount >= 1, `n=${candCount}`)
  check('mock generate 被调用且非真实上游', genHits >= 1, `hits=${genHits}`)
  await page.screenshot({ path: path.join(OUT, '06-try-again-mock.png'), fullPage: true })
  await ctx.close()
}

await browser.close()

const summary = { ok: ok.length, fail: fail.length, fails: fail, base: BASE, out: OUT }
writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
console.log(`\n通过 ${ok.length} / 失败 ${fail.length}`)
if (fail.length) {
  console.log(fail.map(f => `  - ${f}`).join('\n'))
  process.exitCode = 1
}
