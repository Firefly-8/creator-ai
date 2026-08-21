/**
 * 额度检查工具
 * 控制用户生成次数，防止滥用
 */

import type { D1Database } from '@cloudflare/workers-types'

// 各计划的月度额度
const PLAN_QUOTAS = {
  free: { music: 10, image: 20, lyrics: 10, cover: 5 },
  creator: { music: 100, image: 200, lyrics: 100, cover: 50 },
  pro: { music: 300, image: 500, lyrics: 300, cover: 100 },
} as const

type Plan = keyof typeof PLAN_QUOTAS
type GenerationType = keyof typeof PLAN_QUOTAS.free

/**
 * 检查用户是否有足够额度（传入 used 数量）
 */
export function checkQuota(plan: string, type: string, used: number): { allowed: boolean; remaining: number } {
  const planQuotas = PLAN_QUOTAS[plan as Plan] || PLAN_QUOTAS.free
  const limit = planQuotas[type as GenerationType] || 0
  const remaining = limit - used

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
  }
}

/**
 * 获取计划额度上限
 */
export function getPlanQuota(plan: string, type: string): number {
  const planQuotas = PLAN_QUOTAS[plan as Plan] || PLAN_QUOTAS.free
  return planQuotas[type as GenerationType] || 0
}

/**
 * 获取计划所有额度
 */
export function getAllQuotas(plan: string) {
  return PLAN_QUOTAS[plan as Plan] || PLAN_QUOTAS.free
}

/**
 * 从 DB 获取用户本月实际用量
 */
export async function getMonthlyUsage(d1: D1Database, userId: string): Promise<{ music: number; image: number; lyrics: number; cover: number }> {
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const musicResult = await d1.prepare(
    `SELECT COUNT(*) as count FROM songs WHERE user_id = ? AND created_at >= ? AND type = 'generate'`
  ).bind(userId, monthStart).first<{ count: number }>()

  const coverResult = await d1.prepare(
    `SELECT COUNT(*) as count FROM songs WHERE user_id = ? AND created_at >= ? AND type = 'cover'`
  ).bind(userId, monthStart).first<{ count: number }>()

  const imageResult = await d1.prepare(
    `SELECT COUNT(*) as count FROM generated_images WHERE user_id = ? AND created_at >= ?`
  ).bind(userId, monthStart).first<{ count: number }>()

  const lyricsResult = await d1.prepare(
    `SELECT COUNT(*) as count FROM generations WHERE user_id = ? AND created_at >= ? AND type = 'lyrics'`
  ).bind(userId, monthStart).first<{ count: number }>()

  return {
    music: musicResult?.count || 0,
    image: imageResult?.count || 0,
    lyrics: lyricsResult?.count || 0,
    cover: coverResult?.count || 0,
  }
}

/**
 * 获取用户当前计划
 */
export async function getUserPlan(d1: D1Database, userId: string): Promise<string> {
  const sub = await d1.prepare(
    'SELECT plan FROM subscriptions WHERE user_id = ?'
  ).bind(userId).first<{ plan: string }>()

  return sub?.plan || 'free'
}

/**
 * 完整的额度检查（从 DB 读取）
 */
export async function checkUserQuota(
  d1: D1Database,
  userId: string,
  type: string
): Promise<{ allowed: boolean; remaining: number; limit: number; used: number; plan: string }> {
  const plan = await getUserPlan(d1, userId)
  const usage = await getMonthlyUsage(d1, userId)
  const used = (usage as any)[type] || 0
  const result = checkQuota(plan, type, used)

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    limit: getPlanQuota(plan, type),
    used,
    plan,
  }
}
