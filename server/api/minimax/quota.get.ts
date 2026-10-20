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

export default defineEventHandler(async (event) => {
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

  // 探测可能的「套餐信息」接口（零成本，用来确认档位）
  const planInfoCandidates = [
    '/v1/token_plan/info',
    '/v1/token_plan/plan',
    '/v1/token_plan/quota',
    '/account/query_plan',
    '/account/plan',
    '/v1/subscription/info',
    '/v1/query_plan_info',
  ]
  const planInfos: any[] = []
  if (getQuery(event).planinfo) {
    for (const p of planInfoCandidates) {
      const r = await probeJson(`${baseUrl}${p}`, key)
      planInfos.push({ path: p, status: r.status, body: r.body, error: r.error })
      if (r.status === 200 && r.body) break
    }
  }

  // 实测：生成 1 张图，看 5 小时窗口额度掉了多少（需带一次性 token）
  let probeResult: any = null
  const probeToken = getQuery(event).probe
  if (probeToken) {
    const before = await probeJson(`${baseUrl}/v1/token_plan/remains`, key)
    const genRes = await fetch(`${baseUrl}/v1/image_generation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'image-01',
        prompt: 'a simple solid blue circle centered on a plain white background, flat vector',
        aspect_ratio: '1:1',
        n: 1,
        response_format: 'url',
        prompt_optimizer: false,
      }),
    })
    const genBody = await genRes.json().catch(() => null)
    const after = await probeJson(`${baseUrl}/v1/token_plan/remains`, key)
    const pct = (r: any) => {
      const m = r?.body?.model_remains?.find((x: any) => x.model_name === 'general')
      return m ? {
        interval: m.current_interval_remaining_percent,
        weekly: m.current_weekly_remaining_percent,
      } : null
    }
    probeResult = {
      genStatus: genRes.status,
      genBaseResp: genBody?.base_resp || null,
      genImageCount: Array.isArray(genBody?.data?.image_urls) ? genBody.data.image_urls.length : 0,
      genError: genBody?.error || null,
      before: pct(before),
      after: pct(after),
    }
  }

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
    planInfos,
    probeResult,
    balances,
    timestamp: new Date().toISOString(),
  }
})
