/**
 * 运行时 D1 数据库获取
 * 
 * 尝试多种方式获取 D1 数据库实例：
 * 1. globalThis.DB（已有值）
 * 2. globalThis.__env__.DB（Cloudflare Pages 运行时）
 * 3. event.context._platform.cloudflare.env.DB（Nitro 上下文）
 */

import type { H3Event } from 'h3'

export function getDB(event?: H3Event): D1Database | undefined {
  // 方式 1: 已设置的 globalThis.DB
  if ((globalThis as any).DB) {
    return (globalThis as any).DB as D1Database
  }

  // 方式 2: Cloudflare Pages __env__
  const env = (globalThis as any).__env__
  if (env?.DB) {
    ;(globalThis as any).DB = env.DB
    return env.DB
  }

  // 方式 3: Nitro 上下文
  if (event) {
    const platform = (event as any).context?._platform
    if (platform?.cloudflare?.env?.DB) {
      ;(globalThis as any).DB = platform.cloudflare.env.DB
      return platform.cloudflare.env.DB
    }
  }

  return undefined
}
