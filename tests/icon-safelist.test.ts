/**
 * 图标 safelist 守卫
 *
 * ⚠️ 背景（2026-10-21）：
 *   UnoCSS 的 presetIcons 只扫描源码里的**字面量**类名。动态拼接的图标名扫不到：
 *     <span :class="`i-${a.icon}`" />
 *   结果首页 8 个受众入口的图标一个都不显示（i-ph-armchair / i-ph-crown / …）。
 *
 *   之前靠 uno.config.ts 里手写的 safelist 兜底 —— 必然漏（手写 40 个，实际用 90+）。
 *   现在 safelist 由 `node scripts/gen-icon-safelist.mjs` 全量生成。
 *
 * 这个测试保证：**源码里出现过的每个 ph-* 图标，都在 safelist 里**。
 * 以后加了新图标忘了重跑生成脚本，测试立刻报红。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const SKIP = new Set(['node_modules', 'dist', '.nuxt', '.output', '.git', '.wrangler', 'coverage', '.assets'])

function walk(p: string, out: string[] = []): string[] {
  let st
  try {
    st = statSync(p)
  } catch {
    return out
  }
  if (st.isFile()) {
    if (/\.(vue|ts|js|mjs|tsx|jsx)$/.test(p)) out.push(p)
    return out
  }
  for (const name of readdirSync(p)) {
    if (SKIP.has(name)) continue
    walk(join(p, name), out)
  }
  return out
}

const SCAN_DIRS = ['pages', 'components', 'layouts', 'composables', 'utils', 'app.vue']

const ICON_RE = /\b(i-)?(ph-[a-z0-9]+(?:-[a-z0-9]+)*)\b/g

describe('图标 safelist', () => {
  const safelistData = JSON.parse(readFileSync(join(ROOT, 'utils/icon-safelist.json'), 'utf8'))

  it('safelist 文件存在且有内容', () => {
    expect(Array.isArray(safelistData.safelist)).toBe(true)
    expect(safelistData.safelist.length).toBeGreaterThan(40)
  })

  it('源码里用到的每个 ph-* 图标都在 safelist 里', () => {
    const safelist = new Set<string>(safelistData.safelist)
    const used = new Set<string>()

    for (const d of SCAN_DIRS) {
      for (const f of walk(join(ROOT, d))) {
        const src = readFileSync(f, 'utf8')
        let m: RegExpExecArray | null
        while ((m = ICON_RE.exec(src))) used.add(m[2])
      }
    }

    // 至少要扫到一些，且包括首页那几个动态拼接的
    expect(used.size).toBeGreaterThan(40)
    expect(used.has('ph-armchair')).toBe(true)

    const missing = [...used].filter(i => !safelist.has(`i-${i}`))
    expect(
      missing,
      `这些图标在源码里用到但不在 safelist 里（跑 node scripts/gen-icon-safelist.mjs）：\n  ${missing.join('\n  ')}`,
    ).toEqual([])
  })

  it('uno.config.ts 读的是自动生成的 safelist，不是手写清单', () => {
    const src = readFileSync(join(ROOT, 'uno.config.ts'), 'utf8')
    expect(src).toContain("from './utils/icon-safelist.json'")
    expect(src).toContain('safelist: ICON_SAFELIST')
    // 不能再有手写的大段图标清单
    const handWritten = src.match(/'i-ph-[a-z0-9-]+'/g)
    expect(handWritten, 'uno.config.ts 里还有手写的图标清单，应该交给生成脚本').toBeNull()
  })
})
