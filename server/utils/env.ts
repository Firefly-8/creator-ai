/**
 * 运行时环境变量读取
 *
 * ⚠️ 为什么不用 useRuntimeConfig()：
 *   nuxt.config.ts 里全是 `process.env.XXX || ''` —— 那是**构建期**内联进产物的。
 *   改完 CF Pages 的 secret 后，不重新部署就读不到新值。
 *   而 globalThis.__env__ 是 Nitro 在**每次请求**时赋值的真实运行时 env，
 *   改完 secret 下一个请求就生效 ✅
 *
 * 优先级：event context > globalThis.__env__ > runtimeConfig（构建期内联的兜底）
 *
 * 路径说明（Nitro 2.13 cloudflare-pages preset 只有两条是真的）：
 *   - event.context._platform.cloudflare.env  ✅
 *   - globalThis.__env__                      ✅
 *   - event.context.cloudflare.env            ❌ 不存在，走这条必 500
 */

/** env 名 → runtimeConfig 键名（构建期内联的兜底用） */
const RUNTIME_CONFIG_KEYS: Record<string, string> = {
  ALERT_EMAIL_TO: 'alertEmailTo',
  ALERT_EMAIL_FROM: 'alertEmailFrom',
  ALERT_PROVIDER: 'alertProvider',
  RESEND_API_KEY: 'resendApiKey',
  BREVO_API_KEY: 'brevoApiKey',
  ALERT_MIN_DISTINCT_USERS: 'alertMinDistinctUsers',
  ALERT_WINDOW_MINUTES: 'alertWindowMinutes',
  ALERT_COOLDOWN_MINUTES: 'alertCooldownMinutes',
  ALERT_COUNT_USER_ERRORS: 'alertCountUserErrors',
  OPS_ALERT_SECRET: 'opsAlertSecret',
  NUXT_PUBLIC_SITE_URL: 'public.siteUrl',
}

/**
 * 取运行时 env 快照
 */
export function getEnvSource(event?: any): Record<string, any> {
  // 路径 1：event context —— 按请求隔离，最可靠
  const cf = event?.context?._platform?.cloudflare?.env
  if (cf && typeof cf === 'object') return cf

  // 路径 2：globalThis.__env__ —— Nitro 每次请求赋值
  const globalEnv = (globalThis as any).__env__
  if (globalEnv && typeof globalEnv === 'object') return globalEnv

  return {}
}

/**
 * 读一个字符串型 env，带兜底
 */
export function envString(event: any, key: string, fallback = ''): string {
  const src = getEnvSource(event)
  const v = src?.[key]
  if (typeof v === 'string' && v.length > 0) return v

  // 兜底：构建期内联进产物的 runtimeConfig
  const rcKey = RUNTIME_CONFIG_KEYS[key]
  if (rcKey) {
    try {
      const cfg = useRuntimeConfig() as any
      const rc = rcKey.startsWith('public.')
        ? cfg?.public?.[rcKey.slice('public.'.length)]
        : cfg?.[rcKey]
      if (typeof rc === 'string' && rc.length > 0) return rc
    } catch {
      // 单元测试环境没有 runtimeConfig —— 正常，走 fallback
    }
  }

  return fallback
}

/**
 * 读一个数字型 env
 */
export function envNumber(event: any, key: string, fallback: number): number {
  const raw = envString(event, key, '')
  if (!raw) return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

/**
 * 读一个布尔型 env（'1' / 'true' / 'yes' 都算 true）
 */
export function envBool(event: any, key: string, fallback = false): boolean {
  const raw = envString(event, key, '').toLowerCase()
  if (!raw) return fallback
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}

/**
 * 读一个逗号分隔的列表
 */
export function envList(event: any, key: string): string[] {
  return envString(event, key, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
