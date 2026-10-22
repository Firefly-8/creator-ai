/**
 * PayPal 请求体守卫
 *
 * ⚠️ 背景（2026-10-22）：
 *   1) return_url 里放过 `{id}` 占位符 —— 那是 **Stripe** 的写法，PayPal 不认，
 *      会直接 400：
 *        INVALID_REQUEST / INVALID_PARAMETER_SYNTAX
 *        field: /payment_source/paypal/experience_context/return_url
 *      PayPal 自己会在回跳 URL 后面追加 ?token=<orderId>，不需要占位符。
 *
 *   2) 把「错误对象」插值进 createError 的 statusMessage ——
 *      statusMessage 会进 HTTP 状态行，只能放短且纯 ASCII 的内容；
 *      详细原因应该放 message（进 JSON body）。
 *
 * 这个测试扫 server/api/paypal/** 和 server/api/subscriptions/**。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const TARGET_DIRS = ['server/api/paypal', 'server/api/subscriptions']

function walk(dir: string, out: string[] = []): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })) return out
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (p.endsWith('.ts')) out.push(p)
  }
  return out
}

describe('PayPal 请求体', () => {
  const files = TARGET_DIRS.flatMap(d => walk(join(ROOT, d)))
  const src = files.map(f => ({ file: relative(ROOT, f), text: readFileSync(f, 'utf8') }))

  it('扫描到了 PayPal 相关文件', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it('return_url / cancel_url 里不能有 {xxx} 占位符', () => {
    const bad: string[] = []
    for (const { file, text } of src) {
      text.split('\n').forEach((line, i) => {
        // 只看 URL 相关的行，跳过注释
        if (!/return_?url|cancel_?url/i.test(line)) return
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
        // `${base}` 是 JS 模板表达式（前面有 $），不是 PayPal 占位符；
        // 要找的是 `{id}` 这种裸花括号
        const m = trimmed.match(/(?<!\$)\{[A-Za-z_][A-Za-z0-9_]*\}/g)
        if (m) bad.push(`${file}:${i + 1}  ${trimmed}`)
      })
    }
    if (bad.length) console.error('\n❌ PayPal URL 里有占位符（PayPal 不支持，只有 Stripe 支持）：\n' + bad.join('\n'))
    expect(bad).toEqual([])
  })

  it('statusMessage 不能插值错误对象（会进 HTTP 状态行）', () => {
    const bad: string[] = []
    for (const { file, text } of src) {
      text.split('\n').forEach((line, i) => {
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
        if (!/statusMessage\s*:/.test(trimmed)) return
        if (/\$\{\s*(e|e2|err|error|exc)\b/.test(trimmed)) {
          bad.push(`${file}:${i + 1}  ${trimmed}`)
        }
      })
    }
    if (bad.length) {
      console.error('\n❌ statusMessage 里插值了错误对象（详细原因应放 message）：\n' + bad.join('\n'))
    }
    expect(bad).toEqual([])
  })
})
