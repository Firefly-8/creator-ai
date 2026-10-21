/**
 * 告警邮件发送
 *
 * ⚠️ 架构约束（决定了为什么不能直接用 nodemailer + smtp.qq.com）：
 *   Cloudflare Workers/Pages **不支持裸 TCP 连接**（没有 net.connect），
 *   所以在 Pages Functions 里没法用 SMTP 客户端直连任何邮箱服务器。
 *   只能走 HTTP 邮件 API。
 *
 *   收件方用 QQ 邮箱完全没问题 —— QQ 只是收信方，跟发信方式无关。
 *
 * 支持的发信方：
 *   resend  —— 免费 3000 封/月 + 100 封/天，需要自己的域名（DNS 三条记录）
 *   brevo   —— 免费 300 封/天，不用自有域名也能发（免费版带品牌标识）
 *   none    —— 只打日志，不真发（本地开发 / CI / 还没配 key 时用）
 *
 * 铁律：
 *   1. 发信失败**绝不能影响主流程** —— 生成本来就失败了，不能再因为邮件服务挂了
 *      让用户等更久或看到别的错误。所有异常在这里被吞掉并打日志。
 *   2. 必须有超时 —— 邮件服务抽风时不能把请求挂住。
 */

import { envList, envString } from './env'

export type AlertProvider = 'resend' | 'brevo' | 'none'

export interface AlertMessage {
  /** 邮件标题 */
  subject: string
  /** 正文（纯文本，QQ 邮箱显示最稳，不会被当营销邮件） */
  body: string
}

export interface SendResult {
  ok: boolean
  provider: AlertProvider
  /** 没发出去的原因（配置缺失 / API 报错） */
  reason?: string
  /** 实际收件人 */
  to?: string[]
}

/** 单封告警的硬超时 —— 8 秒，够发一封邮件，又不会把请求挂死 */
const SEND_TIMEOUT_MS = 8000

/**
 * 解析当前配置的 provider
 */
export function resolveProvider(event: any): AlertProvider {
  const raw = envString(event, 'ALERT_PROVIDER', '').toLowerCase()
  if (raw === 'resend' || raw === 'brevo' || raw === 'none') return raw
  // 没显式配：按有没有 key 猜
  if (envString(event, 'RESEND_API_KEY', '')) return 'resend'
  if (envString(event, 'BREVO_API_KEY', '')) return 'brevo'
  return 'none'
}

/**
 * 当前是否具备真实发信能力
 */
export function isAlertConfigured(event: any): boolean {
  const provider = resolveProvider(event)
  if (provider === 'none') return false
  if (!envList(event, 'ALERT_EMAIL_TO').length) return false
  if (provider === 'resend' && !envString(event, 'RESEND_API_KEY', '')) return false
  if (provider === 'brevo' && !envString(event, 'BREVO_API_KEY', '')) return false
  return true
}

/**
 * 取出收件人（ALERT_EMAIL_TO，逗号分隔）
 */
export function resolveRecipients(event: any): string[] {
  return envList(event, 'ALERT_EMAIL_TO')
}

/**
 * 取出发件人
 */
function resolveFrom(event: any): string {
  return (
    envString(event, 'ALERT_EMAIL_FROM', '') ||
    'Create Keepsakes Alerts <alerts@yozzytools.com>'
  )
}

/**
 * 从 From 头里抠出纯邮箱地址（Brevo 的 sender 字段只要邮箱）
 */
function extractEmail(from: string): string {
  const m = from.match(/<([^>]+)>/)
  return (m ? m[1] : from).trim()
}

/**
 * 发送告警邮件
 *
 * **永远不抛异常** —— 调用方不需要 try/catch。
 */
export async function sendAlert(event: any, msg: AlertMessage): Promise<SendResult> {
  const provider = resolveProvider(event)
  const to = resolveRecipients(event)

  try {
    if (provider === 'none') {
      console.error(
        `[alert] provider=none，未真实发送。\n--- 告警邮件内容 ---\n主题: ${msg.subject}\n${msg.body}`,
      )
      return { ok: false, provider, reason: 'provider disabled or not configured', to }
    }

    if (!to.length) {
      console.error(`[alert] 没有配置 ALERT_EMAIL_TO，告警未发送。主题: ${msg.subject}`)
      return { ok: false, provider, reason: 'ALERT_EMAIL_TO not configured' }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)

    try {
      const res =
        provider === 'resend'
          ? await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${envString(event, 'RESEND_API_KEY', '')}`,
              },
              body: JSON.stringify({
                from: resolveFrom(event),
                to,
                subject: msg.subject,
                text: msg.body,
              }),
              signal: controller.signal,
            })
          : await fetch('https://api.brevo.com/v3/smtp/email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'api-key': envString(event, 'BREVO_API_KEY', ''),
              },
              body: JSON.stringify({
                sender: { email: extractEmail(resolveFrom(event)) },
                to: to.map((email) => ({ email })),
                subject: msg.subject,
                textContent: msg.body,
              }),
              signal: controller.signal,
            })

      const text = await res.text().catch(() => '')

      if (!res.ok) {
        console.error(`[alert] ${provider} 发送失败 ${res.status}: ${text.slice(0, 300)}`)
        return { ok: false, provider, reason: `${provider} HTTP ${res.status}`, to }
      }

      console.log(`[alert] 已发送（${provider}）→ ${to.join(', ')} | ${msg.subject}`)
      return { ok: true, provider, to }
    } finally {
      clearTimeout(timer)
    }
  } catch (err: any) {
    // 邮件服务挂了也不能影响主流程 —— 吞掉，只记日志
    console.error('[alert] 发送告警邮件时出错:', err?.message || err)
    return { ok: false, provider, reason: err?.message || String(err), to }
  }
}
