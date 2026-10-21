/**
 * 每日生成额度 —— 服务端强制的真闸门
 *
 * ⚠️ 为什么要这个文件（2026-10-21 的白嫖审计）：
 *   之前「每日免费次数」只写在 /api/user/daily-free 里 —— 前端 dashboard
 *   有个「领取」按钮，但**生成接口压根不查它**。领不领都能生成，
 *   唯一生效的是 KV 的 100 次/小时（= 一天 2400 次）。
 *   改成：额度判定全部发生在服务端，客户端绕不过去。
 *
 * 额度档位：
 *   - 付费用户（subscriptions.plan != 'free' 且 status='active'）→ 不限
 *   - credits_remaining = -1 或 user_privileges 含 unlimited_credits/svip → 不限
 *   - 管理员 → 不限
 *   - 免费用户 + 已验证邮箱 → image 2 / music 1 / text 10 每天
 *   - 免费用户 + 未验证邮箱 → image 1 / music 1 / text 3 每天
 *     （未验证邮箱是批量注册薅羊毛的主要入口，所以卡得最狠）
 *
 * 为什么免费额度这么低：
 *   定价是 $3.99/张、$9.99/月含 5 张。如果免费每天 2 次，一天就是 2 张，
 *   一个月 60 张 —— 付费毫无意义。
 *   真正的付费点是**2K 无水印 + 300 DPI 打印规格**（见 composables/useCardCanvas.ts），
 *   免费版出的图带水印、分辨率低，想印刷/批量就得付费。
 *
 * 计数为什么放 D1 不放 KV：
 *   KV 挂掉时代码是「降级放行」—— 那就等于没限额。D1 是权威账本。
 *   KV 限流（server/utils/rate-limit.ts）保留着，负责挡「短时间狂刷接口」。
 */

import { createError } from 'h3'
import { getDB } from './db-runtime'

export type UsageKind = 'image' | 'music' | 'text'

/** 免费用户每天的额度（未验证邮箱 / 已验证邮箱） */
export const FREE_DAILY_LIMITS: Record<UsageKind, { unverified: number; verified: number }> = {
  image: { unverified: 1, verified: 2 },
  music: { unverified: 1, verified: 1 },
  text: { unverified: 3, verified: 10 },
}

/** 一天的起始时刻（UTC 日期） */
export function todayUTC(): string {
  return new Date().toISOString().split('T')[0]
}

export interface UserQuota {
  kind: UsageKind
  /** 每天上限；unlimited 时为 null */
  limit: number | null
  /** 今天已经用了多少次 */
  used: number
  /** 今天还能用几次 */
  remaining: number | null
  unlimited: boolean
  /** 判定依据，写进日志便于排查 */
  reason: 'paid' | 'unlimited_credits' | 'admin' | 'email_verified' | 'email_unverified'
}

/**
 * 算出这个用户今天某类操作的额度上限
 * 付费/特权用户直接返回 unlimited
 */
export async function getUserQuota(event: any, uid: string, kind: UsageKind): Promise<UserQuota> {
  const db = getDB(event)
  if (!db) {
    // 数据库不可用时不能放行 —— 否则等于没限额。
    // 保守起见按「已用满」处理，宁可少一次也不能白嫖。
    console.error('[daily-usage] DB unavailable, denying quota check')
    return { kind, limit: 0, used: 0, remaining: 0, unlimited: false, reason: 'email_unverified' }
  }

  const row = await db
    .prepare(
      `SELECT
         s.plan, s.status, s.credits_remaining,
         u.email_verified,
         (SELECT COUNT(*) FROM user_privileges up
           WHERE up.user_id = u.id
             AND up.privilege IN ('unlimited_credits', 'svip', 'admin')
             AND (up.expires_at IS NULL OR up.expires_at > datetime('now'))) AS privileged
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id
       WHERE u.id = ?`,
    )
    .bind(uid)
    .first<{
      plan: string | null
      status: string | null
      credits_remaining: number | null
      email_verified: number | null
      privileged: number
    }>()

  if (!row) {
    // 查不到用户（刚注册还没 sync 完）→ 按未验证的最严档位
    return { kind, limit: FREE_DAILY_LIMITS[kind].unverified, used: 0, remaining: FREE_DAILY_LIMITS[kind].unverified, unlimited: false, reason: 'email_unverified' }
  }

  const plan = row.plan || 'free'
  const status = row.status || 'active'

  // 1) 付费订阅
  if (plan !== 'free' && status === 'active') {
    return { kind, limit: null, used: 0, remaining: null, unlimited: true, reason: 'paid' }
  }
  // 2) 无限积分（credits_remaining = -1）
  if (row.credits_remaining === -1) {
    return { kind, limit: null, used: 0, remaining: null, unlimited: true, reason: 'unlimited_credits' }
  }
  // 3) 管理员发的特权
  if ((row.privileged || 0) > 0) {
    return { kind, limit: null, used: 0, remaining: null, unlimited: true, reason: 'admin' }
  }

  // 4) 免费用户：按邮箱是否验证分档
  const verified = !!row.email_verified
  const limit = verified
    ? FREE_DAILY_LIMITS[kind].verified
    : FREE_DAILY_LIMITS[kind].unverified

  const usage = await db
    .prepare('SELECT image_count, music_count, text_count FROM daily_usage WHERE user_id = ? AND usage_date = ?')
    .bind(uid, todayUTC())
    .first<{ image_count: number; music_count: number; text_count: number }>()
    .catch(() => null)

  const used = usage ? Number(usage[`${kind}_count` as keyof typeof usage] || 0) : 0

  return {
    kind,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    unlimited: false,
    reason: verified ? 'email_verified' : 'email_unverified',
  }
}

/**
 * 消耗一次额度（原子自增）
 *
 * 顺序很重要：**先自增再判断**。D1 单条 UPSERT 是原子的，
 * 两个并发请求不会同时读到同一个旧值，所以不会超发。
 * 万一并发导致计数冲到 limit+1，那一次请求会被拒 —— 宁可少给一次，
 * 也不能多给一次。
 */
export async function consumeDailyQuota(
  event: any,
  uid: string,
  kind: UsageKind,
): Promise<UserQuota> {
  const db = getDB(event)
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'Service temporarily unavailable' })
  }

  const quota = await getUserQuota(event, uid, kind)
  if (quota.unlimited) return quota

  const col = `${kind}_count`
  const date = todayUTC()

  // 原子自增并返回新值
  const row = await db
    .prepare(
      `INSERT INTO daily_usage (user_id, usage_date, ${col}, updated_at)
       VALUES (?, ?, 1, datetime('now'))
       ON CONFLICT(user_id, usage_date) DO UPDATE SET
         ${col} = ${col} + 1,
         updated_at = datetime('now')
       RETURNING ${col} AS count`,
    )
    .bind(uid, date)
    .first<{ count: number }>()

  const used = Number(row?.count || 0)
  const limit = quota.limit ?? 0

  if (used > limit) {
    // ⚠️ 这一次的自增必须退回去 —— 用户没拿到图，不能白扣额度。
    //   （UPSERT 已经加过了，这里减回来，净效果是「没通过检查就不计数」）
    await db
      .prepare(
        `UPDATE daily_usage SET ${col} = CASE WHEN ${col} > 0 THEN ${col} - 1 ELSE 0 END,
         updated_at = datetime('now')
         WHERE user_id = ? AND usage_date = ?`,
      )
      .bind(uid, date)
      .run()
      .catch(() => {})

    console.warn(`[daily-usage] DENY uid=${uid} kind=${kind} used=${used} limit=${limit}`)
    throw createError({
      statusCode: 429,
      statusMessage: 'Daily free limit reached',
      data: {
        code: 'DAILY_LIMIT_REACHED',
        kind,
        limit,
        used: limit,
        remaining: 0,
        upgrade: true,
      },
    })
  }

  console.log(`[daily-usage] OK uid=${uid} kind=${kind} used=${used}/${limit}`)

  return {
    kind,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    unlimited: false,
    reason: quota.reason,
  }
}

/** 只查不扣（给前端显示「今天还剩 N 次」） */
export async function peekDailyQuota(event: any, uid: string): Promise<
  Record<UsageKind, { limit: number | null; used: number; remaining: number | null; unlimited: boolean }>
> {
  const out = {} as any
  for (const kind of ['image', 'music', 'text'] as UsageKind[]) {
    const q = await getUserQuota(event, uid, kind)
    out[kind] = { limit: q.limit, used: q.used, remaining: q.remaining, unlimited: q.unlimited }
  }
  return out
}

/**
 * 退还一次额度 —— 生成失败时调用。
 *
 * 为什么需要：额度是**调用 MiniMax 之前**扣的（否则并发会超发），
 * 但如果 MiniMax 报错/超时，用户什么也没拿到，扣掉就太亏了。
 * 所以失败时把计数减回去。
 *
 * 不会减到负数（用 CASE 兜底），也不会把别人的计数改坏
 * （WHERE 条件限定了 user_id + usage_date + count > 0）。
 */
export async function refundDailyQuota(
  event: any,
  uid: string,
  kind: UsageKind,
): Promise<void> {
  const db = getDB(event)
  if (!db) return
  const col = `${kind}_count`
  try {
    await db
      .prepare(
        `UPDATE daily_usage SET ${col} = CASE WHEN ${col} > 0 THEN ${col} - 1 ELSE 0 END,
         updated_at = datetime('now')
         WHERE user_id = ? AND usage_date = ?`,
      )
      .bind(uid, todayUTC())
      .run()
  } catch (e) {
    console.error('[daily-usage] refund failed', e)
  }
}
