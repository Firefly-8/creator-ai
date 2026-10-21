/**
 * 每日额度核心逻辑的单元测试
 *
 * ⚠️ 为什么用 mock 而不是端到端：
 *   token 验证走 Firebase JWKS（沙箱连不上 googleapis.com），
 *   所以端到端跑不通。这里直接测**额度逻辑本身** —— 才是关键。
 *
 * 覆盖：
 *   - 原子扣减、到顶后拒绝
 *   - 失败退还
 *   - 付费 / 无限积分 / 管理员特权豁免
 *   - 邮箱未验证 → 更严的档位
 *   - DB 不可用 → 拒绝（绝不降级放行）
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ── mock D1 ──────────────────────────────────────────────
// D1 的 API：db.prepare(sql).bind(...args).first() / .run()
interface MockRow { [k: string]: any }

function makeMockDb(opts: {
  user?: MockRow | null
  usage?: MockRow | null
}) {
  const state = {
    user: opts.user === undefined ? { email_verified: 1 } : opts.user,
    usage: opts.usage || null,
    runs: [] as any[],
  }

  const db: any = {
    prepare(sql: string) {
      return {
        bind(...args: any[]) {
          return {
            async first() {
              if (sql.includes('FROM users')) return state.user
              if (sql.includes('FROM daily_usage')) return state.usage
              return null
            },
            async run() {
              state.runs.push({ sql, args })
              // 模拟 UPSERT 自增
              if (sql.includes('ON CONFLICT') && sql.includes('RETURNING')) {
                const col = sql.match(/SET\s+(\w+)\s*=\s*\1 \+ 1/)?.[1] || 'image_count'
                if (!state.usage) {
                  state.usage = { image_count: 0, music_count: 0, text_count: 0 }
                }
                state.usage[col] = (state.usage[col] || 0) + 1
                return { count: state.usage[col] }
              }
              if (sql.includes('SET') && sql.includes('CASE WHEN')) {
                const col = sql.match(/SET\s+(\w+)\s*=\s*CASE/)?.[1] || 'image_count'
                if (state.usage) {
                  state.usage[col] = Math.max(0, (state.usage[col] || 0) - 1)
                }
                return {}
              }
              return {}
            },
          }
        },
        async first() {
          if (sql.includes('FROM users')) return state.user
          if (sql.includes('FROM daily_usage')) return state.usage
          return null
        },
        async run() {
          state.runs.push({ sql, args: [] })
          return {}
        },
      }
    },
  }
  return { db, state }
}

// UPSERT 的 first() 需要返回 count —— 单独包一层
function makeDb2(opts: { user?: MockRow | null; usage?: MockRow | null }) {
  const { db, state } = makeMockDb(opts)
  const origPrepare = db.prepare.bind(db)
  db.prepare = (sql: string) => {
    const stmt = origPrepare(sql)
    if (!sql.includes('ON CONFLICT')) return stmt
    return {
      bind(...args: any[]) {
        return {
          async first() {
            const col = sql.match(/SET\s+(\w+)\s*=\s*\1 \+ 1/)?.[1] || 'image_count'
            if (!state.usage) state.usage = { image_count: 0, music_count: 0, text_count: 0 }
            state.usage[col] = (state.usage[col] || 0) + 1
            state.runs.push({ sql, args })
            return { count: state.usage[col] }
          },
          async run() { return {} },
        }
      },
    }
  }
  return { db, state }
}

const mockGetDB = vi.fn()

vi.mock('../server/utils/db-runtime', () => ({
  getDB: (...args: any[]) => mockGetDB(...args),
}))

const { consumeDailyQuota, refundDailyQuota, getUserQuota, FREE_DAILY_LIMITS } =
  await import('../server/utils/daily-usage')

const event: any = { context: {} }

describe('每日额度', () => {
  beforeEach(() => {
    mockGetDB.mockReset()
  })

  it('免费用户（已验证邮箱）每天图片额度是 2', async () => {
    const { db } = makeDb2({ user: { email_verified: 1, plan: 'free', status: 'active', credits_remaining: 10, privileged: 0 } })
    mockGetDB.mockReturnValue(db)
    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.unlimited).toBe(false)
    expect(q.limit).toBe(FREE_DAILY_LIMITS.image.verified)
    expect(q.remaining).toBe(q.limit)
  })

  it('未验证邮箱 → 更严的档位（堵批量注册）', async () => {
    const { db } = makeDb2({ user: { email_verified: 0, plan: 'free', status: 'active', credits_remaining: 10, privileged: 0 } })
    mockGetDB.mockReturnValue(db)
    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.limit).toBe(FREE_DAILY_LIMITS.image.unverified)
    expect(q.limit).toBeLessThan(FREE_DAILY_LIMITS.image.verified)
  })

  it('连续扣减到顶后，第 N+1 次被拒（429）', async () => {
    const { db } = makeDb2({ user: { email_verified: 1, plan: 'free', status: 'active', credits_remaining: 10, privileged: 0 } })
    mockGetDB.mockReturnValue(db)

    const limit = FREE_DAILY_LIMITS.image.verified
    for (let i = 1; i <= limit; i++) {
      const r = await consumeDailyQuota(event, 'u1', 'image')
      expect(r.used).toBe(i)
    }
    await expect(consumeDailyQuota(event, 'u1', 'image')).rejects.toMatchObject({ statusCode: 429 })
  })

  it('被拒绝的请求不消耗额度（没拿到图就不该扣）', async () => {
    const { db } = makeDb2({ user: { email_verified: 1, plan: 'free', status: 'active', credits_remaining: 10, privileged: 0 } })
    mockGetDB.mockReturnValue(db)

    const limit = FREE_DAILY_LIMITS.image.verified
    for (let i = 0; i < limit; i++) await consumeDailyQuota(event, 'u1', 'image')
    await expect(consumeDailyQuota(event, 'u1', 'image')).rejects.toMatchObject({ statusCode: 429 })

    // 被拒的那次不该留下计数 —— used 应该还是 limit
    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.used).toBe(limit)
    expect(q.remaining).toBe(0)
  })

  it('生成失败退还后又能再生成', async () => {
    const { db } = makeDb2({ user: { email_verified: 1, plan: 'free', status: 'active', credits_remaining: 10, privileged: 0 } })
    mockGetDB.mockReturnValue(db)

    const limit = FREE_DAILY_LIMITS.image.verified
    // 成功 1 次 + 失败 1 次（退还）→ 净消耗 1 次，还能再来一次
    await consumeDailyQuota(event, 'u1', 'image')
    await consumeDailyQuota(event, 'u1', 'image')
    await refundDailyQuota(event, 'u1', 'image')   // 这次生成失败了
    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.used).toBe(1)
    expect(q.remaining).toBe(limit - 1)
    // 还有额度，能再生成
    const r = await consumeDailyQuota(event, 'u1', 'image')
    expect(r.used).toBe(2)
  })

  it('付费订阅 → 不限', async () => {
    const { db } = makeDb2({ user: { email_verified: 1, plan: 'pro', status: 'active', credits_remaining: 100, privileged: 0 } })
    mockGetDB.mockReturnValue(db)
    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.unlimited).toBe(true)
    expect(q.remaining).toBeNull()
    // 不限的用户连扣 10 次也不报错
    for (let i = 0; i < 10; i++) {
      const r = await consumeDailyQuota(event, 'u1', 'image')
      expect(r.unlimited).toBe(true)
    }
  })

  it('credits_remaining = -1 → 不限', async () => {
    const { db } = makeDb2({ user: { email_verified: 1, plan: 'free', status: 'active', credits_remaining: -1, privileged: 0 } })
    mockGetDB.mockReturnValue(db)
    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.unlimited).toBe(true)
  })

  it('管理员特权（unlimited_credits）→ 不限', async () => {
    const { db } = makeDb2({ user: { email_verified: 1, plan: 'free', status: 'active', credits_remaining: 10, privileged: 1 } })
    mockGetDB.mockReturnValue(db)
    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.unlimited).toBe(true)
    expect(q.reason).toBe('admin')
  })

  it('已停用的订阅按免费处理（不能用过期订阅白嫖）', async () => {
    const { db } = makeDb2({ user: { email_verified: 1, plan: 'pro', status: 'cancelled', credits_remaining: 100, privileged: 0 } })
    mockGetDB.mockReturnValue(db)
    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.unlimited).toBe(false)
  })

  it('数据库不可用 → 拒绝，绝不降级放行', async () => {
    mockGetDB.mockReturnValue(null)
    await expect(consumeDailyQuota(event, 'u1', 'image')).rejects.toMatchObject({ statusCode: 503 })
  })

  it('不同类型的额度互不干扰（图片额度不能用文案额度顶替）', async () => {
    const { db } = makeDb2({ user: { email_verified: 1, plan: 'free', status: 'active', credits_remaining: 10, privileged: 0 } })
    mockGetDB.mockReturnValue(db)
    // 把图片额度用光
    for (let i = 0; i < FREE_DAILY_LIMITS.image.verified; i++) {
      await consumeDailyQuota(event, 'u1', 'image')
    }
    await expect(consumeDailyQuota(event, 'u1', 'image')).rejects.toMatchObject({ statusCode: 429 })
    // 文案额度还在
    const r = await consumeDailyQuota(event, 'u1', 'text')
    expect(r.used).toBe(1)
  })
})
