/**
 * 运行时 R2 存储桶获取 — 全项目唯一入口
 *
 * Cloudflare Pages（Nitro cloudflare-pages preset）的绑定暴露方式有三条：
 *   1. event.context._platform.cloudflare.env  ← 随每次请求注入，最可靠（已实测）
 *   2. event.context.cloudflare.env            ← 部分 nitro 版本会把 _platform 摊平到
 *                                                context，不保证存在，兜底用
 *   3. globalThis.__env__                       ← Nitro 在 fetch 入口赋值（注意是两个下划线）
 *   4. globalThis.STORAGE                       ← 本模块的缓存位
 *
 * ⚠️ 踩过的坑（2026-10-22 修）：老代码只读 `globalThis.STORAGE`，
 *    而 Nitro 从来不往这个键上写东西 —— 绑定其实一直都在（envPresent.STORAGE = true），
 *    但出图接口 500 "R2 binding not available"。是**取值路径错**，不是绑定没配。
 *
 * 与 db-runtime.ts 是同一套模式，DB / R2 的取值路径保持一致。
 * 其它模块请统一从本文件取 R2，不要再各自实现一套。
 */

import type { H3Event } from 'h3'

/** Cloudflare Pages 上 R2 绑定的名字，需与 Dashboard / wrangler.toml 保持一致 */
export const R2_BINDING_NAME = 'STORAGE'

/** R2 的来源，用于诊断接口展示 */
export type R2Source = 'event-context' | 'global-env' | 'global-cache' | 'none'

export interface R2Resolution {
  bucket: R2Bucket | undefined
  source: R2Source
  available: boolean
}

/**
 * 从 env 对象里读出 R2 桶。
 * 不用 `typeof bucket.get === 'function'` 这种强判断 —— 免得测试替身或
 * 代理对象因为少一个方法被误判成「没绑定」。
 */
function readBinding(env: any): R2Bucket | undefined {
  const bucket = env?.[R2_BINDING_NAME]
  if (!bucket || typeof bucket !== 'object') return undefined
  return bucket as R2Bucket
}

/**
 * 解析 R2 绑定，按可靠性从高到低尝试。
 * 命中后会写入 globalThis.STORAGE 缓存，供无 event 上下文的工具函数使用。
 */
export function resolveR2(event?: H3Event): R2Resolution {
  // 路径 1：event context —— 最可靠，按请求隔离，不会串环境
  const ctx = (event as any)?.context
  const fromEvent =
    readBinding(ctx?._platform?.cloudflare?.env) ||
    readBinding(ctx?.cloudflare?.env)
  if (fromEvent) {
    ;(globalThis as any).STORAGE = fromEvent
    return { bucket: fromEvent, source: 'event-context', available: true }
  }

  // 路径 2：globalThis.__env__ —— Nitro 在 CF Pages 每次 fetch 入口赋值
  const fromGlobalEnv = readBinding((globalThis as any).__env__)
  if (fromGlobalEnv) {
    ;(globalThis as any).STORAGE = fromGlobalEnv
    return { bucket: fromGlobalEnv, source: 'global-env', available: true }
  }

  // 路径 3：已缓存的实例（预热插件或前序请求写入）
  const cached = (globalThis as any).STORAGE || (globalThis as any).__R2_BUCKET__
  if (cached) {
    return { bucket: cached as R2Bucket, source: 'global-cache', available: true }
  }

  return { bucket: undefined, source: 'none', available: false }
}

/**
 * 获取 R2 实例；取不到时返回 undefined（由调用方决定抛错还是降级）
 */
export function getR2(event?: H3Event): R2Bucket | undefined {
  return resolveR2(event).bucket
}

/**
 * 获取 R2 实例；取不到直接抛错（供工具函数内部使用）
 */
export function requireR2(event?: H3Event): R2Bucket {
  const { bucket, source } = resolveR2(event)
  if (!bucket) {
    throw new Error(
      `R2 binding not available (binding "${R2_BINDING_NAME}" missing, source=${source}). ` +
      'Check Cloudflare Pages → Settings → Functions → R2 storage bucket bindings.'
    )
  }
  return bucket
}
