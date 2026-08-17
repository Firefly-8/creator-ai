/**
 * 后台域名跳转插件
 * 当访问 admin.yozzytools.com 时，自动跳转到 /admin
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return

  const hostname = window.location.hostname
  const isAdminDomain = hostname === 'admin.yozzytools.com' || hostname === 'staging.admin.yozzytools.com'

  if (isAdminDomain) {
    const currentPath = window.location.pathname
    // 如果不在 admin 路径下，跳转到 /admin
    if (!currentPath.startsWith('/admin')) {
      window.location.replace('/admin')
    }
  }
})
