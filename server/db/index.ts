/**
 * D1 数据库客户端
 * Cloudflare Workers 使用 Drizzle ORM + D1
 */

import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

// 在 Cloudflare Workers 环境中使用 D1 绑定
export function getD1Database(d1Binding: D1Database) {
  return drizzle(d1Binding, { schema })
}

export { schema }
export * from './schema'
