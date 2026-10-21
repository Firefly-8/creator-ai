/**
 * 安全的翻译函数
 *
 * ⚠️ 为什么不用 useI18n() 的 t（2026-10-20 的真实事故）：
 *   Nuxt 的 auto-import 把 `useI18n` 解析到了 **vue-i18n 的原始实现**
 *   （见 .nuxt/imports.d.ts：`export { useI18n } from 'vue-i18n/dist/vue-i18n'`），
 *   而不是 @nuxtjs/i18n 的 runtime 包装版。
 *   原始版在**客户端**、在某些组件（尤其是自动导入的 UI 组件）里
 *   拿不到 provide 下来的 i18n instance，返回的 `t` 不是函数 ——
 *   一渲染就抛 "n.t is not a function"，整页 500，
 *   而 error.vue 的 h1 硬编码 "404"，看起来像路由 404，实际 statusCode 是 500。
 *
 *   SSR 是好的（服务端 @nuxtjs/i18n 会 provide instance），
 *   所以只在 hydration 后炸，极难排查。
 *
 * ✅ `useNuxtApp().$i18n` 是 @nuxtjs/i18n 注入的全局 composer，一定可靠。
 *
 * 用法：
 *   const { t } = useT()
 *   t('nav.login')              // 有 key 用 key
 *   t('nav.login', 'Sign in')   // 没 key 用兜底
 */
export function useT() {
  const { $i18n } = useNuxtApp()

  const t = (key: string, fallback?: string): string => {
    try {
      const v = $i18n.t(key) as unknown
      if (typeof v === 'string' && v && v !== key) return v
    } catch {
      // i18n 不可用时静默降级
    }
    return fallback ?? key
  }

  return { t }
}
