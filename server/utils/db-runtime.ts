/**
 * 运行时 D1 数据库获取 — 全项目唯一入口
 *
 * Cloudflare Pages（Nitro cloudflare-pages preset）的绑定暴露方式只有两条：
 *   1. globalThis.__env__ = env                ← Nitro 在每次 fetch 入口赋值
 *   2. event.context._platform.cloudflare.env  ← 随 localFetch 的 context 注入
 *
 * 注意：`event.context.cloudflare.env` 在该 preset 下**不存在**（Nitro 2.x），
 * 早期版本代码里的这条路径是死路，已移除。
 *
 * 其他模块请统一从本文件取 DB，不要再各自实现一套。
 */

import type { H3Event } from 'h3'

/** Cloudflare Pages 上 D1 绑定的名字，需与 Dashboard / wrangler.toml 保持一致 */
export const DB_BINDING_NAME = 'DB'

/** DB 的来源，用于诊断接口展示 */
export type DBSource = 'event-context' | 'global-env' | 'global-cache' | 'none'

export interface DBResolution {
  db: D1Database | undefined
  source: DBSource
  available: boolean
}

/**
 * 解析 D1 绑定，按可靠性从高到低尝试。
 * 命中后会写入 globalThis.DB 缓存，供无 event 上下文的工具函数使用。
 */
export function resolveDB(event?: H3Event): DBResolution {
  // 路径 1：event context —— 最可靠，按请求隔离，不会串环境
  const cfEnv = (event as any)?.context?._platform?.cloudflare?.env
  if (cfEnv?.[DB_BINDING_NAME]) {
    const db = cfEnv[DB_BINDING_NAME] as D1Database
    ;(globalThis as any).DB = db
    return { db, source: 'event-context', available: true }
  }

  // 路径 2：globalThis.__env__ —— Nitro 在 CF Pages 运行时设置
  // 注意是两个下划线，历史上写成 __env 导致该分支永远不生效
  const globalEnv = (globalThis as any).__env__
  if (globalEnv?.[DB_BINDING_NAME]) {
    const db = globalEnv[DB_BINDING_NAME] as D1Database
    ;(globalThis as any).DB = db
    return { db, source: 'global-env', available: true }
  }

  // 路径 3：已缓存的实例（d1-init 插件或前序请求写入）
  const cached = (globalThis as any).DB
  if (cached) {
    return { db: cached as D1Database, source: 'global-cache', available: true }
  }

  return { db: undefined, source: 'none', available: false }
}

/**
 * 获取 D1 实例；取不到时返回 undefined（由调用方决定抛 503 还是其它）
 */
export function getDB(event?: H3Event): D1Database | undefined {
  return resolveDB(event).db
}

/**
 * 获取 D1 实例；取不到直接抛错（供工具函数内部使用）
 */
export function requireDB(event?: H3Event): D1Database {
  const { db } = resolveDB(event)
  if (!db) {
    throw new Error(
      `D1 database not available: binding "${DB_BINDING_NAME}" is missing. ` +
      'Check Cloudflare Pages → Settings → Functions → D1 database bindings.'
    )
  }
  return db
}
