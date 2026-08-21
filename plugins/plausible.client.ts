/**
 * Plausible Analytics — 仅在客户端加载
 * 通过 runtime config 控制是否启用
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const domain = config.public.plausibleDomain

  if (!domain) return

  // 加载 Plausible 脚本
  useHead({
    script: [
      {
        src: 'https://plausible.io/js/script.js',
        defer: true,
        'data-domain': domain,
      },
    ],
  })
})
