/**
 * 组件解析守卫 —— 防「组件静默不渲染」
 *
 * ⚠️ 背景（2026-10-21 提价时发现）：
 *   `pages/pricing.vue` 写的是 `<PayPalButton>`，
 *   但 Nuxt 的组件自动导入会带**目录前缀**
 *   （components/pricing/PayPalButton.vue → 注册名是 `PricingPayPalButton`），
 *   写 `<PayPalButton>` 解析不到 →
 *   **SSR 直接渲染成 `<!---->`，页面上一个购买按钮都没有**。
 *
 *   而且**不报错**：页面 200、测试全绿、截图也正常（按钮该在的位置是空的）。
 *   唯一能发现的方法是去看渲染出来的 HTML。
 *
 * 这个测试锁住：「模板里用的每个组件都必须真的能被解析到」。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const SKIP = ['node_modules', 'dist', '.nuxt', '.output', '.git', 'coverage', 'public']

function walk(dir: string, out: string[] = [], filter: (f: string) => boolean = () => true): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.includes(name)) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out, filter)
    else if (filter(full)) out.push(full)
  }
  return out
}

const read = (f: string) => readFileSync(join(ROOT, f), 'utf8')

/** 内置组件（不是我们自己写的，Nuxt 自带） */
const BUILTIN = new Set([
  'NuxtLink', 'NuxtPage', 'NuxtLayout', 'NuxtImg', 'NuxtClientFallback',
  'NuxtLoadingIndicator', 'NuxtRouteAnnouncer', 'NuxtErrorBoundary', 'NuxtTime',
  'NuxtWelcome', 'ClientOnly', 'DevOnly', 'ServerPlaceholder', 'UnoIcon',
  'Teleport', 'Transition', 'TransitionGroup', 'KeepAlive', 'Component',
  'Suspense', 'RouterLink', 'RouterView', 'Head', 'Html', 'Body', 'Title', 'Meta',
])

/**
 * 复刻 Nuxt 的组件命名规则
 * @see nuxt/src/components/module.ts → resolveComponentNameFromPath
 */
function pascalCase(s: string): string {
  return s
    .replace(/[-_.\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toUpperCase())
}

/** 解析 nuxt.config 的 components 配置 */
function parseComponentDirs(): { dir: string; pathPrefix: boolean }[] {
  const src = read('nuxt.config.ts')
  const start = src.indexOf('components: [')
  expect(start, 'nuxt.config 里找不到 components 配置').toBeGreaterThan(-1)
  const end = src.indexOf(']', start)
  const arr = src.slice(start + 'components: '.length, end + 1)

  const entries: { dir: string; pathPrefix: boolean }[] = []
  for (const m of arr.matchAll(/\{\s*path:\s*'([^']+)'\s*,\s*pathPrefix:\s*(true|false)\s*\}|\{\s*path:\s*'([^']+)'\s*,\s*pathPrefix:\s*(true|false)\s*,?\s*\}/g)) {
    entries.push({ dir: m[1].replace('~/', ''), pathPrefix: m[2] === 'true' })
  }
  // 纯字符串形式：'~/components'（pathPrefix 默认 true）
  for (const m of arr.matchAll(/^\s*'([^']+)'\s*,?\s*$/gm)) {
    entries.push({ dir: m[1].replace('~/', ''), pathPrefix: true })
  }
  expect(entries.length, '没解析到 components 配置 —— nuxt.config 的写法变了？').toBeGreaterThan(0)
  return entries
}

const DIRS = parseComponentDirs()

/** 组件文件 → 注册名 */
function registeredName(relPath: string): string {
  // 找最匹配的配置目录（最长前缀）
  const matched = DIRS
    .filter(d => relPath.startsWith(d.dir + '/'))
    .sort((a, b) => b.dir.length - a.dir.length)[0]
  if (!matched) return pascalCase(basename(relPath, '.vue'))

  // 相对**扫描目录**的路径（Nuxt 的前缀就是相对扫描目录算的）
  const rel = relPath.slice(matched.dir.length + 1)
  const fileName = basename(rel, '.vue')
  if (!matched.pathPrefix) return pascalCase(fileName)

  const dir = dirname(rel) // 'cards' / 'pricing' / 'auth'；根目录是 '.'
  if (!dir || dir === '.') return pascalCase(fileName)

  const prefix = pascalCase(dir.split('/').join(' '))
  const name = pascalCase(fileName)
  if (name.toLowerCase().startsWith(prefix.toLowerCase())) return name
  return prefix + name
}

const componentFiles = walk(join(ROOT, 'components'), [], f => f.endsWith('.vue')).map(f => relative(ROOT, f))
const REGISTRY = new Map<string, string>()
for (const f of componentFiles) {
  const name = registeredName(f)
  expect(
    REGISTRY.has(name),
    `组件名冲突：${f} 和 ${REGISTRY.get(name)} 都注册成 ${name} —— Nuxt 会互相覆盖`,
  ).toBe(false)
  REGISTRY.set(name, f)
}

/** 所有会被扫描的 .vue（页面 / 布局 / 组件 / app.vue） */
const allVue = walk(join(ROOT, 'pages'), [], f => f.endsWith('.vue'))
  .concat(walk(join(ROOT, 'layouts'), [], f => f.endsWith('.vue')))
  .concat(componentFiles)
  .concat([join(ROOT, 'app.vue')].filter(f => statSync(f).isFile()))

/** 抽掉注释，避免把注释里的标签算进来 */
function stripComments(src: string) {
  return src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * 只取 <template> 段
 * ⚠️ 不能用非贪婪的 /<template[\s\S]*?<\/template>/ ——
 *    模板里经常有嵌套的 <template v-if="...">，会把扫描截断。
 */
function templateOf(src: string): string {
  const m = src.match(/<template(\s[^>]*)?>/)
  if (!m) return ''
  const start = m.index! + m[0].length
  const scriptAt = src.indexOf('<script')
  const end = scriptAt > start ? scriptAt : src.length
  return src.slice(start, end)
}

describe('组件解析守卫', () => {
  it('注册表不为空（规则没写错）', () => {
    expect(REGISTRY.size).toBeGreaterThan(10)
    // 抽查几个已知的注册名 —— 必须等于**文件名**（pathPrefix: false）
    expect(REGISTRY.has('PayPalButton')).toBe(true)
    expect(REGISTRY.has('CardComposer')).toBe(true)
    expect(REGISTRY.has('AuthModal')).toBe(true)
    expect(REGISTRY.has('EmailVerificationGuard')).toBe(true)
    expect(REGISTRY.has('HomeAudience')).toBe(true)
  })

  it.each(allVue.map(f => relative(ROOT, f)))('%s 里用到的组件都能解析到', (file) => {
    const full = stripComments(read(file))
    // ⚠️ 只扫模板段 —— 脚本里的 TS 泛型 <Foo> 不是组件
    const src = templateOf(full)

    // 本文件里显式 import 的组件 —— 一定解析得到
    const imported = new Set<string>()
    for (const m of src.matchAll(/import\s+([A-Z][\w]*)\s+from\s+['"]/g)) imported.add(m[1])
    for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"][^'"]*\.vue['"]/g)) {
      for (const n of m[1].split(',')) {
        const name = n.trim().split(/\s+as\s+/).pop()?.trim()
        if (name) imported.add(name)
      }
    }

    const bad: string[] = []
    for (const m of src.matchAll(/<([A-Z][\w]*)/g)) {
      const tag = m[1]
      if (imported.has(tag)) continue
      if (BUILTIN.has(tag)) continue
      if (REGISTRY.has(tag)) continue
      bad.push(tag)
    }

    expect(
      bad,
      `${file} 用了没注册上的组件：${[...new Set(bad)].join(', ')}\n` +
        `→ Nuxt 的自动导入会带目录前缀（components/pricing/PayPalButton.vue → PricingPayPalButton）。\n` +
        `  两种改法：① 显式 import（推荐：import X from '~/components/xxx/X.vue'）\n` +
        `           ② 改用注册名（<PricingPayPalButton>）`,
    ).toEqual([])
  })

  it('定价页的购买按钮必须是显式 import（踩过的坑）', () => {
    const src = read('pages/pricing.vue')
    expect(src).toMatch(/import\s+PayPalButton\s+from\s+['"]~\/components\/pricing\/PayPalButton\.vue['"]/)
  })
})
