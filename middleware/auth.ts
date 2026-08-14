/**
 * 客户端路由中间件 — 检查登录状态
 * 未登录用户重定向到首页
 */
export default defineNuxtRouteMiddleware((to, from) => {
  // 只在客户端执行
  if (!import.meta.client) return

  const { user, authReady } = useAuth()

  // 等待 auth 状态初始化
  if (!authReady.value) return

  // 未登录则重定向到首页
  if (!user.value) {
    return navigateTo('/')
  }
})
