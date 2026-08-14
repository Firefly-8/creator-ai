/**
 * 速率限制 — 基于 Cloudflare KV
 * 
 * 限制规则：
 * - 每个用户每分钟最多 10 次 API 请求
 * - 每个用户每小时最多 100 次生成请求
 * 
 * KV key 格式: ratelimit:{userId}:{window}
 */

const KV_NAMESPACE = 'CACHE'

// 限制配置
const LIMITS = {
  api: { window: 60, max: 10 },        // 10 次/分钟
  generate: { window: 3600, max: 100 }, // 100 次/小时
} as const

type LimitType = keyof typeof LIMITS

/**
 * 检查是否超过速率限制
 * @param userId 用户 ID
 * @param type 限制类型
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export async function checkRateLimit(
  userId: string,
  type: LimitType = 'api'
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = LIMITS[type]
  const kv = (globalThis as any)[KV_NAMESPACE] as KVNamespace | undefined
  
  // KV 不可用时放行（降级）
  if (!kv) {
    return { allowed: true, remaining: config.max, resetAt: 0 }
  }

  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - (now % config.window)
  const key = `ratelimit:${type}:${userId}:${windowStart}`

  try {
    const current = await kv.get(key)
    const count = current ? parseInt(current, 10) || 0 : 0

    if (count >= config.max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: windowStart + config.window,
      }
    }

    // 原子递增（带 TTL）
    await kv.put(key, String(count + 1), {
      expirationTtl: config.window,
    })

    return {
      allowed: true,
      remaining: config.max - count - 1,
      resetAt: windowStart + config.window,
    }
  } catch (err) {
    console.error('[RateLimit] KV error:', err)
    // KV 错误时放行
    return { allowed: true, remaining: config.max, resetAt: 0 }
  }
}

/**
 * 中间件：检查速率限制（用于 API 路由）
 */
export async function rateLimitMiddleware(
  event: any,
  type: LimitType = 'api'
): Promise<void> {
  const auth = event.context.auth
  if (!auth?.uid) return // 未登录不限制（由 auth 中间件处理）

  const result = await checkRateLimit(auth.uid, type)
  
  if (!result.allowed) {
    throw Object.assign(
      new Error('Rate limit exceeded. Please try again later.'),
      {
        statusCode: 429,
        data: {
          retryAfter: result.resetAt - Math.floor(Date.now() / 1000),
          resetAt: result.resetAt,
        },
      }
    )
  }
}
