/**
 * .vue 文件结构自检
 *
 * ⚠️ 为什么需要这个（2026-10-20 的真实事故）：
 *   用脚本批量改样式块时，把文件里唯一的 `</style>` 替换掉了，
 *   导致原有 style 块没闭合 → 后面的 <script setup> 全被当成 CSS →
 *   组件的脚本根本不执行 → 客户端渲染直接 500。
 *   而且 error.vue 的 h1 是硬编码的 "404"，看起来像路由 404，
 *   实际 statusCode 是 500，排查起来绕了很大一圈。
 *
 *   这类错误 build 阶段不一定会报（CSS 语法碰巧合法时能过），
 *   但运行时必炸，所以放在测试里守住。
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
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (name.endsWith('.vue')) out.push(full)
  }
  return out
}

const vueFiles = walk(ROOT).map(f => relative(ROOT, f))

describe('.vue 文件结构', () => {
  it('能扫到 .vue 文件（避免路径写错导致测试假绿）', () => {
    expect(vueFiles.length).toBeGreaterThan(20)
  })

  it.each(vueFiles)('%s 的开闭标签必须配对', (file) => {
    const t = readFileSync(join(ROOT, file), 'utf8')
    const count = (re: RegExp) => (t.match(re) || []).length

    // <style> / </style>
    expect(count(/<style[\s>]/g), 'style 开标签数').toBe(count(/<\/style>/g))
    // <script> / </script>
    expect(count(/<script[\s>]/g), 'script 开标签数').toBe(count(/<\/script>/g))
    // <template> / </template>
    expect(count(/<template[\s>]/g), 'template 开标签数').toBe(count(/<\/template>/g))
  })

  it.each(vueFiles)('%s 的 script 必须闭合在 style 之前', (file) => {
    const t = readFileSync(join(ROOT, file), 'utf8')
    const scriptEnd = t.lastIndexOf('</script>')
    const styleStart = t.search(/<style[\s>]/)
    if (styleStart === -1) return
    // 正常结构是 <script>...</script> 然后 <style>...</style>
    expect(scriptEnd, 'script 块必须在 style 块之前结束').toBeLessThan(styleStart)
  })
})
