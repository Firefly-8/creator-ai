/**
 * robots meta —— 全站生效
 *
 * ⚠️ 之前有个隐蔽的 bug：useHead() 被写在 onMounted 回调里。
 *   Nuxt 的 useHead 依赖 inject 拿 head 实例，而 inject 只能在
 *   setup 的**同步**阶段调用 —— 在 onMounted 里调会抛错，
 *   导致整个使用 default 布局的页面在客户端 hydration 后变成 500
 *   （error.vue 的 h1 硬编码 "404"，看起来像 404，实际 statusCode 500）。
 *   生产的 /gallery 早就是这个状态，只是没人点进去看。
 *
 * 现在改成在 setup 顶层调用，用 computed 跟随环境变化。
 *
 * ⚠️ 判断逻辑和 /robots.txt **必须一致** → 都走 `utils/robots.ts`：
 *   env var NUXT_PUBLIC_DISABLE_INDEX 优先，hostname 兜底。
 *   （以前这里是 hostname 判断、robots.txt 是 env var 判断 → 两边会打架）
 */
import { useHead, useRequestURL } from '#imports'
import { shouldDisallowIndex, INDEX_META, NOINDEX_META } from '~/utils/robots'

export function useRobots() {
  // SSR 和客户端都能拿到当前请求/页面的 host
  const host = import.meta.client
    ? window.location.hostname
    : useRequestURL().hostname

  // NUXT_PUBLIC_* 会被内联进客户端产物（构建时快照）
  const envValue = useRuntimeConfig().public.disableIndex as string | undefined

  const noindex = shouldDisallowIndex(host, envValue)

  useHead({
    meta: [{
      name: 'robots',
      content: noindex ? NOINDEX_META : INDEX_META,
    }],
  })
}
