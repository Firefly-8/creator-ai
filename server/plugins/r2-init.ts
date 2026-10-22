/**
 * R2 存储桶绑定预热插件
 *
 * server/utils/storage.ts 里的工具函数大多拿不到 event 上下文
 * （例如 server/utils/jobs.ts 的后台写入、server/utils/images.ts 的出图落盘），
 * 这里在 request hook 里提前把 R2 解析一次并缓存到 globalThis.STORAGE，
 * 让这些「无 event」的调用也能拿到桶。
 *
 * 真正的解析逻辑统一放在 server/utils/storage-runtime.ts，本文件只负责预热。
 * 解析不到也不抛错 —— 真正的错误在 requireR2() 里抛，错误信息更准。
 */
import { resolveR2 } from '../utils/storage-runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    if ((globalThis as any).STORAGE) return // 已设置，跳过
    resolveR2(event)
  })
})
