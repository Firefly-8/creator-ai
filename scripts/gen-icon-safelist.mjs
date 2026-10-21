#!/usr/bin/env node
/**
 * 自动生成 UnoCSS 图标 safelist
 *
 * ⚠️ 为什么需要这个（2026-10-21）：
 *   UnoCSS 的 presetIcons 只扫描源码里**写死的类名**。
 *   动态拼接的图标名它扫不到：
 *
 *     <span :class="`i-${a.icon}`" />              ← 扫不到
 *     const items = [{ icon: 'ph-armchair' }]      ← 这里也扫不到
 *
 *   结果就是首页 8 个受众入口的图标**一个都不显示**
 *   （i-ph-armchair / i-ph-crown / i-ph-coffee … 全是空白）。
 *   之前靠手写 safelist 兜底，但手写清单必然漏 —— 项目已经用到 90 个图标，
 *   safelist 里只有 40 个。
 *
 * 这个脚本把「源码里出现过的所有 ph-* 图标名」全部收集起来，
 * 生成 safelist JSON，uno.config.ts 读它。
 *
 * 用法：
 *   node scripts/gen-icon-safelist.mjs          # 写入 utils/icon-safelist.json
 *   node scripts/gen-icon-safelist.mjs --check  # 只检查是否需要更新（CI 用）
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'utils', 'icon-safelist.json')
const CHECK = process.argv.includes('--check')

const SCAN_DIRS = ['pages', 'components', 'layouts', 'composables', 'utils', 'server', 'app.vue']
const SKIP = new Set(['node_modules', 'dist', '.nuxt', '.output', '.git', '.wrangler', 'coverage', '.assets'])

/** 收集源码文件 */
function walk(p, out = []) {
  if (!existsSync(p)) return out
  const st = statSync(p)
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

const files = []
for (const d of SCAN_DIRS) walk(join(ROOT, d), files)

// 图标名：ph- 开头 + 小写字母/数字/短横
// 能同时匹配 `i-ph-house`、`ph-house`、数据里的 `icon: 'ph-armchair'`
const ICON_RE = /\b(i-)?(ph-[a-z0-9]+(?:-[a-z0-9]+)*)\b/g

const found = new Set()
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  let m
  while ((m = ICON_RE.exec(src))) {
    found.add(m[2]) // 'ph-house'
  }
}

const icons = [...found].sort()
const safelist = icons.map(i => `i-${i}`)

const payload = {
  _comment:
    '自动生成，请勿手改。改图标后跑 `node scripts/gen-icon-safelist.mjs`。' +
    '（uno.config.ts 的 presetIcons 只扫源码字面量，动态拼接的图标名必须在这里列出来）',
  icons,
  safelist,
}

const json = JSON.stringify(payload, null, 2) + '\n'

if (CHECK) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : ''
  if (current !== json) {
    console.error('[icon-safelist] 需要更新：跑 node scripts/gen-icon-safelist.mjs')
    process.exit(1)
  }
  console.log(`[icon-safelist] OK（${icons.length} 个图标）`)
} else {
  writeFileSync(OUT, json)
  console.log(`[icon-safelist] 写入 ${icons.length} 个图标 → ${relative(ROOT, OUT)}`)
  console.log(`  样例：${icons.slice(0, 10).join(', ')} …`)
}
