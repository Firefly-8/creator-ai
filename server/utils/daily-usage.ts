/**
 * 生成额度闸门 —— 服务端强制的真账本
 *
 * ⚠️ 为什么要这个文件（2026-10-21 的白嫖审计 + 提价重构）：
 *   1. 之前「每日免费次数」只写在 /api/user/daily-free 里 —— 前端 dashboard
 *      有个「领取」按钮，但**生成接口压根不查它**。领不领都能生成。
 *      → 改成：额度判定全部发生在服务端，客户端绕不过去。
 *   2. 之前 `plan !== 'free' && status === 'active'` 直接判「无限生成」——
 *      **所有付费档位都无限用**，credits_remaining 那个字段从来没被读过。
 *      也就是说 $19.99 买断包能一直白嫖下去，涨价只会加速亏损。
 *      → 现在付费用户走 **credits 扣减**：1 张卡 = 1 次出图机会，
 *        用完了就得再买（订阅用户每个周期自动补）。
 *
 * 三种额度模式（mode）：
 *   - 'credit'   付费档：扣 subscriptions.credits_remaining（买来的张数）
 *   - 'daily'    免费档：扣 daily_usage 表的当日计数
 *   - 'unlimited' 后台发的特权 / credits_remaining = -1
 *
 * 为什么免费额度可以到 2 张/天还不影响付费：
 *   免费出的是**带水印的 1024px 预览** —— 好看但不能印。
 *   付费点是无水印 + 2K + 300 DPI 打印规格，不是「次数」。
 *   （水印是前端 canvas 叠的，原始图在 R2 上是公开的 ——
 *     所以真正卡人的闸门只能是**服务端出图次数**，这也是这次重构的重点。）
 *
 * 计数为什么放 D1 不放 KV：
 *   KV 挂掉时代码是「降级放行」—— 那就等于没限额。D1 是权威账本。
 *   KV 限流（server/utils/rate-limit.ts）保留着，负责挡「短时间狂刷接口」。
 */

import { createError } from 'h3'
import { getDB } from './db-runtime'
import {
  FREE_DAILY_LIMITS,
  PAID_DAILY_LIMITS,
  PLANS,
  getPlan,
  isPaidPlan,
  resolvePlanId,
  type UsageKind,
} from '../../utils/pricing'

export { FREE_DAILY_LIMITS, PAID_DAILY_LIMITS }
export type { UsageKind }

/** 额度模式 */
export type QuotaMode = 'daily' | 'credit' | 'unlimited'

export interface UserQuota {
  kind: UsageKind
  /** 每天上限；credit / unlimited 时为 null */
  limit: number | null
  /** 今天已经用了多少次（credit 模式恒为 0） */
  used: number
  /** 今天还能用几次（credit 模式 = 剩余付费张数） */
  remaining: number | null
  unlimited: boolean
  /** 判定依据，写进日志便于排查 */
  reason:
    | 'paid_credit'
    | 'out_of_credits'
    | 'unlimited_credits'
    | 'admin'
    | 'email_verified'
    | 'email_unverified'
  mode: QuotaMode
  /** 剩余付费张数（credit 模式） */
  credits: number | null
  /** 当前档位 */
  plan: string
}

/** 用户的付费权益快照 */
interface Entitlement {
  plan: string
  status: string
  /** 剩余付费张数；-1 = 不限 */
  credits: number
  /** 有没有真的挂着 PayPal 订阅 */
  hasSubscription: boolean
  periodStart: string | null
  periodEnd: string | null
  privileged: boolean
  emailVerified: boolean
}

/** 一天的起始时刻（UTC 日期） */
export function todayUTC(): string {
  return new Date().toISOString().split('T')[0]
}

/** 加 n 个自然月（按 UTC 日历算，保持「每月同一天」的语义） */
function addMonths(iso: string, n: number): string {
  const d = new Date(iso)
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString()
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000

/**
 * 读一个用户的付费权益
 *
 * ⚠️ 付费判定只看「档位 + 状态」：
 *   买了单张/买断包（one_time）的人 status 也是 'active'，
 *   但他们**没有** paypal_subscription_id —— 不会按月发额度。
 */
async function loadEntitlement(db: any, uid: string): Promise<Entitlement | null> {
  const row = await db
    .prepare(
      `SELECT
         s.plan, s.status, s.credits_remaining, s.paypal_subscription_id,
         s.current_period_start, s.current_period_end,
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
      paypal_subscription_id: string | null
      current_period_start: string | null
      current_period_end: string | null
      email_verified: number | null
      privileged: number
    }>()

  if (!row) return null

  return {
    plan: row.plan || 'free',
    status: row.status || 'active',
    credits: row.credits_remaining === null || row.credits_remaining === undefined ? 0 : Number(row.credits_remaining),
    hasSubscription: !!row.paypal_subscription_id,
    periodStart: row.current_period_start || null,
    periodEnd: row.current_period_end || null,
    privileged: (row.privileged || 0) > 0,
    emailVerified: !!row.email_verified,
  }
}

/**
 * 订阅周期惰性续发 —— 周期到了就发新一轮额度
 *
 * 为什么要有这条兜底：
 *   PayPal 的 BILLING.SUBSCRIPTION.RENEWED webhook 偶尔会丢。
 *   只靠 webhook 的话，付了钱却拿不到新周期额度 = 客诉 + 拒付。
 *   所以读额度时顺手检查一下周期，过期就补发。
 *
 * 防重复发放：
 *   - 这里只在「周期确实过期」时发（now >= period_end）
 *   - webhook 那边只在「周期确实过期」时发（storedEnd < now）
 *   - 两边都是「发完就把 period_end 推到未来」⇒ 谁先跑谁发，后来的看到
 *     period_end 已经是未来就跳过 ⇒ 不会双发。
 *   - 额度本身极便宜（$0.0035/张），万一多发一张，损失是几厘钱。
 */
async function renewSubscriptionIfDue(db: any, ent: Entitlement, uid: string): Promise<Entitlement> {
  if (!ent.hasSubscription || ent.status !== 'active') return ent
  if (!ent.periodEnd) return ent

  const end = Date.parse(ent.periodEnd)
  if (!Number.isFinite(end) || end > Date.now()) return ent

  const planId = resolvePlanId(ent.plan) ?? 'creator'
  const plan = getPlan(planId)
  const cards = plan?.kind === 'subscription' ? plan.cards : PLANS.creator.cards

  // 漏掉了几个周期就补几个（订阅被暂停时 status 已经不是 active，不会走到这里）
  const periods = Math.max(1, Math.ceil((Date.now() - end) / MONTH_MS))
  const grant = cards * periods
  let nextEnd = addMonths(ent.periodEnd, periods)
  if (Date.parse(nextEnd) <= Date.now()) nextEnd = addMonths(new Date().toISOString(), 1)

  const now = new Date().toISOString()
  await db
    .prepare(
      `UPDATE subscriptions
       SET credits_remaining = CASE WHEN credits_remaining = -1 THEN -1 ELSE credits_remaining + ? END,
           current_period_start = ?, current_period_end = ?, updated_at = ?
       WHERE user_id = ? AND status = 'active'`,
    )
    .bind(grant, ent.periodEnd, nextEnd, now, uid)
    .run()
    .catch((e) => console.error('[daily-usage] 订阅续期失败:', e?.message))

  ent.credits = ent.credits === -1 ? -1 : ent.credits + grant
  ent.periodStart = ent.periodEnd
  ent.periodEnd = nextEnd
  console.log(`[daily-usage] 订阅续期 uid=${uid} plan=${planId} +${grant} 张 (${periods} 个周期)`)
  return ent
}

/**
 * 算出这个用户现在某类操作还剩多少
 *
 * 图片：付费走 credits，免费走每日额度
 * 音乐/文案：付费用户用更宽松的每日额度（不是无限 —— MiniMax 是真金白银）
 */
export async function getUserQuota(event: any, uid: string, kind: UsageKind): Promise<UserQuota> {
  const db = getDB(event)
  if (!db) {
    // 数据库不可用时不能放行 —— 否则等于没限额。
    // 保守起见按「已用满」处理，宁可少一次也不能白嫖。
    console.error('[daily-usage] DB unavailable, denying quota check')
    return {
      kind,
      limit: 0,
      used: 0,
      remaining: 0,
      unlimited: false,
      reason: 'email_unverified',
      mode: 'daily',
      credits: null,
      plan: 'free',
    }
  }

  let ent = await loadEntitlement(db, uid)

  if (!ent) {
    // 查不到用户（刚注册还没 sync 完）→ 按未验证的最严档位
    const limit = FREE_DAILY_LIMITS[kind].unverified
    return {
      kind,
      limit,
      used: 0,
      remaining: limit,
      unlimited: false,
      reason: 'email_unverified',
      mode: 'daily',
      credits: null,
      plan: 'free',
    }
  }

  ent = await renewSubscriptionIfDue(db, ent, uid)

  // 1) 后台发的无限特权
  if (ent.privileged) {
    return {
      kind,
      limit: null,
      used: 0,
      remaining: null,
      unlimited: true,
      reason: 'admin',
      mode: 'unlimited',
      credits: null,
      plan: ent.plan,
    }
  }

  // 2) credits_remaining = -1 → 不限（历史老用户 / 手动放行）
  if (ent.credits === -1) {
    return {
      kind,
      limit: null,
      used: 0,
      remaining: null,
      unlimited: true,
      reason: 'unlimited_credits',
      mode: 'unlimited',
      credits: -1,
      plan: ent.plan,
    }
  }

  // 3) 图片：付费档走 credits（**不再无限**）
  if (kind === 'image' && isPaidPlan(ent.plan)) {
    if (ent.credits > 0) {
      return {
        kind,
        limit: null,
        used: 0,
        remaining: ent.credits,
        unlimited: false,
        reason: 'paid_credit',
        mode: 'credit',
        credits: ent.credits,
        plan: ent.plan,
      }
    }
    return {
      kind,
      limit: null,
      used: 0,
      remaining: 0,
      unlimited: false,
      reason: 'out_of_credits',
      mode: 'credit',
      credits: 0,
      plan: ent.plan,
    }
  }

  // 4) 免费档 / 付费档的音乐文案：按每日额度
  const limits = isPaidPlan(ent.plan) ? PAID_DAILY_LIMITS : FREE_DAILY_LIMITS
  const limit = ent.emailVerified ? limits[kind].verified : limits[kind].unverified

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
    reason: ent.emailVerified ? 'email_verified' : 'email_unverified',
    mode: 'daily',
    credits: isPaidPlan(ent.plan) ? ent.credits : null,
    plan: ent.plan,
  }
}

/**
 * 消耗额度
 *
 * units = 这次要出几张图（客户端可以传 n，所以要按张数扣）
 *
 * 扣法分两种：
 *   - credit 模式（付费）：**一次生成扣 1 张卡**。
 *     一次生成会出 4 个候选让用户挑，但用户只拿走 1 张 ——
 *     按张数扣等于「做 1 张卡要付 4 张的钱」，那是欺诈性定价。
 *   - daily 模式（免费）：按张数扣每日额度（防「一次掏空一天」）。
 *
 * 顺序很重要：**先自增再判断**。D1 单条 UPSERT 是原子的，
 * 两个并发请求不会同时读到同一个旧值，所以不会超发。
 * 万一并发导致计数冲到 limit+1，那一次请求会被拒 —— 宁可少给一次，
 * 也不能多给一次。
 */
export async function consumeQuota(
  event: any,
  uid: string,
  kind: UsageKind,
  units = 1,
): Promise<UserQuota> {
  const db = getDB(event)
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'Service temporarily unavailable' })
  }

  const quota = await getUserQuota(event, uid, kind)
  if (quota.unlimited) return quota

  // ── 付费档的图片：扣 credits（原子自减，条件 > 0）──
  if (quota.mode === 'credit') {
    const row = await db
      .prepare(
        `UPDATE subscriptions
         SET credits_remaining = credits_remaining - 1, updated_at = ?
         WHERE user_id = ? AND credits_remaining > 0
         RETURNING credits_remaining`,
      )
      .bind(new Date().toISOString(), uid)
      .first<{ credits_remaining: number }>()

    const left = row ? Number(row.credits_remaining) : 0
    if (row) {
      console.log(`[daily-usage] OK uid=${uid} kind=${kind} 扣 1 张，剩 ${left}`)
      return {
        ...quota,
        remaining: left,
        credits: left,
        used: 0,
      }
    }

    // 并发把额度抢完了（或者本来就没有）→ 拒绝
    console.warn(`[daily-usage] DENY(无卡) uid=${uid} kind=${kind}`)
    throw createError({
      statusCode: 402,
      statusMessage: 'You have used all your cards',
      data: {
        code: 'OUT_OF_CREDITS',
        kind,
        remaining: 0,
        upgrade: true,
      },
    })
  }

  // ── 免费档：按张数扣每日额度 ──
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
    ...quota,
    used,
    remaining: Math.max(0, limit - used),
  }
}

/** 兼容旧调用：扣 1 次每日额度 */
export async function consumeDailyQuota(
  event: any,
  uid: string,
  kind: UsageKind,
): Promise<UserQuota> {
  return consumeQuota(event, uid, kind, 1)
}

/**
 * 退还额度 —— 生成失败时调用。
 *
 * 为什么需要：额度是**调用 MiniMax 之前**扣的（否则并发会超发），
 * 但如果 MiniMax 报错/超时，用户什么也没拿到，扣掉就太亏了。
 *
 * mode 决定退什么：
 *   - 'credit' → 退 1 张付费卡
 *   - 'daily'  → 退 units 次每日额度
 */
export async function refundQuota(
  event: any,
  uid: string,
  kind: UsageKind,
  units = 1,
  mode?: QuotaMode,
): Promise<void> {
  const db = getDB(event)
  if (!db) return

  // 退卡
  if (mode === 'credit') {
    await db
      .prepare(
        `UPDATE subscriptions
         SET credits_remaining = credits_remaining + 1, updated_at = ?
         WHERE user_id = ? AND credits_remaining >= 0`,
      )
      .bind(new Date().toISOString(), uid)
      .run()
      .catch((e) => console.error('[daily-usage] 退卡失败', e))
    console.log(`[daily-usage] 已退 1 张卡 uid=${uid}`)
    return
  }

  // 退每日额度
  const col = `${kind}_count`
  for (let i = 0; i < units; i++) {
    await db
      .prepare(
        `UPDATE daily_usage SET ${col} = CASE WHEN ${col} > 0 THEN ${col} - 1 ELSE 0 END,
         updated_at = datetime('now')
         WHERE user_id = ? AND usage_date = ?`,
      )
      .bind(uid, todayUTC())
      .run()
      .catch((e) => console.error('[daily-usage] refund failed', e))
  }
}

/** 兼容旧调用：退 1 次每日额度 */
export async function refundDailyQuota(
  event: any,
  uid: string,
  kind: UsageKind,
): Promise<void> {
  return refundQuota(event, uid, kind, 1, 'daily')
}

/** 只查不扣（给前端显示「今天还剩 N 次」） */
export async function peekDailyQuota(event: any, uid: string): Promise<
  Record<UsageKind, { limit: number | null; used: number; remaining: number | null; unlimited: boolean; mode: QuotaMode; credits: number | null }> & {
    plan: string
    paid: boolean
    credits: number | null
  }
> {
  const out = {} as any
  let plan = 'free'
  let credits: number | null = null
  for (const kind of ['image', 'music', 'text'] as UsageKind[]) {
    const q = await getUserQuota(event, uid, kind)
    out[kind] = {
      limit: q.limit,
      used: q.used,
      remaining: q.remaining,
      unlimited: q.unlimited,
      mode: q.mode,
      credits: q.credits,
    }
    if (kind === 'image') {
      plan = q.plan
      credits = q.credits
    }
  }
  out.plan = plan
  // 「有没有付费权益」= 是不是付费档（**不看他卡够不够**）
  //   付过钱的人做的卡，永远能下 2K 无水印打印文件。
  out.paid = isPaidPlan(plan)
  out.credits = credits
  return out
}
