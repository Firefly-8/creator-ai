/**
 * 客户端路由中间件 — 检查登录状态
 * 未登录用户重定向到首页
 */
export default defineNuxtRouteMiddleware(() => {
  // 不再在中间件中重定向 — 改为在各受保护页面的 onMounted 中检测并弹出 AuthModal
})
