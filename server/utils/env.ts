/**
 * 运行时环境变量读取
 *
 * ⚠️ 关键事实：**CF Pages 的环境变量是「部署时快照」注入的**
 *   改完 Dashboard 里的 secret，**必须重新部署**才会生效（Dashboard 有 Redeploy 按钮，
 *   或者 push 一个 commit 触发构建）。不是「下一个请求就生效」。
 *
 * 那为什么还要用 globalThis.__env__ 而不是只用 useRuntimeConfig()：
 *   1) globalThis.__env__ 是 CF 运行时注入的 env 对象，值来自 CF 的加密存储；
 *      而 nuxt.config.ts 里的 process.env.XXX 会被**内联进构建产物**，
 *      明文会留在 dist/ 里（谁都能从部署产物里翻出来）。
 *   2) 读 env 只需要一处入口，不用每个模块各写一遍路径探测。
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
  URL_SIGNING_SECRET: 'urlSigningSecret',
  APP_SECRET: 'appSecret',
  NUXT_PUBLIC_SITE_URL: 'public.siteUrl',
  NUXT_PUBLIC_DISABLE_INDEX: 'public.disableIndex',
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
