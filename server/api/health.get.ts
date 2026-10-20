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

export default defineEventHandler((event) => {
  const { db, source, available } = resolveDB(event)
  const config = useRuntimeConfig()

  const envChecks = {
    MINIMAX_API_KEY: Boolean(config.minimaxApiKey || process.env.MINIMAX_API_KEY),
    ENCRYPTED_MINIMAX_API_KEY: Boolean(config.encryptedMinimaxApiKey || process.env.ENCRYPTED_MINIMAX_API_KEY),
    APP_SECRET: Boolean(config.appSecret || process.env.APP_SECRET),
    ENCRYPTION_MASTER_KEY: Boolean(config.encryptionMasterKey || process.env.ENCRYPTION_MASTER_KEY),
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
    env: envChecks,
  }
})
