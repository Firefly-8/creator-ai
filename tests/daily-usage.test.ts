/**
 * 额度核心逻辑的单元测试
 *
 * ⚠️ 为什么用 mock 而不是端到端：
 *   token 验证走 Firebase JWKS（沙箱连不上 googleapis.com），
 *   所以端到端跑不通。这里直接测**额度逻辑本身** —— 才是关键。
 *
 * 覆盖：
 *   - 原子扣减、到顶后拒绝
 *   - 失败退还
 *   - **付费档走 credits（不再无限）** ← 2026-10-21 提价重构的核心
 *   - 订阅周期惰性续发
 *   - 无限积分 / 管理员特权豁免
 *   - 邮箱未验证 → 更严的档位
 *   - DB 不可用 → 拒绝（绝不降级放行）
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ── mock D1 ──────────────────────────────────────────────
// D1 的 API：db.prepare(sql).bind(...args).first() / .run()
interface MockRow { [k: string]: any }

/**
 * mock 的 user 行同时扮演「users」和「subscriptions」两个角色 ——
 * 跟真实 SQL 一样（LEFT JOIN subscriptions s ON s.user_id = u.id），
 * 所以 plan / status / credits_remaining 这些字段挂在 user 上。
 */
function makeDb(opts: {
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
              // 每日额度 UPSERT 自增（INSERT ... ON CONFLICT ... RETURNING）
              if (sql.includes('ON CONFLICT') && sql.includes('RETURNING')) {
                const col = sql.match(/SET\s+(\w+)\s*=\s*\1 \+ 1/)?.[1] || 'image_count'
                if (!state.usage) state.usage = { image_count: 0, music_count: 0, text_count: 0 }
                state.usage[col] = (state.usage[col] || 0) + 1
                state.runs.push({ sql, args })
                return { count: state.usage[col] }
              }
              if (sql.includes('FROM users')) return state.user
              if (sql.includes('FROM daily_usage')) return state.usage
              // 扣 1 张付费卡：UPDATE ... RETURNING credits_remaining
              if (sql.includes('UPDATE subscriptions') && sql.includes('RETURNING')) {
                const u = state.user
                if (!u || (u.credits_remaining ?? 0) <= 0) return null
                u.credits_remaining = u.credits_remaining - 1
                return { credits_remaining: u.credits_remaining }
              }
              return null
            },
            async run() {
              state.runs.push({ sql, args })
              const u = state.user
              // 订阅续期（+N 张，推进周期）
              if (sql.includes('UPDATE subscriptions') && sql.includes('credits_remaining = CASE')) {
                if (u) {
                  const grant = args[0]
                  u.credits_remaining = u.credits_remaining === -1 ? -1 : (u.credits_remaining || 0) + grant
                  u.current_period_start = args[1]
                  u.current_period_end = args[2]
                }
                return {}
              }
              // 退卡（+1）
              if (sql.includes('UPDATE subscriptions') && sql.includes('credits_remaining + 1')) {
                if (u) u.credits_remaining = (u.credits_remaining || 0) + 1
                return {}
              }
              // 每日额度 UPSERT 自增
              if (sql.includes('ON CONFLICT') && sql.includes('RETURNING')) {
                const col = sql.match(/SET\s+(\w+)\s*=\s*\1 \+ 1/)?.[1] || 'image_count'
                if (!state.usage) state.usage = { image_count: 0, music_count: 0, text_count: 0 }
                state.usage[col] = (state.usage[col] || 0) + 1
                return { count: state.usage[col] }
              }
              // 每日额度退还（减 1）
              if (sql.includes('SET') && sql.includes('CASE WHEN')) {
                const col = sql.match(/SET\s+(\w+)\s*=\s*CASE/)?.[1] || 'image_count'
                if (state.usage) state.usage[col] = Math.max(0, (state.usage[col] || 0) - 1)
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

const mockGetDB = vi.fn()

vi.mock('../server/utils/db-runtime', () => ({
  getDB: (...args: any[]) => mockGetDB(...args),
}))

const { consumeQuota, consumeDailyQuota, refundQuota, refundDailyQuota, getUserQuota, FREE_DAILY_LIMITS } =
  await import('../server/utils/daily-usage')

const event: any = { context: {} }

/** 造一个免费用户 */
function freeUser(over: MockRow = {}) {
  return {
    email_verified: 1,
    plan: 'free',
    status: 'active',
    credits_remaining: 0,
    privileged: 0,
    ...over,
  }
}

/** 造一个付费用户（买断包：20 张） */
function paidUser(over: MockRow = {}) {
  return {
    email_verified: 1,
    plan: 'lifetime',
    status: 'active',
    credits_remaining: 20,
    privileged: 0,
    ...over,
  }
}

describe('每日额度', () => {
  beforeEach(() => {
    mockGetDB.mockReset()
  })

  it('免费用户（已验证邮箱）每天图片额度是 2', async () => {
    const { db } = makeDb({ user: freeUser() })
    mockGetDB.mockReturnValue(db)
    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.unlimited).toBe(false)
    expect(q.mode).toBe('daily')
    expect(q.limit).toBe(FREE_DAILY_LIMITS.image.verified)
    expect(q.remaining).toBe(q.limit)
  })

  it('未验证邮箱 → 更严的档位（堵批量注册）', async () => {
    const { db } = makeDb({ user: freeUser({ email_verified: 0 }) })
    mockGetDB.mockReturnValue(db)
    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.limit).toBe(FREE_DAILY_LIMITS.image.unverified)
    expect(q.limit).toBeLessThan(FREE_DAILY_LIMITS.image.verified)
  })

  it('连续扣减到顶后，第 N+1 次被拒（429）', async () => {
    const { db } = makeDb({ user: freeUser() })
    mockGetDB.mockReturnValue(db)

    const limit = FREE_DAILY_LIMITS.image.verified
    for (let i = 1; i <= limit; i++) {
      const r = await consumeQuota(event, 'u1', 'image', 1)
      expect(r.used).toBe(i)
    }
    await expect(consumeQuota(event, 'u1', 'image', 1)).rejects.toMatchObject({ statusCode: 429 })
  })

  it('被拒绝的请求不消耗额度（没拿到图就不该扣）', async () => {
    const { db } = makeDb({ user: freeUser() })
    mockGetDB.mockReturnValue(db)

    const limit = FREE_DAILY_LIMITS.image.verified
    for (let i = 0; i < limit; i++) await consumeQuota(event, 'u1', 'image', 1)
    await expect(consumeQuota(event, 'u1', 'image', 1)).rejects.toMatchObject({ statusCode: 429 })

    // 被拒的那次不该留下计数 —— used 应该还是 limit
    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.used).toBe(limit)
    expect(q.remaining).toBe(0)
  })

  it('生成失败退还后又能再生成', async () => {
    const { db } = makeDb({ user: freeUser() })
    mockGetDB.mockReturnValue(db)

    const limit = FREE_DAILY_LIMITS.image.verified
    // 成功 1 次 + 失败 1 次（退还）→ 净消耗 1 次，还能再来一次
    await consumeQuota(event, 'u1', 'image', 1)
    await consumeQuota(event, 'u1', 'image', 1)
    await refundQuota(event, 'u1', 'image', 1, 'daily')   // 这次生成失败了
    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.used).toBe(1)
    expect(q.remaining).toBe(limit - 1)
    // 还有额度，能再生成
    const r = await consumeQuota(event, 'u1', 'image', 1)
    expect(r.used).toBe(2)
  })

  it('不同类型的额度互不干扰（图片额度不能用文案额度顶替）', async () => {
    const { db } = makeDb({ user: freeUser() })
    mockGetDB.mockReturnValue(db)
    // 把图片额度用光
    for (let i = 0; i < FREE_DAILY_LIMITS.image.verified; i++) {
      await consumeQuota(event, 'u1', 'image', 1)
    }
    await expect(consumeQuota(event, 'u1', 'image', 1)).rejects.toMatchObject({ statusCode: 429 })
    // 文案额度还在
    const r = await consumeQuota(event, 'u1', 'text', 1)
    expect(r.used).toBe(1)
  })

  it('数据库不可用 → 拒绝，绝不降级放行', async () => {
    mockGetDB.mockReturnValue(null)
    await expect(consumeQuota(event, 'u1', 'image', 1)).rejects.toMatchObject({ statusCode: 503 })
  })
})

describe('付费额度（credits）—— 2026-10-21 提价重构的核心', () => {
  beforeEach(() => {
    mockGetDB.mockReset()
  })

  it('付费档**不再无限** —— 走 credits 扣减', async () => {
    const { db } = makeDb({ user: paidUser() })
    mockGetDB.mockReturnValue(db)

    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.unlimited).toBe(false)
    expect(q.mode).toBe('credit')
    expect(q.credits).toBe(20)
    expect(q.remaining).toBe(20)
  })

  it('一次生成只扣 1 张卡（不管出几张图）', async () => {
    const { db, state } = makeDb({ user: paidUser() })
    mockGetDB.mockReturnValue(db)

    // 一次出 4 张候选 = 1 张卡
    const r = await consumeQuota(event, 'u1', 'image', 4)
    expect(r.mode).toBe('credit')
    expect(r.credits).toBe(19)
    expect(state.user.credits_remaining).toBe(19)
  })

  it('卡用完了 → 402 OUT_OF_CREDITS（不是 429，也不是放行）', async () => {
    const { db } = makeDb({ user: paidUser({ credits_remaining: 1 }) })
    mockGetDB.mockReturnValue(db)

    await consumeQuota(event, 'u1', 'image', 1)
    await expect(consumeQuota(event, 'u1', 'image', 1)).rejects.toMatchObject({
      statusCode: 402,
      data: { code: 'OUT_OF_CREDITS' },
    })
  })

  it('付费用户没有「每日免费额度」这回事 —— 一次出 4 张也只扣 1 张', async () => {
    const { db, state } = makeDb({ user: paidUser() })
    mockGetDB.mockReturnValue(db)

    for (let i = 0; i < 5; i++) await consumeQuota(event, 'u1', 'image', 4)
    // 5 次生成 = 5 张卡（不是 20 张）
    expect(state.user.credits_remaining).toBe(15)
    // 每日额度表根本没被写
    expect(state.usage).toBe(null)
  })

  it('生成失败 → 退 1 张卡', async () => {
    const { db, state } = makeDb({ user: paidUser() })
    mockGetDB.mockReturnValue(db)

    const q = await consumeQuota(event, 'u1', 'image', 4)
    await refundQuota(event, 'u1', 'image', 4, q.mode)
    expect(state.user.credits_remaining).toBe(20)
  })

  it('订阅周期到期 → 惰性续发新一轮额度', async () => {
    const past = new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString()
    const { db, state } = makeDb({
      user: paidUser({
        plan: 'creator',
        credits_remaining: 1,
        paypal_subscription_id: 'SUB-1',
        current_period_start: past,
        current_period_end: past,
      }),
    })
    mockGetDB.mockReturnValue(db)

    const q = await getUserQuota(event, 'u1', 'image')
    // 剩 1 张 + 漏掉 2 个周期 × 月付 5 张 = 11 张
    expect(q.credits).toBe(11)
    expect(state.user.current_period_end).toBeTruthy()
    expect(Date.parse(state.user.current_period_end)).toBeGreaterThan(Date.now())
  })

  it('订阅刚到期（几天内）→ 只补一个周期', async () => {
    const past = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
    const { db } = makeDb({
      user: paidUser({
        plan: 'creator',
        credits_remaining: 1,
        paypal_subscription_id: 'SUB-1',
        current_period_start: past,
        current_period_end: past,
      }),
    })
    mockGetDB.mockReturnValue(db)

    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.credits).toBe(6)   // 1 + 5
  })

  it('订阅没到期 → 不重复发额度', async () => {
    const future = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString()
    const { db, state } = makeDb({
      user: paidUser({
        plan: 'creator',
        credits_remaining: 5,
        paypal_subscription_id: 'SUB-1',
        current_period_start: future,
        current_period_end: future,
      }),
    })
    mockGetDB.mockReturnValue(db)

    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.credits).toBe(5)
  })

  it('订阅已取消 → 不再按月发额度（但剩下的张数还能用）', async () => {
    const past = new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString()
    const { db } = makeDb({
      user: paidUser({
        plan: 'creator',
        status: 'cancelled',
        credits_remaining: 2,
        paypal_subscription_id: 'SUB-1',
        current_period_start: past,
        current_period_end: past,
      }),
    })
    mockGetDB.mockReturnValue(db)

    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.credits).toBe(2)      // 没多发
    expect(q.unlimited).toBe(false)
  })

  it('付费用户的音乐/文案走更宽松的每日额度（不是无限）', async () => {
    const { db } = makeDb({ user: paidUser() })
    mockGetDB.mockReturnValue(db)
    const q = await getUserQuota(event, 'u1', 'text')
    expect(q.mode).toBe('daily')
    expect(q.unlimited).toBe(false)
    expect(q.limit).toBeGreaterThan(FREE_DAILY_LIMITS.text.verified)
  })

  it('credits_remaining = -1 → 不限', async () => {
    const { db } = makeDb({ user: paidUser({ credits_remaining: -1 }) })
    mockGetDB.mockReturnValue(db)
    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.unlimited).toBe(true)
    // 不限的用户连扣 10 次也不报错
    for (let i = 0; i < 10; i++) {
      const r = await consumeQuota(event, 'u1', 'image', 1)
      expect(r.unlimited).toBe(true)
    }
  })

  it('管理员特权（unlimited_credits）→ 不限', async () => {
    const { db } = makeDb({ user: paidUser({ privileged: 1 }) })
    mockGetDB.mockReturnValue(db)
    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.unlimited).toBe(true)
    expect(q.reason).toBe('admin')
  })
})

describe('兼容旧调用', () => {
  beforeEach(() => {
    mockGetDB.mockReset()
  })

  it('consumeDailyQuota / refundDailyQuota 还在（别的端点在用）', async () => {
    const { db } = makeDb({ user: freeUser() })
    mockGetDB.mockReturnValue(db)
    const r = await consumeDailyQuota(event, 'u1', 'image')
    expect(r.mode).toBe('daily')
    await refundDailyQuota(event, 'u1', 'image')
    const q = await getUserQuota(event, 'u1', 'image')
    expect(q.used).toBe(0)
  })
})
