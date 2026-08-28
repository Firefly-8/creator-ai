/**
 * 运行时 D1 数据库获取
 * Cloudflare Pages 环境直接从 event context 获取 D1 绑定
 */

import type { H3Event } from 'h3'

export function getDB(event?: H3Event): D1Database | undefined {
  // 方式 1: globalThis.DB（由 d1-init 插件设置）
  if ((globalThis as any).DB) {
    return (globalThis as any).DB as D1Database
  }

  // 方式 2: globalThis.__env__.DB（Cloudflare Pages 运行时）
  const env2 = (globalThis as any).__env__
  if (env2?.DB) {
    ;(globalThis as any).DB = env2.DB
    return env2.DB
  }

  // 方式 3: 直接从 event context 获取（最可靠）
  if (event) {
    // Nitro Cloudflare Pages: event.context._platform.cloudflare.env.DB
    const cf = (event as any).context?._platform?.cloudflare
    if (cf?.env?.DB) {
      ;(globalThis as any).DB = cf.env.DB
      return cf.env.DB
    }
    // 备用路径
    if ((event as any).context?.cloudflare?.env?.DB) {
      const db = (event as any).context.cloudflare.env.DB
      ;(globalThis as any).DB = db
      return db
    }
  }

  return undefined
}
