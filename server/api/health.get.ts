/**
 * GET /api/health — 运行时自检
 *
 * 用来快速判断线上环境是否正常，尤其是：
 *   - D1 绑定是否配置成功（以及从哪条路径拿到的）
 *   - R2 绑定是否配置成功（出图/落盘全靠它，缺了就是 500）
 *   - 关键环境变量是否齐备（只报有无，不报值）
 *   - MiniMax API Key 能否正常解密（密钥链路是否通）
 *
 * 公开端点，不返回任何敏感信息。
 */
import { defineEventHandler } from 'h3'
import { DB_BINDING_NAME, resolveDB } from '../utils/db-runtime'
import { R2_BINDING_NAME, resolveR2 } from '../utils/storage-runtime'

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

export default defineEventHandler(async (event) => {
  const { db, source, available } = resolveDB(event)
  const { bucket, source: r2Source, available: r2Available } = resolveR2(event)
  const env = getRuntimeEnv(event)

  const has = (key: string) => {
    const v = env[key]
    return typeof v === 'string' ? v.length > 0 : v !== undefined && v !== null
  }

  // 验证 MiniMax 密钥链路：主密钥 + 加密后的 API Key 能否解开
  let minimax: { configured: boolean; error: string | null } = {
    configured: false,
    error: null,
  }
  try {
    const { getDecryptedApiKey } = await import('../utils/secureConfig')
    const key = await getDecryptedApiKey()
    minimax = { configured: Boolean(key), error: key ? null : '密钥为空' }
  } catch (err: any) {
    minimax = { configured: false, error: err?.message || String(err) }
  }

  // R2 探针：head 一个**不存在**的 key —— 只读、不写、不留垃圾。
  // 绑定「解析到了」不等于「真能用」：权限/桶配置问题只有真发一次请求才暴露。
  let storageProbe: { ok: boolean; error: string | null } = { ok: false, error: null }
  if (bucket) {
    try {
      await bucket.head('uploads/__healthcheck_probe__.txt')
      storageProbe.ok = true
    } catch (err: any) {
      storageProbe.error = err?.message || String(err)
    }
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
    storage: {
      available: r2Available,
      binding: R2_BINDING_NAME,
      source: r2Source,
      probe: storageProbe,
      error: r2Available
        ? null
        : `R2 binding "${R2_BINDING_NAME}" not found — check Cloudflare Pages → Settings → Functions → R2 storage bucket bindings`,
    },
    env: {
      MINIMAX_API_KEY: has('MINIMAX_API_KEY'),
      ENCRYPTED_MINIMAX_API_KEY: has('ENCRYPTED_MINIMAX_API_KEY'),
      APP_SECRET: has('APP_SECRET'),
      ENCRYPTION_MASTER_KEY: has('ENCRYPTION_MASTER_KEY'),
      MINIMAX_BASE_URL: has('MINIMAX_BASE_URL'),
    },
    minimax,
    // 逐个键报告"有没有值"，不报值本身
    envPresent: Object.fromEntries(
      Object.keys(env)
        .sort()
        .map((k) => [k, has(k)])
    ),
  }
})
