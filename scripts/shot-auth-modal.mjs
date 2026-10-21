#!/usr/bin/env node
/**
 * 给登录弹窗截图（视觉验收用）
 *
 * 弹窗默认不显示，所以这里直接：
 *   1. 打开 staging 首页
 *   2. 在页面里注入一段脚本，把 AuthModal 的可见状态打开
 *      —— 但 AuthModal 的 isOpen 来自 useAuthModal 的模块级 ref，
 *         外部改不了。所以改成走真实入口：点导航的「Start free」按钮
 *   3. 截图
 */
import { chromium } from 'playwright-core'
import path from 'node:path'
import os from 'node:os'

const EXE = path.join(
  os.homedir(),
  '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
)
const BASE = process.argv[2] || 'https://staging.creator.yozzytools.com'
const OUT = process.argv[3] || '/workspace/output/auth-modal'

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
  // 页面有长轮询/ beacon，networkidle 永远等不到
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
  // ⚠️ 移动端「Start free」初始是隐藏的（在折叠菜单里），
  //    所以等汉堡按钮（.mk-burger）而不是等 Start free。
  //    ⚠️ 别用逗号选择器 '.a, .b' —— Playwright 会取第一个匹配并等它可见，
  //    而 .mk-top__actions 在移动端是 display:none，会永远等不到。
  await page.waitForSelector('.mk-burger', { state: 'attached', timeout: 30000 })
  await page.waitForTimeout(2500)

  // 移动端：先展开汉堡菜单，否则「Start free」是隐藏的
  const burger = page.locator('.mk-burger')
  if (await burger.isVisible().catch(() => false)) {
    await burger.click()
    await page.waitForTimeout(500)
  }

  // 点「Start free」打开注册弹窗
  // ⚠️ 别用 page.locator('button:visible', { hasText }) —— Playwright 的
  //    :visible 扩展伪类跟 hasText 过滤组合时匹配不到，改用作用域定位器
  const scoped = page.locator('.mk-mobile button', { hasText: 'Start free' })
  if (await scoped.count()) {
    await scoped.first().click()
  } else {
    await page.getByRole('button', { name: 'Start free' }).first().click()
  }
  await page.waitForSelector('.ck-auth', { timeout: 15000 })
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}-${suffix}.png` })
  console.log(`v ${OUT}-${suffix}.png`)

  // 切到 Sign in 再拍一张
  // ⚠️ 顶部那排标签页已移除，现在唯一的切换入口是底部的链接
  const tab = page.locator('.ck-auth__switch-btn')
  if (await tab.count()) {
    await tab.first().click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${OUT}-${suffix}-login.png` })
    console.log(`v ${OUT}-${suffix}-login.png`)
  }
  await ctx.close()
}

await shot({ width: 1280, height: 900 }, 'desktop')
await shot({ width: 390, height: 844 }, 'mobile')

await browser.close()
