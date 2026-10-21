/**
 * 每日额度闸门守卫（防白嫖）
 *
 * ⚠️ 背景（2026-10-21 的白嫖审计）：
 *   「每日免费次数」之前只写在 /api/user/daily-free 这个旁路 API 里 ——
 *   前端 dashboard 有个「领取」按钮，但**生成接口根本不查它**，
 *   领不领都能生成。唯一生效的只有 KV 的 100 次/小时（= 一天 2400 次）。
 *   另外还有几个口子：
 *     - /api/image/generate 传 n=4 一次出 4 张图，却只扣 1 次额度
 *     - /api/image/generate-batch 一个请求能出 8 张
 *     - /api/upload 在公开白名单里 → 任何人都能往 R2 塞文件
 *
 * 这个测试锁住「所有烧 MiniMax 额度的入口都必须走服务端额度」。
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
    else if (name.endsWith('.ts')) out.push(full)
  }
  return out
}

const apiFiles = walk(join(ROOT, 'server/api')).map(f => relative(ROOT, f))
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8')

/** 会真正烧 MiniMax 额度的标志（调模型/调生成接口） */
const BURNS_CREDITS = [
  '/v1/image_generation',
  '/v1/chat/completions',
  'image_generation',
  'getDecryptedApiKey',
  'decomposePromptToBatch',
  'optimizeImagePrompt',
  'generateLyrics',
]

/** 纯只读、不烧额度的端点 */
const NO_CREDIT_BURDEN = new Set([
  'server/api/health.get.ts',
  'server/api/minimax/quota.get.ts',
  'server/api/image/samples.get.ts',
  'server/api/user/usage.get.ts',
  'server/api/user/daily-free.get.ts',
  'server/api/user/daily-free.post.ts',
])

describe('每日额度闸门', () => {
  it('能扫到 API 端点', () => {
    expect(apiFiles.length).toBeGreaterThan(20)
  })

  it.each(apiFiles)('%s 若烧 MiniMax 额度，就必须走服务端额度闸门', (file) => {
    if (NO_CREDIT_BURDEN.has(file)) return
    const src = read(file)
    const burns = BURNS_CREDITS.some(k => src.includes(k))
    if (!burns) return

    // 必须扣额度（consumeQuota 是带 units 的新接口，consumeDailyQuota 是兼容包装）
    expect(
      src.includes('consumeQuota') || src.includes('consumeDailyQuota'),
      `${file} 会烧 MiniMax 额度但没调用 consumeQuota/consumeDailyQuota —— 白嫖口子`,
    ).toBe(true)

    // 必须确认登录（中间件兜底 + 端点内显式检查，双保险）
    expect(
      src.includes('auth?.uid') || src.includes('auth.uid'),
      `${file} 缺少显式的登录检查`,
    ).toBe(true)
  })

  it('出图接口必须把实际张数交给额度层（不能一次 n=4 只算 1 次）', () => {
    const src = read('server/api/image/generate.post.ts')
    // 一次调用，但把 count 传进去 —— 服务端据此决定扣几张
    expect(src).toMatch(/consumeQuota\([^)]*'image'[^)]*count/)
    // 失败时按同样的张数退还
    expect(src).toMatch(/refundQuota\([^)]*'image'[^)]*count/)
  })

  it('批量生图必须把实际张数交给额度层', () => {
    const src = read('server/api/image/generate-batch.post.ts')
    expect(src).toContain('totalImages')
    expect(src).toMatch(/consumeQuota\([^)]*'image'[^)]*totalImages/)
  })

  it('上传接口不能是公开的（否则可白嫖 R2 存储）', () => {
    const src = read('server/middleware/auth.ts')
    // 先剥掉注释 —— 否则「曾经是公开的」这类说明文字会被误判成实际配置
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    const start = code.indexOf('PUBLIC_PATHS')
    const body = code.slice(start, code.indexOf(']', start))
    const entries = [...body.matchAll(/'([^']+)'/g)].map(m => m[1])
    expect(entries.length).toBeGreaterThan(5)
    expect(entries).not.toContain('/api/upload')
  })

  it('额度表结构支持按用户×按天计数', () => {
    const sql = read('server/db/migrations/0007_daily_usage.sql')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS daily_usage')
    expect(sql).toContain('PRIMARY KEY (user_id, usage_date)')
    expect(sql).toContain('image_count')
    expect(sql).toContain('music_count')
    expect(sql).toContain('text_count')
  })

  it('额度判定必须在服务端，特权用户豁免', () => {
    const src = read('server/utils/daily-usage.ts')
    // 无限积分豁免（credits = -1）
    expect(src).toMatch(/credits\s*===\s*-1/)
    // 管理员特权豁免
    expect(src).toContain('unlimited_credits')
    // 数据库不可用时不能放行
    expect(src).not.toMatch(/if\s*\(\s*!db\s*\)\s*\{\s*return\s*\{\s*allowed:\s*true/)
  })

  it('付费档**不再**无限（2026-10-21 提价重构）—— 必须走 credits', () => {
    // ⚠️ 先剥掉注释 —— 否则「以前是这么写的」这类说明文字会被误判
    const code = read('server/utils/daily-usage.ts')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    // 「plan 不是 free 就无限」那条短路必须消失
    expect(code).not.toMatch(/plan !== 'free' && status === 'active'/)
    // 付费档走 credit 模式
    expect(code).toMatch(/isPaidPlan\(ent\.plan\)/)
    expect(code).toContain("mode: 'credit'")
    // 用完张数要拒（402）
    expect(code).toContain('OUT_OF_CREDITS')
  })
})
