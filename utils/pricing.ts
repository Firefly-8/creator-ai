/**
 * 定价的**唯一真相源**（2026-10-21 提价 + 付费额度语义重构）
 *
 * ⚠️ 为什么必须有这个文件：
 *   之前价格散在 4 个地方（order.post.ts / plans.get.ts / pricing.vue / index.vue）。
 *   改一次价要同时改 4 个文件，漏一个就是「前端显示 A、实际收 B」——
 *   PayPal 审核和用户投诉都是这么来的。现在所有地方都从这里读。
 *
 * ⚠️ 订阅的价格还有一个**不在代码里**的地方：
 *   订阅走 PayPal 的 **Plan 对象**，实际扣多少由 PayPal 后台那个 plan 决定，
 *   代码里的 price 对订阅来说只是**显示用**。
 *   → 提价后必须同步改 PayPal 后台的 plan 价格，否则前端显示 $19.99、
 *     实际只扣 $9.99（少收钱 + 虚假宣传）。
 *     同步脚本：node scripts/paypal-check.mjs --sync-price
 *
 * 档位梯度（2026-11-20 按原型稿改为「积分制」口径）：
 *   单张      $6.99  → 1 积分
 *   月付      $19.99 → 200 积分
 *   买断 20 张 $59.99 → 20 积分
 *   ⚠️ 用户口径：月付给 200 积分（一次生成扣 1），PayPal 扣款金额不变。
 *      代价：月付单价 $0.10 远低于买断 $3.00 —— 买断包不再有价格优势。
 *      这是产品决策，不是笔误；改回梯度只需把下面的 creator.cards 调回 5。
 */

export type PlanId = 'free' | 'single' | 'creator' | 'lifetime'
export type PlanKind = 'free' | 'one_time' | 'subscription'

/** 额度种类（图片 / 音乐 / 文案） */
export type UsageKind = 'image' | 'music' | 'text'

export interface PlanDef {
  id: PlanId
  name: string
  kind: PlanKind
  /** 美元金额（订阅仅用于显示 —— 实际扣款以 PayPal plan 为准） */
  price: number
  currency: 'USD'
  /** 一次付清能做的张数（订阅是「每个周期发这么多张」） */
  cards: number
  /** 计费周期（仅 subscription） */
  interval?: 'month'
  /** PayPal 订单描述 */
  label: string
  description: string
  /** 按钮上的字 */
  cta: string
  features: string[]
  /** 是否是主推档 */
  popular?: boolean
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: 'free',
    name: 'Free',
    kind: 'free',
    price: 0,
    currency: 'USD',
    cards: 0,
    label: 'Free preview',
    description: 'Try it out. No card needed.',
    cta: 'Start free',
    features: [
      '3 free generations in total — no daily reset',
      'One card per generation',
      '1024 px download',
      'Small mark on the file',
      'Your photos stay private',
    ],
  },
  single: {
    id: 'single',
    name: 'One card',
    kind: 'one_time',
    price: 6.99,
    currency: 'USD',
    cards: 1,
    label: 'One card',
    description: 'One card, printed and ready.',
    cta: 'Buy one card',
    features: [
      '1 card — yours forever',
      '2K, no watermark',
      '300 DPI print file (5×7 / 4×6 / A6)',
    ],
  },
  creator: {
    id: 'creator',
    name: 'Monthly',
    kind: 'subscription',
    price: 19.99,
    currency: 'USD',
    cards: 200,
    interval: 'month',
    label: 'Monthly plan (200 credits a month)',
    description: 'For when it is your turn to send one.',
    cta: 'Get Monthly',
    popular: true,
    features: [
      '200 credits every month',
      '2K, no watermark',
      '300 DPI print file',
      'Canvas prints (16×20 / A3)',
      'Cancel any time',
    ],
  },
  lifetime: {
    id: 'lifetime',
    name: 'One-off pack',
    kind: 'one_time',
    price: 59.99,
    currency: 'USD',
    cards: 20,
    label: 'One-off pack (20 cards)',
    description: 'For the person who makes a few cards a year.',
    cta: 'Pay once — 20 cards',
    features: [
      '20 cards — no expiry',
      '2K, no watermark',
      '300 DPI print file',
      'Canvas prints (16×20 / A3)',
      'One payment, done',
    ],
  },
}

/** 付费档（免费档之外的都算） */
export const PAID_PLAN_IDS: PlanId[] = ['single', 'creator', 'lifetime']

/**
 * 历史档位别名（旧数据 / 旧环境变量还要认）
 *
 * ⚠️ 'pro' 原来是一个「20 张/月」的订阅档（PLAN_CARDS.pro = 20），
 *    但定价页从来没展示过它，PayPal 后台大概率也没建对应的 plan。
 *    现在统一按 'creator'（5 张/月）处理。
 */
export const PLAN_ALIASES: Record<string, PlanId> = {
  pro: 'creator',
}

export const PLAN_LIST: PlanDef[] = [
  PLANS.free,
  PLANS.single,
  PLANS.creator,
  PLANS.lifetime,
]

/** 是不是付费档 */
export function isPaidPlan(plan: string | null | undefined): boolean {
  if (!plan) return false
  const id = resolvePlanId(plan)
  return !!id && PAID_PLAN_IDS.includes(id)
}

/** 把别名/历史值解析成规范档位 id；不认识返回 undefined */
export function resolvePlanId(id: string | null | undefined): PlanId | undefined {
  if (!id) return undefined
  if (id in PLANS) return id as PlanId
  return PLAN_ALIASES[id]
}

/** 取档位定义 */
export function getPlan(id: string | null | undefined): PlanDef | undefined {
  const pid = resolvePlanId(id)
  return pid ? PLANS[pid] : undefined
}

/** 金额转成 PayPal 要的字符串（'6.99'） */
export function planAmount(id: string): string {
  const p = getPlan(id)
  if (!p) throw new Error(`Unknown plan: ${id}`)
  return p.price.toFixed(2)
}

/** 该档位一次付清给几张卡（订阅 = 每个周期给几张） */
export function planCards(id: string): number {
  return getPlan(id)?.cards ?? 0
}

/**
 * 免费额度。
 *
 * ⚠️ 2026-11-20 按原型稿改：图片从「2 次/天（每日重置）」改成「注册送 3 次、用完为止」。
 *    image 用 `usage_date = LIFETIME_SENTINEL` 的行累计，永不按天重置（见 server/utils/daily-usage.ts）。
 *    music / text 仍是按天的每日额度（这两类不是本次改造范围）。
 *
 * 为什么免费 3 次不影响付费：
 *   免费出的是**带水印的 1024px 预览图** —— 好看但不能印。
 *   付费点是无水印 + 2K + 300 DPI 打印规格，不是「次数」。
 */
export const FREE_DAILY_LIMITS: Record<UsageKind, { unverified: number; verified: number }> = {
  // 两条都设 3：新规则不再区分邮箱是否验证（都送 3 次）。
  // unverified 保留字段是为了兼容 music/text 共用结构，image 实际读 verified 值。
  image: { unverified: 3, verified: 3 },
  music: { unverified: 1, verified: 1 },
  text: { unverified: 3, verified: 10 },
}

/** 免费图片「累计 3 次」用的哨兵日期——占 daily_usage.usage_date 一个固定槽位，不随 UTC 日期变 */
export const LIFETIME_SENTINEL = '__lifetime__'

// 2026-11-23 起一次固定出 1 张，不再有「单次张数上限」概念。
// 原先免费/付费档各有一个「单次最多几张」的常量，已随「一次几张」选项一并移除。

/**
 * 付费用户每天的额度（**只有文案和音乐**，图片走 credits）
 *
 * 为什么付费不是全无限：
 *   音乐和文案是 MiniMax 的真金白银调用，完全不限等于白送。
 *   给一个够用但不封顶的上限：一天 5 首歌、50 条文案。
 */
export const PAID_DAILY_LIMITS: Record<UsageKind, { unverified: number; verified: number }> = {
  // 图片不占每日额度 —— 付费用户用 credits 结算
  image: { unverified: 0, verified: 0 },
  music: { unverified: 5, verified: 5 },
  text: { unverified: 50, verified: 50 },
}
