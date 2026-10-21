/**
 * 多人生成失败监控
 *
 * 目标：**多个人尝试生图失败时，给你发一封告警邮件**。
 *
 * 判定用的是「不同用户数」，不是「失败次数」——
 *   一个人连点 20 次重试 ≠ 事故（只是那个用户 prompt 有问题）
 *   三个不同的人同时失败     = 事故（上游挂了 / 我们代码炸了 / 额度耗尽）
 *
 * 排除用户侧错误：
 *   1026/1027 内容审核、2013 参数非法 → 用户自己的锅，不该打扰你
 *   （但可以通过 ALERT_COUNT_USER_ERRORS=true 把它们也算进去）
 *
 * 冷却期：
 *   同一波故障只发一封。ALERT_COOLDOWN_MINUTES 默认 30 分钟。
 *   用 D1 单条 UPSERT 做原子占位（WHERE 条件判断冷却），
 *   并发请求不会各发一封 —— 靠 meta.changes 判定谁抢到了。
 *
 * 失败 ≠ 只看错误码：HTTP 5xx、网络超时、异常兜底都算 system 级。
 */

import { nanoid } from 'nanoid'
import { getDB } from './db-runtime'
import { envBool, envNumber, envString } from './env'
import { sendAlert } from './alert'
import {
  classifyErrorCode,
  describeErrorCode,
  extractErrorCode,
  shouldAlert,
  type FailureCategory,
} from './minimax-guard'

/** 判定参数默认值 */
export const DEFAULT_MIN_DISTINCT_USERS = 3
export const DEFAULT_WINDOW_MINUTES = 10
export const DEFAULT_COOLDOWN_MINUTES = 30

/** 告警的 key —— 冷却期按这个维度去重 */
const ALERT_KEY = 'generation_failures'

export interface GenerationFailureInput {
  userId: string
  /** 哪个入口失败的：image/generate | image/generate-batch | music/generate | ... */
  endpoint: string
  /** 抛出来的错误 */
  error: unknown
  /** 已知的话直接给错误码，省得再从消息里猜 */
  code?: number | null
}

export interface FailureSample {
  userId: string
  endpoint: string
  code: number | null
  category: FailureCategory
  message: string
  createdAt: string
}

export interface FailureStats {
  windowMinutes: number
  distinctUsers: number
  totalFailures: number
  byCode: { code: number | null; category: FailureCategory; count: number; users: number }[]
  samples: FailureSample[]
}

export interface MonitorConfig {
  minDistinctUsers: number
  windowMinutes: number
  cooldownMinutes: number
  countUserErrors: boolean
}

export function resolveMonitorConfig(event: any): MonitorConfig {
  return {
    minDistinctUsers: Math.max(
      1,
      envNumber(event, 'ALERT_MIN_DISTINCT_USERS', DEFAULT_MIN_DISTINCT_USERS),
    ),
    windowMinutes: Math.max(
      1,
      envNumber(event, 'ALERT_WINDOW_MINUTES', DEFAULT_WINDOW_MINUTES),
    ),
    cooldownMinutes: Math.max(
      0,
      envNumber(event, 'ALERT_COOLDOWN_MINUTES', DEFAULT_COOLDOWN_MINUTES),
    ),
    countUserErrors: envBool(event, 'ALERT_COUNT_USER_ERRORS', false),
  }
}

/**
 * 拿到一个**可用**的 D1 实例
 *
 * ⚠️ 为什么要额外检查 typeof db.prepare === 'function'：
 *   binding 配错时（名字不对、或者被当成普通字符串传进来），
 *   getDB() 仍可能返回一个 truthy 的值，但调 .prepare 会直接抛
 *   "db.prepare is not a function"。监控代码必须自己兜住这种脏配置，
 *   不能让一个可选功能把用户的请求带崩。
 */
function getUsableDB(event: any): D1Database | undefined {
  const db = getDB(event) as any
  if (!db || typeof db.prepare !== 'function') return undefined
  return db as D1Database
}

/**
 * 记录一次生成失败，并判断要不要告警。
 *
 * **不抛异常** —— 监控失败不能影响用户请求。
 */
export async function recordGenerationFailure(
  event: any,
  input: GenerationFailureInput,
): Promise<{ alerted: boolean; stats?: FailureStats; reason?: string }> {
  const db = getUsableDB(event)
  if (!db) {
    console.error('[failure-monitor] D1 不可用，跳过失败记录')
    return { alerted: false, reason: 'db unavailable' }
  }

  const config = resolveMonitorConfig(event)
  const code = input.code ?? extractErrorCode(input.error)
  const category = classifyErrorCode(code)
  const message = String(
    (input.error as any)?.message || (input.error as any)?.statusMessage || 'unknown error',
  ).slice(0, 300)

  const now = new Date()
  const nowIso = now.toISOString()
  const nowTs = now.getTime()

  // 1) 写入失败流水
  try {
    await db
      .prepare(
        `INSERT INTO ops_generation_failures
           (id, user_id, endpoint, error_code, error_category, error_message, created_at, created_ts)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        nanoid(12),
        input.userId || 'anonymous',
        input.endpoint,
        code === null || code === undefined ? null : Number(code),
        category,
        message,
        nowIso,
        nowTs,
      )
      .run()
  } catch (err: any) {
    console.error('[failure-monitor] 写失败记录出错:', err?.message || err)
    return { alerted: false, reason: 'insert failed' }
  }

  // 2) 统计窗口内的失败情况
  const stats = await collectStats(event, config).catch(() => null)
  if (!stats) return { alerted: false, reason: 'stats failed' }

  // 3) 判定：不同用户数够不够
  if (stats.distinctUsers < config.minDistinctUsers) {
    return { alerted: false, stats }
  }

  // 4) 抢冷却期的发送许可（原子）
  const claimed = await claimAlertSlot(event, config, stats).catch(() => false)
  if (!claimed) {
    console.log(
      `[failure-monitor] 冷却期内，已跳过重复告警（${stats.distinctUsers} 位用户失败）`,
    )
    return { alerted: false, stats, reason: 'cooldown' }
  }

  // 5) 发邮件
  const res = await sendAlert(event, {
    subject: `[Create Keepsakes] ${stats.distinctUsers} 位用户生成失败（${stats.windowMinutes} 分钟内）`,
    body: buildAlertBody(event, stats, config),
  })

  console.error(
    `[failure-monitor] 已告警：${stats.distinctUsers} 位用户 / ${stats.totalFailures} 次失败，` +
      `邮件发送=${res.ok ? '成功' : '失败(' + (res.reason || '') + ')'}`,
  )

  return { alerted: true, stats }
}

/**
 * 统计窗口内的失败分布
 */
export async function collectStats(event: any, config: MonitorConfig): Promise<FailureStats> {
  const db = getUsableDB(event)
  if (!db) throw new Error('D1 unavailable')

  const sinceTs = Date.now() - config.windowMinutes * 60_000
  const categoryFilter = config.countUserErrors
    ? ''
    : ` AND error_category != 'user'`

  const agg = await db
    .prepare(
      `SELECT COUNT(DISTINCT user_id) AS users, COUNT(*) AS total
         FROM ops_generation_failures
        WHERE created_ts >= ?${categoryFilter}`,
    )
    .bind(sinceTs)
    .first<{ users: number; total: number }>()

  const byCodeRows = await db
    .prepare(
      `SELECT error_code, error_category, COUNT(*) AS n, COUNT(DISTINCT user_id) AS u
         FROM ops_generation_failures
        WHERE created_ts >= ?${categoryFilter}
        GROUP BY error_code, error_category
        ORDER BY n DESC
        LIMIT 10`,
    )
    .bind(sinceTs)
    .all<{ error_code: number | null; error_category: string; n: number; u: number }>()

  const sampleRows = await db
    .prepare(
      `SELECT user_id, endpoint, error_code, error_category, error_message, created_at
         FROM ops_generation_failures
        WHERE created_ts >= ?${categoryFilter}
        ORDER BY created_ts DESC
        LIMIT 5`,
    )
    .bind(sinceTs)
    .all<{
      user_id: string
      endpoint: string
      error_code: number | null
      error_category: string
      error_message: string | null
      created_at: string
    }>()

  return {
    windowMinutes: config.windowMinutes,
    distinctUsers: Number(agg?.users || 0),
    totalFailures: Number(agg?.total || 0),
    byCode: (byCodeRows?.results || []).map((r) => ({
      code: r.error_code === null ? null : Number(r.error_code),
      category: r.error_category as FailureCategory,
      count: Number(r.n),
      users: Number(r.u),
    })),
    samples: (sampleRows?.results || []).map((r) => ({
      userId: r.user_id,
      endpoint: r.endpoint,
      code: r.error_code === null ? null : Number(r.error_code),
      category: r.error_category as FailureCategory,
      message: r.error_message || '',
      createdAt: r.created_at,
    })),
  }
}

/**
 * 原子抢占告警发送许可
 *
 * 单条 UPSERT + WHERE 条件判断冷却 —— 并发下只有一个能抢到（meta.changes === 1）。
 */
async function claimAlertSlot(
  event: any,
  config: MonitorConfig,
  stats: FailureStats,
): Promise<boolean> {
  const db = getUsableDB(event)
  if (!db) return false

  const now = new Date()
  const nowIso = now.toISOString()
  const nowTs = now.getTime()
  const cooldownMs = config.cooldownMinutes * 60_000

  const detail = JSON.stringify({
    distinctUsers: stats.distinctUsers,
    totalFailures: stats.totalFailures,
    windowMinutes: config.windowMinutes,
  })

  const res = await db
    .prepare(
      `INSERT INTO ops_alerts (alert_key, last_fired_at, last_fired_ts, fire_count, last_detail, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)
       ON CONFLICT(alert_key) DO UPDATE SET
         fire_count = ops_alerts.fire_count + 1,
         last_fired_at = excluded.last_fired_at,
         last_fired_ts = excluded.last_fired_ts,
         last_detail = excluded.last_detail,
         updated_at = excluded.updated_at
       WHERE excluded.last_fired_ts - ops_alerts.last_fired_ts > ?`,
    )
    .bind(ALERT_KEY, nowIso, nowTs, detail, nowIso, cooldownMs)
    .run()

  return Number(res?.meta?.changes || 0) > 0
}

/**
 * 组装告警邮件正文（纯文本）
 */
export function buildAlertBody(event: any, stats: FailureStats, config: MonitorConfig): string {
  const site = envString(event, 'NUXT_PUBLIC_SITE_URL', '') || 'unknown'
  const now = new Date()
  const since = new Date(now.getTime() - config.windowMinutes * 60_000)

  const lines: string[] = []
  lines.push('多人生成失败告警')
  lines.push('')
  lines.push(`站点：${site}`)
  lines.push(
    `时间窗口：最近 ${config.windowMinutes} 分钟（${since.toISOString()} ~ ${now.toISOString()}）`,
  )
  lines.push(`涉及用户：${stats.distinctUsers} 位`)
  lines.push(`失败次数：${stats.totalFailures} 次`)
  lines.push('')
  lines.push('错误分布：')

  if (!stats.byCode.length) {
    lines.push('  （无记录）')
  } else {
    for (const row of stats.byCode) {
      const codeText = row.code === null ? 'no-code' : String(row.code)
      lines.push(
        `  ${codeText.padEnd(8)} ${describeErrorCode(row.code).padEnd(38)} × ${row.count}（${row.users} 位用户）`,
      )
    }
  }

  lines.push('')
  lines.push('最近失败样本：')
  for (const s of stats.samples) {
    // 用户 id 截断：邮件里不需要完整 uid
    const uid = s.userId.length > 10 ? `${s.userId.slice(0, 8)}…` : s.userId
    const codeText = s.code === null ? 'no-code' : String(s.code)
    lines.push(`  ${s.createdAt}  user=${uid}  ${s.endpoint}  code=${codeText}`)
    if (s.message) lines.push(`      ${s.message.slice(0, 160)}`)
  }
  if (!stats.samples.length) lines.push('  （无样本）')

  lines.push('')
  lines.push(
    `判定规则：最近 ${config.windowMinutes} 分钟内，≥ ${config.minDistinctUsers} 位不同用户出现非用户侧失败`,
  )
  lines.push(`冷却规则：同一波故障 ${config.cooldownMinutes} 分钟内只发一封`)

  return lines.join('\n')
}
