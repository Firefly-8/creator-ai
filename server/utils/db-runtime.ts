/**
 * 运行时 D1 数据库获取
 * Cloudflare Pages 环境直接从 event context 获取 D1 绑定
 */

import type { H3Event } from 'h3'

export function getDB(event?: H3Event): D1Database | undefined {
  console.log('[DB-Runtime] getDB called')

  // 方式 1: globalThis.DB（由 d1-init 插件设置）
  if ((globalThis as any).DB) {
    console.log('[DB-Runtime] Found DB via globalThis.DB')
    return (globalThis as any).DB as D1Database
  }

  // 方式 2: globalThis.__env__.DB（Cloudflare Pages 运行时）
  const env2 = (globalThis as any).__env__
  if (env2?.DB) {
    console.log('[DB-Runtime] Found DB via globalThis.__env__.DB')
    ;(globalThis as any).DB = env2.DB
    return env2.DB
  }

  // 方式 3: 直接从 event context 获取（最可靠）
  if (event) {
    console.log('[DB-Runtime] Checking event.context...')
    console.log('[DB-Runtime] event.context keys:', Object.keys((event as any).context || {}))

    // Nitro Cloudflare Pages: event.context._platform.cloudflare.env.DB
    const cf = (event as any).context?._platform?.cloudflare
    console.log('[DB-Runtime] _platform.cloudflare:', cf ? 'exists' : 'null/undefined')
    if (cf?.env?.DB) {
      console.log('[DB-Runtime] Found DB via _platform.cloudflare.env.DB')
      ;(globalThis as any).DB = cf.env.DB
      return cf.env.DB
    }
    // 备用路径
    if ((event as any).context?.cloudflare?.env?.DB) {
      console.log('[DB-Runtime] Found DB via context.cloudflare.env.DB')
      const db = (event as any).context.cloudflare.env.DB
      ;(globalThis as any).DB = db
      return db
    }
  }

  console.log('[DB-Runtime] No DB found, returning undefined')
  return undefined
}
