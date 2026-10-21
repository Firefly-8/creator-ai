/**
 * 多人生成失败监控的单元测试
 *
 * 覆盖：
 *   - MiniMax 错误码分类（用户侧 / 额度 / 系统）
 *   - 错误码从异常对象里的提取
 *   - 判定用的是**不同用户数**而不是失败次数
 *   - 冷却期内不重复告警
 *   - 用户侧错误（内容审核）不触发告警
 *   - 告警邮件正文内容
 *
 * ⚠️ 为什么要 mock D1 而不是端到端：
 *   端到端要过 Firebase JWKS（沙箱连不上 googleapis.com），
 *   而这里真正要验证的是**判定逻辑**，用内存 D1 mock 反而更精确。
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  classifyErrorCode,
  extractErrorCode,
  shouldAlert,
  describeErrorCode,
} from '../server/utils/minimax-guard'
import {
  recordGenerationFailure,
  resolveMonitorConfig,
  buildAlertBody,
  DEFAULT_MIN_DISTINCT_USERS,
  DEFAULT_WINDOW_MINUTES,
  DEFAULT_COOLDOWN_MINUTES,
} from '../server/utils/failure-monitor'

// ── mock D1 ──────────────────────────────────────────────

interface FailureRow {
  id: string
  user_id: string
  endpoint: string
  error_code: number | null
  error_category: string
  error_message: string
  created_at: string
  created_ts: number
}

interface AlertRow {
  alert_key: string
  last_fired_at: string
  last_fired_ts: number
  fire_count: number
  last_detail: string | null
  updated_at: string
}

/**
 * 内存版 D1 —— 按 SQL 关键字分派，模拟真实语义：
 *   - 时间窗口用 created_ts 整数比较
 *   - ops_alerts 的 UPSERT 带冷却期 WHERE 条件（changes=0 表示没抢到）
 */
function makeMockDb() {
  const failures: FailureRow[] = []
  const alerts = new Map<string, AlertRow>()
  const sentEmails: any[] = []

  const db: any = {
    prepare(sql: string) {
      // 真实 SQL 里排除用户侧错误时带这个条件，mock 必须同样实现
      const excludeUser = sql.includes("error_category != 'user'")
      const inWindow = (rows: FailureRow[], since: number) =>
        rows.filter((f) => f.created_ts >= since && (!excludeUser || f.error_category !== 'user'))

      return {
        bind(...args: any[]) {
          return {
            async first() {
              if (sql.includes('COUNT(DISTINCT user_id)')) {
                const since = Number(args[0])
                const rows = inWindow(failures, since)
                const users = new Set(rows.map((r) => r.user_id)).size
                return { users, total: rows.length }
              }
              return null
            },

            async all() {
              const since = Number(args[0])
              const rows = inWindow(failures, since)

              if (sql.includes('GROUP BY error_code')) {
                const bucket = new Map<string, any>()
                for (const r of rows) {
                  const key = `${r.error_code}|${r.error_category}`
                  if (!bucket.has(key)) {
                    bucket.set(key, {
                      error_code: r.error_code,
                      error_category: r.error_category,
                      n: 0,
                      userSet: new Set<string>(),
                    })
                  }
                  const b = bucket.get(key)!
                  b.n += 1
                  b.userSet.add(r.user_id)
                }
                return {
                  results: [...bucket.values()].map((b) => ({
                    error_code: b.error_code,
                    error_category: b.error_category,
                    n: b.n,
                    u: b.userSet.size,
                  })),
                }
              }

              if (sql.includes('ORDER BY created_ts DESC')) {
                return {
                  results: [...rows]
                    .sort((a, b) => b.created_ts - a.created_ts)
                    .slice(0, 5)
                    .map((r) => ({
                      user_id: r.user_id,
                      endpoint: r.endpoint,
                      error_code: r.error_code,
                      error_category: r.error_category,
                      error_message: r.error_message,
                      created_at: r.created_at,
                    })),
                }
              }

              return { results: [] }
            },

            async run() {
              if (sql.includes('INSERT INTO ops_generation_failures')) {
                failures.push({
                  id: args[0],
                  user_id: args[1],
                  endpoint: args[2],
                  error_code: args[3],
                  error_category: args[4],
                  error_message: args[5],
                  created_at: args[6],
                  created_ts: args[7],
                })
                return { meta: { changes: 1 } }
              }

              if (sql.includes('INSERT INTO ops_alerts')) {
                const key = args[0]
                const nowIso = args[1]
                const nowTs = args[2]
                const detail = args[3]
                const cooldownMs = Number(args[5])
                const existing = alerts.get(key)

                if (!existing) {
                  alerts.set(key, {
                    alert_key: key,
                    last_fired_at: nowIso,
                    last_fired_ts: nowTs,
                    fire_count: 1,
                    last_detail: detail,
                    updated_at: nowIso,
                  })
                  return { meta: { changes: 1 } }
                }

                // 冷却期内 → WHERE 不满足 → changes = 0
                if (nowTs - existing.last_fired_ts <= cooldownMs) {
                  return { meta: { changes: 0 } }
                }

                existing.last_fired_at = nowIso
                existing.last_fired_ts = nowTs
                existing.fire_count += 1
                existing.last_detail = detail
                existing.updated_at = nowIso
                return { meta: { changes: 1 } }
              }

              return { meta: { changes: 0 } }
            },
          }
        },
      }
    },
  }

  return { db, failures, alerts, sentEmails }
}

// ── mock 环境 ────────────────────────────────────────────

function makeEvent(env: Record<string, string> = {}) {
  return {
    context: {
      _platform: {
        cloudflare: {
          env: {
            NUXT_PUBLIC_SITE_URL: 'https://creator.yozzytools.com',
            ...env,
          },
        },
      },
    },
  }
}

/** 造一个带 MiniMax 错误码的异常（跟 minimax.ts 里的 MiniMaxError 同形） */
function minimaxError(code: number, msg = 'boom') {
  const e: any = new Error(msg)
  e.name = 'MiniMaxError'
  e.statusCode = code
  return e
}

// ══════════════════════════════════════════════════════════

describe('错误分类', () => {
  it('用户侧错误归为 user（不该告警）', () => {
    expect(classifyErrorCode(1026)).toBe('user') // 输入内容审核
    expect(classifyErrorCode(1027)).toBe('user') // 输出内容审核
    expect(classifyErrorCode(2013)).toBe('user') // 参数非法
  })

  it('额度类错误归为 quota（必须告警）', () => {
    expect(classifyErrorCode(1008)).toBe('quota') // 余额不足
    expect(classifyErrorCode(2056)).toBe('quota') // Token Plan 额度耗尽
  })

  it('其余业务码与 HTTP 错误码归为 system', () => {
    expect(classifyErrorCode(1002)).toBe('system') // 限流
    expect(classifyErrorCode(1004)).toBe('system') // 鉴权失败
    expect(classifyErrorCode(2049)).toBe('system') // key 无效
    expect(classifyErrorCode(500)).toBe('system') // HTTP 5xx
    expect(classifyErrorCode(503)).toBe('system')
  })

  it('拿不到错误码时归为 unknown（保守告警）', () => {
    expect(classifyErrorCode(null)).toBe('unknown')
    expect(classifyErrorCode(undefined)).toBe('unknown')
  })

  it('user 类默认不告警，开关打开后告警', () => {
    expect(shouldAlert('user', false)).toBe(false)
    expect(shouldAlert('user', true)).toBe(true)
    expect(shouldAlert('quota', false)).toBe(true)
    expect(shouldAlert('system', false)).toBe(true)
    expect(shouldAlert('unknown', false)).toBe(true)
  })
})

describe('错误码提取', () => {
  it('优先取 MiniMaxError.statusCode', () => {
    expect(extractErrorCode(minimaxError(2056))).toBe(2056)
  })

  it('能从消息文本里捞出错误码', () => {
    expect(extractErrorCode(new Error('MiniMax error: 2056 usage limit exceeded'))).toBe(2056)
  })

  it('能从消息文本里捞出 HTTP 状态码', () => {
    expect(extractErrorCode(new Error('MiniMax error: 503 upstream unavailable'))).toBe(503)
  })

  it('什么都捞不到时返回 null', () => {
    expect(extractErrorCode(new Error('something went wrong'))).toBe(null)
    expect(extractErrorCode(null)).toBe(null)
  })

  it('错误码有中文/英文描述', () => {
    expect(describeErrorCode(2056)).toContain('quota')
    expect(describeErrorCode(null)).toBe('unknown error')
  })
})

describe('配置解析', () => {
  it('没配就用默认值', () => {
    const cfg = resolveMonitorConfig(makeEvent())
    expect(cfg.minDistinctUsers).toBe(DEFAULT_MIN_DISTINCT_USERS)
    expect(cfg.windowMinutes).toBe(DEFAULT_WINDOW_MINUTES)
    expect(cfg.cooldownMinutes).toBe(DEFAULT_COOLDOWN_MINUTES)
    expect(cfg.countUserErrors).toBe(false)
  })

  it('配了就用配置值', () => {
    const cfg = resolveMonitorConfig(
      makeEvent({
        ALERT_MIN_DISTINCT_USERS: '5',
        ALERT_WINDOW_MINUTES: '30',
        ALERT_COOLDOWN_MINUTES: '10',
        ALERT_COUNT_USER_ERRORS: 'true',
      }),
    )
    expect(cfg.minDistinctUsers).toBe(5)
    expect(cfg.windowMinutes).toBe(30)
    expect(cfg.cooldownMinutes).toBe(10)
    expect(cfg.countUserErrors).toBe(true)
  })
})

describe('多人失败判定', () => {
  let mock: ReturnType<typeof makeMockDb>
  let event: any

  beforeEach(() => {
    mock = makeMockDb()
    event = makeEvent({
      ALERT_PROVIDER: 'resend',
      RESEND_API_KEY: 're_test_key',
      ALERT_EMAIL_TO: 'owner@qq.com',
      ALERT_EMAIL_FROM: 'Alerts <alerts@yozzytools.com>',
      ALERT_MIN_DISTINCT_USERS: '3',
      ALERT_WINDOW_MINUTES: '10',
      ALERT_COOLDOWN_MINUTES: '30',
    })
    ;(globalThis as any).__env__ = { DB: mock.db }
  })

  afterEach(() => {
    delete (globalThis as any).__env__
    vi.unstubAllGlobals()
  })

  it('一个人失败 20 次 —— 不告警（判定看的是不同用户数）', async () => {
    for (let i = 0; i < 20; i++) {
      const r = await recordGenerationFailure(event, {
        userId: 'user-a',
        endpoint: 'image/generate',
        error: minimaxError(2056),
      })
      expect(r.alerted).toBe(false)
    }
    expect(mock.failures).toHaveLength(20)
    expect(mock.sentEmails).toHaveLength(0)
  })

  it('三个不同用户各失败一次 —— 告警', async () => {
    const fetchMock = vi.fn(async () => new Response('{"id":"x"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    let alerted = false
    for (const uid of ['user-a', 'user-b', 'user-c']) {
      const r = await recordGenerationFailure(event, {
        userId: uid,
        endpoint: 'image/generate',
        error: minimaxError(2056),
      })
      alerted = alerted || r.alerted
    }

    expect(alerted).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.resend.com/emails')

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.to).toEqual(['owner@qq.com'])
    expect(body.subject).toContain('3 位用户')
    expect(body.text).toContain('2056')
  })

  it('两个不同用户 —— 不告警', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    for (const uid of ['user-a', 'user-b']) {
      await recordGenerationFailure(event, {
        userId: uid,
        endpoint: 'image/generate',
        error: minimaxError(1002),
      })
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('用户侧错误（内容审核）再多也不告警', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    for (const uid of ['user-a', 'user-b', 'user-c', 'user-d']) {
      await recordGenerationFailure(event, {
        userId: uid,
        endpoint: 'image/generate',
        error: minimaxError(1026, 'input blocked'),
      })
    }
    expect(fetchMock).not.toHaveBeenCalled()
    // 但流水还是要记下来 —— 事后能查
    expect(mock.failures).toHaveLength(4)
  })

  it('冷却期内不重复告警', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    // 第一波：3 个用户 → 告警
    for (const uid of ['u1', 'u2', 'u3']) {
      await recordGenerationFailure(event, {
        userId: uid,
        endpoint: 'image/generate',
        error: minimaxError(2056),
      })
    }
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // 第二波：又是 3 个用户（还在冷却期内）→ 不再发
    for (const uid of ['u4', 'u5', 'u6']) {
      await recordGenerationFailure(event, {
        userId: uid,
        endpoint: 'image/generate',
        error: minimaxError(2056),
      })
    }
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // 冷却期内的告警状态被记下来了
    const alert = mock.alerts.get('generation_failures')
    expect(alert?.fire_count).toBe(1)
  })

  it('邮件服务挂了 —— 不影响判定，也不抛异常', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )

    let alerted = false
    for (const uid of ['u1', 'u2', 'u3']) {
      const r = await recordGenerationFailure(event, {
        userId: uid,
        endpoint: 'image/generate',
        error: minimaxError(2056),
      })
      alerted = alerted || r.alerted
    }
    // 判定仍然是「已告警」，只是邮件没发出去
    expect(alerted).toBe(true)
  })

  it('D1 不可用 —— 安全返回，不影响用户请求', async () => {
    // ⚠️ resolveDB 有 globalThis.DB 缓存兜底（前面命中过会写进去），
    //    这里必须一起清掉，否则会拿到上一次的 mock db。
    delete (globalThis as any).__env__
    delete (globalThis as any).DB
    const r = await recordGenerationFailure(makeEvent(), {
      userId: 'u1',
      endpoint: 'image/generate',
      error: minimaxError(2056),
    })
    expect(r.alerted).toBe(false)
    expect(r.reason).toBe('db unavailable')
  })
})

describe('告警邮件正文', () => {
  it('包含窗口、用户数、错误分布、样本', () => {
    const event = makeEvent({ NUXT_PUBLIC_SITE_URL: 'https://staging.creator.yozzytools.com' })
    const body = buildAlertBody(
      event,
      {
        windowMinutes: 10,
        distinctUsers: 3,
        totalFailures: 7,
        byCode: [
          { code: 2056, category: 'quota', count: 5, users: 2 },
          { code: 1002, category: 'system', count: 2, users: 2 },
        ],
        samples: [
          {
            userId: 'abcdefghijklmnop',
            endpoint: 'image/generate',
            code: 2056,
            category: 'quota',
            message: 'usage limit exceeded',
            createdAt: '2026-10-21T12:47:31.000Z',
          },
        ],
      },
      { minDistinctUsers: 3, windowMinutes: 10, cooldownMinutes: 30, countUserErrors: false },
    )

    expect(body).toContain('staging.creator.yozzytools.com')
    expect(body).toContain('涉及用户：3 位')
    expect(body).toContain('失败次数：7 次')
    expect(body).toContain('2056')
    expect(body).toContain('1002')
    expect(body).toContain('image/generate')
    // 用户 id 要截断，不能在邮件里泄露完整 uid
    expect(body).toContain('abcdefgh…')
    expect(body).not.toContain('abcdefghijklmnop')
  })
})
