/**
 * useHead 的 computed 依赖顺序检查（防 TDZ）
 *
 * ⚠️ 为什么需要这个测试（2026-10-20 真实事故）：
 *   `useHead({ title: pageTitle })` 里的 computed 会在 setup 阶段被
 *   **同步求值**（unhead 要在 SSR 时拿到最终值）。如果它的 getter 用到的
 *   变量定义在它之后，就是 TDZ：
 *
 *     const pageTitle = computed(() => song.value ? song.value.title : '')
 *     useHead({ title: pageTitle })           // ← 这里同步求值
 *     const song = computed(() => data.value?.song)   // ← 还没定义
 *
 *   客户端直接抛 `Cannot access 's' before initialization` → 整页 500。
 *   SSR 完全正常（服务端变量都提前定义了），只有 hydration 后炸。
 *
 *   规则：**useHead 引用到的 computed，其自身和它依赖的 computed，
 *   都必须定义在 useHead 之前。**
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

const files = [
  ...walk(join(ROOT, 'pages')),
  ...walk(join(ROOT, 'components')),
  ...walk(join(ROOT, 'layouts')),
].map(f => relative(ROOT, f))

/** 取出 script setup 里的 JS 源码 */
function scriptOf(src: string): string {
  const m = src.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)
  return m ? m[1] : ''
}

/** 收集 `const NAME = computed(` 的名字与位置 */
function computedDefs(js: string): Map<string, number> {
  const defs = new Map<string, number>()
  const re = /const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:ref|computed|shallowRef)\s*\(/g
  let m: RegExpExecArray | null
  while ((m = re.exec(js))) {
    if (!defs.has(m[1])) defs.set(m[1], m.index)
  }
  return defs
}

/** 取出 `const NAME = computed(() => ... )` 的 getter 文本 */
function gettersOf(js: string): Map<string, string> {
  const out = new Map<string, string>()
  const re = /const\s+([A-Za-z_$][\w$]*)\s*=\s*computed\s*\(\s*\(\s*\)\s*=>\s*([\s\S]*?)\n\}\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(js))) out.set(m[1], m[2])
  return out
}

describe('useHead 的 computed 依赖顺序（TDZ 守卫）', () => {
  it('能扫到页面文件', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it.each(files)('%s 中 useHead 引用的 computed 及其依赖不得定义在 useHead 之后', (file) => {
    const js = scriptOf(readFileSync(join(ROOT, file), 'utf8'))
    if (!js.includes('useHead(')) return

    const headIdx = js.indexOf('useHead(')

    // 取出 useHead 真正求值的对象：
    //  - useHead({ ... })        → 对象本身
    //  - useHead(() => { return {...} }) → 函数形式是**惰性**求值，安全，不检查
    const after = js.slice(headIdx)
    const fnForm = /useHead\s*\(\s*(async\s*)?\(?\s*\)?\s*=>/.test(after)
    if (fnForm) return

    const headBlock = js.slice(headIdx, js.indexOf('})', headIdx) + 2)

    const defs = computedDefs(js)
    const getters = gettersOf(js)
    const problems: string[] = []

    // 只认「裸标识符」引用： key: identifier
    // 这样 description: '...their name...' 这种字符串里的词不会被误判
    const directRefs = new Set<string>()
    for (const m of headBlock.matchAll(/:\s*([A-Za-z_$][\w$]*)\s*[,}\n]/g)) {
      directRefs.add(m[1])
    }

    for (const [name, defIdx] of defs) {
      if (!directRefs.has(name)) continue
      if (defIdx > headIdx) {
        problems.push(`${name} 定义在 useHead 之后（offset ${defIdx} > ${headIdx}）`)
        continue
      }
      // 它依赖的 computed 也必须更早定义
      const getter = getters.get(name)
      if (!getter) continue
      for (const [dep, depIdx] of defs) {
        if (dep === name) continue
        if (!new RegExp(`\\b${dep}\\b`).test(getter)) continue
        if (depIdx > defIdx) {
          problems.push(`${name} 依赖 ${dep}，但 ${dep} 定义在它之后`)
        }
      }
    }

    expect(problems, `${file} 存在 TDZ 风险：\n  - ${problems.join('\n  - ')}`).toEqual([])
  })
})
