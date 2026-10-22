/**
 * POST /api/ops/storage — R2 存储自检
 *
 * 做一次真实的「写 → 读 → 删」回环，用来回答一个问题：
 * **R2 绑定到底是没配，还是配了但代码取不到？**
 *
 * 2026-10-22 出过一次这样的事故：出图接口 500 "R2 binding not available"，
 * 但绑定其实一直都在（Dashboard / env 里都有 STORAGE），
 * 是代码只读 globalThis.STORAGE 而 Nitro 从不往那个键上写东西。
 * 光看「绑定在不在」不够 —— 权限、桶配置问题只有真发一次请求才暴露。
 *
 * 鉴权：需要 X-Ops-Secret 头匹配 OPS_ALERT_SECRET（与 /api/ops/alert 同一套）。
 * 它在 auth 中间件的白名单里，因为 Firebase token 跟这个端点无关。
 */
import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { envString } from '../../utils/env'
import { resolveR2 } from '../../utils/storage-runtime'

/** 简易常量时间比较（避免密钥被逐字节试探） */
function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export default defineEventHandler(async (event) => {
  // ── 鉴权 ──────────────────────────────────────────────
  const secret = envString(event, 'OPS_ALERT_SECRET', '')
  const provided = String(getHeader(event, 'x-ops-secret') || '')

  if (!safeEqual(provided, secret)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or missing X-Ops-Secret' })
  }

  const { bucket, source, available } = resolveR2(event)

  if (!bucket) {
    return {
      ok: false,
      available: false,
      source,
      error:
        `R2 binding not available（source=${source}）—— ` +
        '检查 Cloudflare Pages → Settings → Functions → R2 storage bucket bindings',
    }
  }

  // ── 真实回环：写 → 读 → 删 ────────────────────────────
  const key = `uploads/__ops_probe_${Date.now()}.txt`
  const payload = `ops-probe ${new Date().toISOString()}`

  const steps: Record<string, string> = {}
  try {
    await bucket.put(key, payload, { httpMetadata: { contentType: 'text/plain' } })
    steps.put = 'ok'

    const head = await bucket.head(key)
    steps.head = head ? 'ok' : 'missing'

    const obj = await bucket.get(key)
    const text = obj ? await obj.text() : ''
    steps.get = text === payload ? 'ok' : 'content-mismatch'

    await bucket.delete(key)
    steps.delete = 'ok'

    const after = await bucket.head(key)
    steps.cleanup = after === null ? 'ok' : 'still-exists'

    const ok = Object.values(steps).every((s) => s === 'ok')
    return { ok, available: true, source, steps, key }
  } catch (err: any) {
    // 失败也要尽量清掉探针文件，别在桶里留垃圾
    try {
      await bucket.delete(key)
      steps.cleanup = 'ok'
    } catch {
      steps.cleanup = 'failed'
    }
    return {
      ok: false,
      available: true,
      source,
      steps,
      error: err?.message || String(err),
    }
  }
})
