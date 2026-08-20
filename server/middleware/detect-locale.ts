/**
 * IP 地域检测中间件
 * 当用户首次访问且未设置语言 cookie 时，根据 Cloudflare 的 cf-ipcountry header
 * 自动建议对应语言（中文用户 → zh）
 */
export default defineEventHandler((event) => {
  // 只处理 HTML 页面请求
  const accept = event.headers.get('accept') || ''
  if (!accept.includes('text/html')) return

  // 如果已经有语言 cookie，不干预
  const cookies = parseCookies(event)
  if (cookies.craftai_locale) return

  // Cloudflare 提供的国家代码
  const country = event.headers.get('cf-ipcountry') || ''

  // 中文使用地区 → 建议中文
  const zhCountries = ['CN', 'TW', 'HK', 'MO', 'SG', 'MY']
  if (zhCountries.includes(country)) {
    // 设置 cookie 但不强制重定向，让前端可以展示提示
    setCookie(event, 'craftai_suggested_locale', 'zh', {
      maxAge: 60 * 60 * 24 * 30, // 30 天
      path: '/',
      httpOnly: false, // 前端 JS 可以读取
      sameSite: 'lax',
    })
  }
})
