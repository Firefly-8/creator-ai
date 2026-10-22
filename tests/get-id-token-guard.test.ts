/**
 * getIdToken(true) 守卫
 *
 * ⚠️ 背景（2026-10-22）：
 *   `getIdToken(true)` = **每次调用都强制走一次网络刷新**。
 *   而 Firebase 的 token 一变，`onAuthStateChanged` 就会再触发一次 →
 *   app 里的 syncUser() / 角色 watcher 又会调 getIdToken(true) → **死循环**。
 *
 *   实测症状：登录后页面上「PayPal 按钮」永远停在 fallback（不渲染），
 *   同时 securetoken.googleapis.com 被疯狂调用（一次登录打了 6 次）。
 *
 *   正确做法：`getIdToken()`（不传 true）。
 *   Firebase SDK 内部会在 token 过期/临近过期时自动刷新，够用；
 *   不传 true 就不会触发「刷新 → 改 token → 再触发监听」的循环。
 *
 * 这个测试扫所有源码：不允许出现 getIdToken(true)。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
// ⚠️ 排除 tests/ —— 本文件自己的注释里就写着 getIdToken(true)，
//    不排除会自己抓自己
const SKIP = new Set(['node_modules', 'dist', '.nuxt', '.output', '.git', '.wrangler', 'coverage', '.assets', 'scripts', 'tests'])
const EXTS = new Set(['.ts', '.vue', '.js', '.mjs'])

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (EXTS.has(name.slice(name.lastIndexOf('.')))) out.push(p)
  }
  return out
}

describe('getIdToken 不应该强制刷新', () => {
  const files = walk(ROOT)
  const offenders: string[] = []

  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    // 匹配 getIdToken( true ) / getIdToken(true) / getIdToken( true )
    if (/getIdToken\(\s*true\s*\)/.test(src)) {
      const lines = src.split('\n')
      lines.forEach((line, i) => {
        if (!/getIdToken\(\s*true\s*\)/.test(line)) return
        const trimmed = line.trim()
        // 注释里提到 getIdToken(true) 是「说明别这么写」，不是真的这么写
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
        offenders.push(`${relative(ROOT, f)}:${i + 1}  ${trimmed}`)
      })
    }
  }

  it('源码里不应出现 getIdToken(true)', () => {
    if (offenders.length) {
      console.error('\n❌ 发现强制刷新 token 的写法（会造成 auth 死循环）：\n' + offenders.join('\n'))
    }
    expect(offenders).toEqual([])
  })
})
