/**
 * API 客户端插件 — 全局拦截 $fetch，自动附加 Firebase Token
 * 
 * 此插件修改全局 $fetch 实例，使所有通过 $fetch / useFetch 发出的请求
 * 都自动携带 Firebase Authorization Header。
 */

export default defineNuxtPlugin((nuxtApp) => {
  // 仅在客户端运行
  if (!import.meta.client) return

  // 劫持 $fetch 的全局实例
  const originalFetch = globalThis.$fetch

  // 创建带 auth 的 fetch 实例
  const authFetch = originalFetch.create({
    async onRequest({ options }) {
      if (options.headers?.['Authorization']) return // 已有认证头
      
      try {
        const auth = nuxtApp.$auth
        if (auth?.currentUser) {
          const token = await auth.currentUser.getIdToken()
          if (token) {
            const headers = options.headers || {}
            if (headers instanceof Headers) {
              headers.set('Authorization', `Bearer ${token}`)
            } else if (Array.isArray(headers)) {
              headers.push(['Authorization', `Bearer ${token}`])
            } else {
              (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
            }
            options.headers = headers
          }
        }
      } catch { /* ignore */ }
    },

    async onResponseError({ response }) {
      if (response.status === 401 && import.meta.client) {
        const auth = nuxtApp.$auth
        if (auth?.currentUser) return
        const { openLogin } = useAuthModal()
        openLogin()
      }
    },
  })

  // 替换全局 $fetch
  // 只在请求 /api/* 路径时使用 authFetch，排除 admin API（使用 cookie 认证）
  const wrappedFetch: typeof originalFetch = ((url: string, options?: any) => {
    const urlStr = typeof url === 'string' ? url : url.toString()
    if (urlStr.startsWith('/api/admin/')) {
      return originalFetch(url, options)
    }
    if (urlStr.startsWith('/api/')) {
      return authFetch(url, options)
    }
    return originalFetch(url, options)
  }) as typeof originalFetch

  // 复制 $fetch 的静态属性
  wrappedFetch.raw = originalFetch.raw
  wrappedFetch.create = originalFetch.create
  wrappedFetch.sse = originalFetch.sse

  // 替换全局实例
  ;(globalThis as any).$fetch = wrappedFetch
})
