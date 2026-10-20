/**
 * GET /api/health — 运行时自检
 *
 * 用来快速判断线上环境是否正常，尤其是：
 *   - D1 绑定是否配置成功（以及从哪条路径拿到的）
 *   - 关键环境变量是否齐备（只报有无，不报值）
 *
 * 公开端点，不返回任何敏感信息。
 */
import { defineEventHandler } from 'h3'
import { DB_BINDING_NAME, resolveDB } from '../utils/db-runtime'

/**
 * 读运行时的绑定环境。
 * Cloudflare Pages 上是 worker 的 env：globalThis.__env__（Nitro 每次请求设置）
 * 或 event.context._platform.cloudflare.env。
 */
function getRuntimeEnv(event: any): Record<string, any> {
  const cf = event?.context?._platform?.cloudflare?.env
  if (cf) return cf
  return (globalThis as any).__env__ || {}
}

export default defineEventHandler((event) => {
  const { db, source, available } = resolveDB(event)
  const env = getRuntimeEnv(event)

  const has = (key: string) => {
    const v = env[key]
    return typeof v === 'string' ? v.length > 0 : v !== undefined && v !== null
  }

  return {
    ok: true,
    timestamp: new Date().toISOString(),
    database: {
      available,
      binding: DB_BINDING_NAME,
      source,
      error: available
        ? null
        : `D1 binding "${DB_BINDING_NAME}" not found — check Cloudflare Pages → Settings → Functions → D1 database bindings`,
    },
    env: {
      MINIMAX_API_KEY: has('MINIMAX_API_KEY'),
      ENCRYPTED_MINIMAX_API_KEY: has('ENCRYPTED_MINIMAX_API_KEY'),
      APP_SECRET: has('APP_SECRET'),
      ENCRYPTION_MASTER_KEY: has('ENCRYPTION_MASTER_KEY'),
      MINIMAX_BASE_URL: has('MINIMAX_BASE_URL'),
    },
    // 只列 key 名，不列值，方便核对变量到底有没有注入到 worker
    envKeys: Object.keys(env).sort(),
  }
})
