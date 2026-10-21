/**
 * 图标名有效性守卫
 *
 * ⚠️ 背景（2026-10-21）：
 *   两个不同的坑，都会让图标**静默消失**：
 *
 *   ① 动态拼接的图标名 UnoCSS 扫不到
 *      `<span :class="`i-${a.icon}`" />` → 必须进 safelist
 *      → 由 tests/icon-safelist.test.ts 守
 *
 *   ② 图标名在 iconify 集合里**根本不存在**
 *      Phosphor 里没有 `ph-rings` / `ph-candle` / `ph-fireworks` / `ph-mug-hot`
 *      —— 写上去编译也不报错，只是**什么都不显示**。
 *      → 由这个测试守
 *
 * 两个一起才能保证「图标真的看得见」。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const require = createRequire(import.meta.url)
const phIcons = require('@iconify-json/ph/icons.json')

const SKIP = new Set(['node_modules', 'dist', '.nuxt', '.output', '.git', '.wrangler', 'coverage', '.assets'])

function walk(p: string, out: string[] = []): string[] {
  let st
  try {
    st = statSync(p)
  } catch {
    return out
  }
  if (st.isFile()) {
    if (/\.(vue|ts|js|mjs)$/.test(p)) out.push(p)
    return out
  }
  for (const name of readdirSync(p)) {
    if (SKIP.has(name)) continue
    walk(join(p, name), out)
  }
  return out
}

const SCAN_DIRS = ['pages', 'components', 'layouts', 'utils', 'composables']
const ICON_RE = /\b(i-)?(ph-[a-z0-9]+(?:-[a-z0-9]+)*)\b/g

describe('图标名有效性', () => {
  it('iconify 集合能读到', () => {
    expect(Object.keys(phIcons.icons).length).toBeGreaterThan(100)
  })

  it('源码里用到的每个 ph-* 图标都必须真实存在于 Phosphor 集合里', () => {
    const used = new Map<string, string[]>() // icon → 使用它的文件

    for (const d of SCAN_DIRS) {
      for (const f of walk(join(ROOT, d))) {
        const src = readFileSync(f, 'utf8')
        let m: RegExpExecArray | null
        ICON_RE.lastIndex = 0
        while ((m = ICON_RE.exec(src))) {
          const name = m[2]
          if (!used.has(name)) used.set(name, [])
          used.get(name)!.push(relative(ROOT, f))
        }
      }
    }

    const missing = [...used.entries()]
      // ⚠️ Phosphor 集合里的 key **不带** `ph-` 前缀
      .filter(([name]) => !phIcons.icons[name.replace(/^ph-/, '')])
      .map(([name, files]) => `  ph-${name.replace('ph-', '')}（${[...new Set(files)].join(', ')}）`)

    expect(
      missing,
      `这些图标在 Phosphor 集合里不存在，编译不报错但**什么都不显示**：\n${missing.join('\n')}`,
    ).toEqual([])
  })

  it('HomeAudience 的 8 个动态图标都真实存在（首页受众入口）', () => {
    const src = readFileSync(join(ROOT, 'components/home/HomeAudience.vue'), 'utf8')
    const icons = [...src.matchAll(/icon:\s*'(ph-[a-z0-9-]+)'/g)].map(m => m[1])
    expect(icons.length).toBe(8)
    for (const i of icons) {
      expect(
        phIcons.icons[i.replace(/^ph-/, '')],
        `HomeAudience 用了不存在的图标 ${i}`,
      ).toBeTruthy()
    }
  })
})
