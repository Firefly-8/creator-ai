/**
 * D1 数据库绑定初始化插件
 *
 * Cloudflare Pages 运行时会把 D1 绑定放到 globalThis.__env__ 和
 * event.context._platform.cloudflare.env，这里在 request hook 里提前解析一次，
 * 让后续没有 event 上下文的工具函数也能拿到 DB。
 *
 * 真正的解析逻辑统一放在 server/utils/db-runtime.ts，本文件只负责预热。
 */
import { resolveDB } from '../utils/db-runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    if ((globalThis as any).DB) return // 已设置，跳过
    resolveDB(event)
  })
})
