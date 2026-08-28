/**
 * D1 数据库绑定初始化插件
 * Cloudflare Pages 运行时将 D1 绑定放到 event.context._platform.cloudflare.env
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    if ((globalThis as any).DB) return // 已设置，跳过
    
    // 尝试多种路径获取 D1 绑定
    const cf = (event as any).context?._platform?.cloudflare
    if (cf?.env?.DB) {
      ;(globalThis as any).DB = cf.env.DB
      return
    }
    
    const env = (globalThis as any).__env__
    if (env?.DB) {
      ;(globalThis as any).DB = env.DB
    }
  })
})
