/**
 * POST /api/ops/alert — 运维端点（多人生成失败告警）
 *
 * 两个用途：
 *   action=test   → 发一封测试邮件到 ALERT_EMAIL_TO
 *                    （配好 secret 后**必须先跑这个**确认 provider/域名/DNS 都对）
 *   action=stats  → 返回最近的生成失败统计（不触发告警）
 *
 * 鉴权：需要 X-Ops-Secret 头匹配 OPS_ALERT_SECRET。
 * ⚠️ 这个端点能发邮件、能看失败流水 —— 没有 secret 就必须是 401。
 *    （它在 auth 中间件的白名单里，因为 Firebase token 跟这个端点无关。）
 */
import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { envString } from '../../utils/env'
import { isAlertConfigured, resolveProvider, resolveRecipients, sendAlert } from '../../utils/alert'
import { collectStats, resolveMonitorConfig } from '../../utils/failure-monitor'

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

  const body = await readBody(event).catch(() => ({}) as any)
  const action = String(body?.action || 'test')

  // ── 当前配置状态 ─────────────────────────────────────
  const provider = resolveProvider(event)
  const recipients = resolveRecipients(event)
  const config = resolveMonitorConfig(event)

  const configStatus = {
    provider,
    configured: isAlertConfigured(event),
    recipients,
    minDistinctUsers: config.minDistinctUsers,
    windowMinutes: config.windowMinutes,
    cooldownMinutes: config.cooldownMinutes,
    countUserErrors: config.countUserErrors,
    site: envString(event, 'NUXT_PUBLIC_SITE_URL', ''),
  }

  if (action === 'stats') {
    const stats = await collectStats(event, config).catch((e) => ({
      error: e?.message || String(e),
    }))
    return { ok: true, config: configStatus, stats }
  }

  // action === 'test' —— 发测试邮件
  const testBody = [
    '这是一封来自 Create Keepsakes 的**告警测试邮件**。',
    '',
    '如果你收到了它，说明告警链路已经通了：',
    '  - provider：' + provider,
    '  - 收件人：' + (recipients.join(', ') || '（未配置）'),
    '  - 站点：' + (configStatus.site || '未知'),
    '',
    '真实的告警会在「最近 ' + config.windowMinutes + ' 分钟内有 ≥ ' +
      config.minDistinctUsers + ' 位不同用户生成失败」时触发，' +
      '同一波故障 ' + config.cooldownMinutes + ' 分钟内只发一封。',
    '',
    '—— 这是一封测试邮件，不是真实故障。',
  ].join('\n')

  const result = await sendAlert(event, {
    subject: '[Create Keepsakes] 告警测试邮件（配置自检）',
    body: testBody,
  })

  return {
    ok: result.ok,
    config: configStatus,
    sent: result.ok,
    reason: result.reason,
    message: result.ok
      ? '测试邮件已发送，去收件箱看看（记得看垃圾箱）'
      : '测试邮件没发出去 —— 原因见 reason',
  }
})
