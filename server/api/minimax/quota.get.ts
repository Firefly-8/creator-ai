/**
 * GET /api/minimax/quota — MiniMax 账户额度只读自检
 *
 * 目的：搞清楚当前 API Key 到底是「订阅制 Token Plan (sk-cp-)」还是「按量计费 (sk-api-)」，
 * 因为两者的限额机制完全不同：
 *   - Token Plan：5 小时滚动窗口 / 每日 / 每周多套配额
 *   - 按量计费：无窗口限制，只受账户余额与 RPM 限制
 *
 * 安全：只输出额度摘要与账户类型，绝不输出 API Key 明文。
 */
import { defineEventHandler } from 'h3'
import { getDecryptedApiKey, getMiniMaxBaseUrl } from '../../utils/secureConfig'

/** 只暴露 key 的类型与长度，不暴露任何字符内容 */
function classifyKey(key: string) {
  if (key.startsWith('sk-cp-')) return 'token_plan'
  if (key.startsWith('sk-api-')) return 'pay_as_you_go'
  if (key.startsWith('sk-')) return 'sk_unknown'
  return 'unknown'
}

async function probeJson(url: string, key: string) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${key}` },
    })
    const body = await res.json().catch(() => null)
    return { status: res.status, body }
  } catch (err: any) {
    return { status: 0, error: err?.message || String(err) }
  }
}

export default defineEventHandler(async () => {
  let key = ''
  try {
    key = await getDecryptedApiKey()
  } catch (err: any) {
    return { ok: false, error: `无法解密 API Key: ${err?.message || String(err)}` }
  }

  const baseUrl = getMiniMaxBaseUrl()
  const kind = classifyKey(key)

  // 订阅制额度：5 小时窗口 / 每日 / 每周
  const plan = await probeJson(`${baseUrl}/v1/token_plan/remains`, key)

  // 按量计费余额（两种历史路径都试）
  const balanceCandidates = [
    `${baseUrl}/account/query_balance`,
    `${baseUrl}/v1/query_balance`,
  ]
  const balances: any[] = []
  for (const url of balanceCandidates) {
    const r = await probeJson(url, key)
    balances.push({ url: url.replace(baseUrl, ''), status: r.status, body: r.body, error: r.error })
    if (r.status === 200 && r.body) break
  }

  return {
    ok: true,
    baseUrl,
    keyKind: kind,
    keyLength: key.length,
    plan,
    balances,
    timestamp: new Date().toISOString(),
  }
})
