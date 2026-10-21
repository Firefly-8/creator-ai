/**
 * 组件里禁止用 useI18n()
 *
 * ⚠️ 为什么（2026-10-20 的真实事故，绕了整整一轮）：
 *   Nuxt 的 auto-import 把 `useI18n` 解析到了 **vue-i18n 的原始实现**
 *   （.nuxt/imports.d.ts: `export { useI18n } from 'vue-i18n/dist/vue-i18n'`），
 *   而不是 @nuxtjs/i18n 的 runtime 包装版。
 *   原始版在客户端、在**自动导入的组件**里拿不到 provide 下来的 i18n
 *   instance，返回的对象不对 → 模板里一调 t(...) 就抛
 *   "n.t is not a function" → 整个页面 500。
 *
 *   隐蔽之处：
 *   - SSR 完全正常，只在 hydration 后炸
 *   - error.vue 的 h1 硬编码 "404"，看起来像路由 404，实际 statusCode 是 500
 *   - 页面组件自己调 useI18n() 往往没事，**自动导入的 UI 组件**才会炸
 *   - 一次炸一个，只要 default 布局里有一个这样的组件，9 个页面全挂
 *
 * ✅ 正确做法：组件里统一用 `useT()`（内部走 useNuxtApp().$i18n.t）
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const SKIP = ['node_modules', 'dist', '.nuxt', '.output', '.git', 'coverage']

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.includes(name)) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (name.endsWith('.vue')) out.push(full)
  }
  return out
}

const components = [
  ...walk(join(ROOT, 'components')).map(f => relative(ROOT, f)),
  // ⚠️ pages/ 也要扫 —— 2026-10-21 在 pages/dashboard/index.vue 里
  // 又发现一处 useI18n()（之前的守卫只扫 components/，漏了它）
  ...walk(join(ROOT, 'pages')).map(f => relative(ROOT, f)),
]

describe('组件里禁止 useI18n()', () => {
  it('能扫到组件文件（避免路径写错导致假绿）', () => {
    expect(components.length).toBeGreaterThan(10)
  })

  it.each(components)('%s 不得调用 useI18n()', (file) => {
    const t = readFileSync(join(ROOT, file), 'utf8')
    // 去掉注释行再查，避免把「说明为什么不能用」的注释也算上
    const code = t
      .split('\n')
      .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n')
    const hits = code.match(/useI18n\s*\(/g)
    expect(hits, `${file} 里出现了 useI18n()，请改用 useT() / useNuxtApp().$i18n`).toBeNull()
  })

  it('composables/useT.ts 存在且走 $i18n（而不是 useI18n）', () => {
    const raw = readFileSync(join(ROOT, 'composables/useT.ts'), 'utf8')
    // 去注释再查（说明文字里会提到 useI18n，那是文档不是调用）
    const code = raw
      .split('\n')
      .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n')
    expect(code).toContain('$i18n')
    expect(code).not.toMatch(/useI18n\s*\(/)
  })
})
