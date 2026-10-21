/**
 * 图标容器背景覆盖守卫
 *
 * ⚠️ 背景（2026-10-21）：
 *   UnoCSS 的 presetIcons 是这样画图标的：
 *     .i-ph-armchair { background-color: currentcolor; mask-image: url(<svg>) }
 *   —— 图标的**填充色来自 background-color**，形状来自 mask。
 *
 *   如果同一个元素还有自己的 `background`（比如白色圆圈底、浅色方块底），
 *   scoped 样式的 `background:` 简写优先级是 (0,2,0) > UnoCSS 的 (0,1,0)
 *   → 一定赢 → background-color 被覆盖 → **图标被涂成和背景同色 = 隐形**。
 *   而且它不报任何错，只是"看不见"。
 *
 *   正确做法：带背景的容器 + **内层元素**放 i-ph- 类。
 *     <span class="ck-audience__icon"><span class="i-ph-armchair" /></span>
 *
 * 这个测试扫所有 .vue：找「同一个元素上既有 i-ph-* 类、又命中带 background 的样式类」。
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
    if (p.endsWith('.vue')) out.push(p)
    return out
  }
  for (const name of readdirSync(p)) {
    if (SKIP.has(name)) continue
    walk(join(p, name), out)
  }
  return out
}

const files = [
  ...walk(join(ROOT, 'pages')),
  ...walk(join(ROOT, 'components')),
  ...walk(join(ROOT, 'layouts')),
].map(f => relative(ROOT, f))

describe('图标容器背景覆盖守卫', () => {
  it('能扫到 vue 文件', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it.each(files)('%s 里带 i-ph- 类和背景的元素不能是同一个节点', (file) => {
    const src = readFileSync(join(ROOT, file), 'utf8')

    // 收集所有「设了 background 的 class」
    const bgClasses = new Set<string>()
    for (const m of src.matchAll(/\.([a-zA-Z][\w-]*)\s*\{([^}]*)\}/g)) {
      if (/(^|[\s;])background\s*:/.test(m[2])) bgClasses.add(m[1])
    }

    // 找所有静态带 i-ph- 类的元素
    const problems: string[] = []
    for (const m of src.matchAll(/<(\w+)([^>]*\bclass="([^"]*)"[^>]*)>/g)) {
      const cls = m[3]
      if (!/\bi-ph-/.test(cls)) continue
      const others = cls.split(/\s+/).filter(c => c && !c.startsWith('i-ph-'))
      const hit = others.filter(c => bgClasses.has(c))
      if (hit.length) {
        problems.push(`<${m[1]} class="${cls.trim()}"> 同时命中了带背景的 .${hit.join(' .')} —— 图标会被涂成背景色（隐形）`)
      }
    }

    expect(problems, `${file} 有图标被背景盖住：\n  - ${problems.join('\n  - ')}`).toEqual([])
  })

  it('HomeAudience 的图标在独立内层元素上', () => {
    const src = readFileSync(join(ROOT, 'components/home/HomeAudience.vue'), 'utf8')
    // 容器（带背景）不能同时带 i-ph- 类
    expect(src).toMatch(
      /<span class="ck-audience__icon">\s*<span class="ck-audience__glyph"[^>]*\/>/,
    )
    // 内层元素带 i-ph- 类
    expect(src).toMatch(/ck-audience__glyph"[^:]*:class="`i-\$\{a\.icon\}`"/)
  })
})
