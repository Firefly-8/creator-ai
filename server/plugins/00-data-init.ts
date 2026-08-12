/**
 * 数据初始化插件 — Cloudflare Workers 版本
 * 
 * CF Workers 中不需要初始化文件系统
 * 只需要清理过期任务
 */

export default defineNitroPlugin(() => {
  // CF Workers 不支持 setInterval 持久化，但可以在每次请求时清理
  // 这里仅做日志记录
  console.info('[CraftAI] Worker initialized — D1 + R2 storage active')
})
