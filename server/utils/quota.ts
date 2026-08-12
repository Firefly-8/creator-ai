/**
 * 额度检查工具
 * 控制用户生成次数，防止滥用
 */

// 各计划的月度额度
const PLAN_QUOTAS = {
  free: { music: 10, image: 20, lyrics: 10, cover: 5 },
  creator: { music: 100, image: 200, lyrics: 100, cover: 50 },
  pro: { music: 300, image: 500, lyrics: 300, cover: 100 },
} as const

type Plan = keyof typeof PLAN_QUOTAS
type GenerationType = keyof typeof PLAN_QUOTAS.free

/**
 * 检查用户是否有足够额度
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
