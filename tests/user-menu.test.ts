/**
 * 账号菜单（UserMenu）守卫
 *
 * ⚠️ 背景（2026-10-21）：
 *   登录后顶栏是「My cards」+「Log out」两个按钮并排 ——
 *   占地方，而且看不出是谁登的。
 *   移动端更糟：汉堡菜单里**根本没有登出**，移动端登不出去。
 *   现在统一成「头像 + 名字」的账号菜单，点开有 Sign out。
 *
 * 这个测试锁住：
 *   1. 两个布局都用 UserMenu，不再自己画顶栏按钮
 *   2. 移动端汉堡菜单里也有账号菜单（不然登不出去）
 *   3. 菜单里有 Sign out，且真的调 logout()
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8')

const um = read('components/ui/UserMenu.vue')
const marketing = read('layouts/marketing.vue')
const studio = read('layouts/default.vue')

describe('账号菜单', () => {
  it('组件存在，显示名字 + 头像 + 下拉菜单', () => {
    expect(um).toContain('um__name')
    expect(um).toContain('um__avatar')
    expect(um).toContain('um__panel')
    expect(um).toContain('aria-expanded')
  })

  it('名字取 displayName，没有就用邮箱 @ 前那段', () => {
    expect(um).toContain('displayName')
    expect(um).toMatch(/split\('@'\)\[0\]/)
  })

  it('菜单里有 Sign out，且真的调 logout()', () => {
    expect(um).toContain('Sign out')
    expect(um).toContain('i-ph-sign-out')
    expect(um).toMatch(/await logout\(\)/)
    expect(um).toContain("navigateTo('/')")
  })

  it('两个布局都用 UserMenu，不再自己画顶栏按钮', () => {
    expect(marketing).toContain('<UserMenu')
    expect(studio).toContain('<UserMenu')
    expect(marketing).not.toContain('>Log out<')
    expect(studio).not.toContain('>Sign out<')
  })

  it('移动端汉堡菜单里也有账号菜单（不然移动端登不出去）', () => {
    // 营销页的 .mk-mobile 里必须有一个 UserMenu
    const mobileBlock = marketing.slice(marketing.indexOf('class="mk-mobile"'))
    expect(mobileBlock).toContain('<UserMenu')
  })

  it('工作台侧栏用深色版', () => {
    expect(studio).toContain('tone="dark"')
  })
})
