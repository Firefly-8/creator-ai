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
 */
import { useHead, useRequestURL } from '#imports'

export function useRobots() {
  // SSR 和客户端都能拿到当前请求/页面的 host
  const host = import.meta.client
    ? window.location.hostname
    : useRequestURL().hostname

  const isStaging = host.includes('staging')
    || host.includes('localhost')
    || host.includes('pages.dev')

  useHead({
    meta: [{
      name: 'robots',
      content: isStaging
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    }],
  })
}
