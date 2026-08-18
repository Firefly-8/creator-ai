/**
 * D1 数据库绑定初始化插件
 * 
 * Cloudflare Pages 运行时将 D1 绑定挂载到 globalThis.__env__.DB，
 * 需要手动设置 globalThis.DB 供 API 路由使用。
 */

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', () => {
    if (!(globalThis as any).DB && (globalThis as any).__env__?.DB) {
      ;(globalThis as any).DB = (globalThis as any).__env__.DB
    }
  })
})
