/**
 * MiniMax 错误分类
 *
 * ⚠️ 为什么要这个文件：
 *   MiniMax 的业务错误**不是 HTTP 错误**。额度耗尽、余额不足、内容审核拒绝
 *   全部返回 HTTP 200 + body.base_resp.status_code != 0。
 *   以前 image/generate / generate-batch / music/generate 三个入口都只判断
 *   `if (!res.ok)`，于是额度耗尽时会走成「成功但没图」——静默失败，日志里什么都没有。
 *
 *   分类的目的只有一个：**判断这次失败该不该惊动你**。
 *   - user   → 用户自己的锅（prompt 违规、参数非法），不告警
 *   - quota  → 额度/余额类，全站都会挂，必须告警
 *   - system → 上游或我们自己的问题，必须告警
 *   - unknown→ 说不清，保守当 system 告警
 */

/** 失败分类 */
export type FailureCategory = 'user' | 'quota' | 'system' | 'unknown'

/**
 * 用户侧错误 —— 用户的输入有问题，不该打扰运维
 *   1026 输入触发安全审核
 *   1027 输出触发安全审核
 *   2013 参数非法（最常见是 prompt 超 1500 字符）
 */
export const USER_ERROR_CODES = new Set([1026, 1027, 2013])

/**
 * 额度/余额类 —— 一旦发生，全站出图都挂
 *   1008 账户余额不足
 *   2056 Token Plan 额度用尽（5 小时窗口 / 周窗口）
 */
export const QUOTA_ERROR_CODES = new Set([1008, 2056])

/** 已知错误码的人话翻译（给告警邮件用） */
export const ERROR_CODE_LABELS: Record<number, string> = {
  1002: 'Rate limited (too many requests)',
  1004: 'API authentication failed',
  1008: 'Account balance insufficient',
  1024: 'Internal server error',
  1026: 'Input blocked by content policy',
  1027: 'Output blocked by content policy',
  2013: 'Invalid request parameters',
  2045: 'Rate growth limit reached',
  2049: 'Invalid API key',
  2056: 'Token plan quota exhausted',
}

/**
 * 把错误码归类
 *
 * @param code MiniMax base_resp.status_code，或 HTTP 状态码
 */
export function classifyErrorCode(code: number | null | undefined): FailureCategory {
  if (code === null || code === undefined || !Number.isFinite(Number(code))) {
    return 'unknown'
  }
  const c = Number(code)
  if (USER_ERROR_CODES.has(c)) return 'user'
  if (QUOTA_ERROR_CODES.has(c)) return 'quota'
  // HTTP 4xx/5xx 与 MiniMax 业务码（1002/1004/1024/2045/2049…）都算系统侧
  return 'system'
}

/**
 * 判断这个分类该不该触发告警
 *
 * 'user' 类默认排除 —— 用户自己写了个违规 prompt，不该给你发邮件。
 * 但「很多用户同时触发内容审核」也可能是我们的 prompt 模板有问题，
 * 所以留了个开关 ALERT_COUNT_USER_ERRORS 把它们也算进去。
 */
export function shouldAlert(category: FailureCategory, countUserErrors: boolean): boolean {
  if (category === 'user') return countUserErrors
  return true
}

/**
 * 从任意错误对象里挖出错误码
 *
 * 优先用 MiniMaxError.statusCode（我们自己抛的，带精确的 base_resp 码），
 * 其次从消息文本里正则捞（兜底，比如第三方包装过的错误）。
 */
export function extractErrorCode(err: any): number | null {
  // 1) 我们自己的 MiniMaxError
  const direct = err?.statusCode ?? err?.code ?? err?.status_code
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct

  // 2) 从消息文本里捞
  const msg = String(err?.message || err?.statusMessage || '')
  const m = msg.match(/(?:status_code|code|error)\D{0,3}(\d{3,4})/i)
  if (m) {
    const n = Number(m[1])
    if (Number.isFinite(n)) return n
  }

  // 3) HTTP 状态码（"MiniMax error: 503 ..."）
  const http = msg.match(/\b([45]\d{2})\b/)
  if (http) return Number(http[1])

  return null
}

/**
 * 错误码 → 人话
 */
export function describeErrorCode(code: number | null | undefined): string {
  if (code === null || code === undefined) return 'unknown error'
  return ERROR_CODE_LABELS[Number(code)] || `MiniMax error ${code}`
}
