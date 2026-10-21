#!/usr/bin/env node
/**
 * PayPal 沙箱自检
 *
 * 配好凭据后跑一次，就知道能不能通、账号下有哪些产品和计划。
 *
 * 用法：
 *   node scripts/paypal-check.mjs            # 只检查（token / 产品 / 计划）
 *   node scripts/paypal-check.mjs --create   # 顺便创建本项目需要的产品和计划
 *   node scripts/paypal-check.mjs --order    # 顺便创建一个测试订单（一次性支付）
 *
 * 凭据来源（见 docs/paypal-setup.md）：
 *   PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET   → Dashboard ▸ Apps & Credentials
 *   PAYPAL_SANDBOX=true|false                 → 默认 true（沙箱）
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 读 .env（如果存在）—— 沙箱里没有 process.env 时也能跑 */
function loadEnv() {
  for (const f of ['.env', '.env.local']) {
    const p = join(ROOT, f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i)
      if (!m) continue
      const val = m[2].replace(/^["']|["']$/g, '').trim()
      if (val && !process.env[m[1]]) process.env[m[1]] = val
    }
  }
}
loadEnv()

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || ''
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || ''
const IS_SANDBOX = (process.env.PAYPAL_SANDBOX || 'true') === 'true'
const BASE = IS_SANDBOX ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'

const ARGS = process.argv.slice(2)
const WANT_CREATE = ARGS.includes('--create')
const WANT_ORDER = ARGS.includes('--order')

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  ok: (s) => `\x1b[32m${s}\x1b[0m`,
  bad: (s) => `\x1b[31m${s}\x1b[0m`,
  warn: (s) => `\x1b[33m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`,
}

function fail(msg, hint) {
  console.error(`${C.bad('✗')} ${msg}`)
  if (hint) console.error(`  ${C.dim(hint)}`)
  process.exit(1)
}

async function api(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(method === 'POST' ? { 'PayPal-Request-Id': crypto.randomUUID() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = {}
  try { json = text ? JSON.parse(text) : {} } catch { /* 非 JSON */ }
  if (!res.ok) {
    const detail = json?.details?.[0]?.description || json?.message || text.slice(0, 300)
    const e = new Error(`${method} ${path} → ${res.status}: ${detail}`)
    e.body = json
    throw e
  }
  return json
}

async function main() {
  console.log(C.b('\nPayPal 沙箱自检') + C.dim(`  (${IS_SANDBOX ? 'SANDBOX' : 'LIVE ⚠️ 真实环境'})  ${BASE}\n`))

  if (!CLIENT_ID || !CLIENT_SECRET) {
    fail(
      '缺少 PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET',
      '去 Dashboard ▸ Apps & Credentials ▸ Sandbox ▸ Default Application 复制这两项，写进 .env',
    )
  }
  console.log(`${C.ok('✓')} 凭据已配置  ${C.dim(`Client ID: ${CLIENT_ID.slice(0, 12)}…`)}`)

  // ── 1. token ──
  let token
  try {
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
    const res = await fetch(`${BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body: 'grant_type=client_credentials',
    })
    const json = await res.json()
    if (!res.ok) {
      fail(
        `取 access token 失败：${json?.error_description || json?.error || res.status}`,
        !IS_SANDBOX
          ? '你用的是 LIVE 凭据但接口指向沙箱（或反过来）—— 沙箱/正式凭据不通用'
          : '检查 Client ID / Secret 是否复制完整、有没有多余空格',
      )
    }
    token = json.access_token
    console.log(`${C.ok('✓')} access token 获取成功  ${C.dim(`有效期 ${json.expires_in}s`)}`)
  } catch (e) {
    fail(`网络/请求失败：${e.message}`, '沙箱网络是否可达？试试 curl https://api-m.sandbox.paypal.com')
  }

  // ── 2. 产品 ──
  let products = []
  try {
    const r = await api('GET', '/v1/catalogs/products?page_size=50', null, token)
    products = r.products || []
    console.log(`${C.ok('✓')} 目录下有 ${products.length} 个产品`)
    for (const p of products) {
      console.log(`    ${C.dim('-')} ${p.id}  ${p.name}  ${C.dim(`(${p.type})`)}`)
    }
  } catch (e) {
    console.log(`${C.warn('!')} 列产品失败：${e.message}`)
  }

  // ── 3. 计划 ──
  let plans = []
  try {
    const r = await api('GET', '/v1/billing/plans?page_size=50', null, token)
    plans = r.plans || []
    console.log(`${C.ok('✓')} 有 ${plans.length} 个订阅计划`)
    for (const p of plans) {
      const amt = p.billing_cycles?.[0]?.pricing_scheme?.fixed_price
      console.log(
        `    ${C.dim('-')} ${p.id}  ${p.name}  ${C.dim(
          amt ? `${amt.value} ${amt.currency_code} / ${p.billing_cycles[0].frequency.interval_unit}` : '',
        )}`,
      )
    }
  } catch (e) {
    console.log(`${C.warn('!')} 列计划失败：${e.message}`)
  }

  // ── 4. 可选：创建本项目需要的产品和计划 ──
  if (WANT_CREATE) {
    console.log(C.b('\n创建产品与计划…'))

    // 产品：订阅共用一个
    let productId = products.find(p => p.name === 'Create Keepsakes')?.id
    if (!productId) {
      try {
        const p = await api('POST', '/v1/catalogs/products', {
          name: 'Create Keepsakes',
          description: 'Personalised cards and canvas prints for the people you love.',
          type: 'SERVICE',
          category: 'SOFTWARE',
          home_url: 'https://create.yozzytools.com',
        }, token)
        productId = p.id
        console.log(`${C.ok('✓')} 创建产品 ${productId}`)
      } catch (e) {
        fail(`创建产品失败：${e.message}`)
      }
    } else {
      console.log(`${C.ok('✓')} 复用已有产品 ${productId}`)
    }

    // 订阅计划：$9.99/月（Creator）
    const wantPlans = [
      { name: 'Create Keepsakes Monthly', amount: '9.99', interval: 'MONTH', code: 'CK-MONTHLY-9-99' },
      { name: 'Create Keepsakes Yearly', amount: '99.00', interval: 'YEAR', code: 'CK-YEARLY-99-00' },
    ]
    for (const wp of wantPlans) {
      const exists = plans.find(p => p.name === wp.name)
      if (exists) {
        console.log(`${C.ok('✓')} 已有计划 ${exists.id}  ${wp.name}`)
        continue
      }
      try {
        const p = await api('POST', '/v1/billing/plans', {
          product_id: productId,
          name: wp.name,
          description: `${wp.amount} USD per ${wp.interval.toLowerCase()}`,
          status: 'ACTIVE',
          billing_cycles: [
            {
              frequency: { interval_unit: wp.interval, interval_count: 1 },
              tenure_type: 'REGULAR',
              sequence: 1,
              total_cycles: 0,
              pricing_scheme: { fixed_price: { value: wp.amount, currency_code: 'USD' } },
            },
          ],
          payment_preferences: {
            auto_bill_outstanding: true,
            setup_fee_failure_action: 'CONTINUE',
            payment_failure_threshold: 3,
          },
        }, token)
        console.log(`${C.ok('✓')} 创建计划 ${p.id}  ${wp.name} ($${wp.amount}/${wp.interval})`)
      } catch (e) {
        console.log(`${C.bad('✗')} 创建计划 ${wp.name} 失败：${e.message}`)
      }
    }
  }

  // ── 5. 可选：创建一个测试订单（一次性支付）──
  if (WANT_ORDER) {
    console.log(C.b('\n创建一次性支付测试订单…'))
    try {
      const o = await api('POST', '/v2/checkout/orders', {
        intent: 'CAPTURE',
        purchase_units: [
          {
            description: 'Create Keepsakes — One card',
            amount: { currency_code: 'USD', value: '3.99' },
          },
        ],
      }, token)
      const approve = o.links?.find(l => l.rel === 'approve')?.href
      console.log(`${C.ok('✓')} order id: ${o.id}`)
      console.log(`  批准链接：${approve}`)
      console.log(C.dim('  用沙箱买家账号打开这个链接完成付款，然后调 /api/paypal/order/capture'))
    } catch (e) {
      fail(`创建订单失败：${e.message}`)
    }
  }

  console.log(C.b('\n下一步：') + ' 把 plan id 填进 .env：')
  console.log(C.dim('  PAYPAL_CREATOR_PLAN_ID=P-xxxx     # $9.99/月'))
  console.log(C.dim('  PAYPAL_PRO_PLAN_ID=P-xxxx        # $19.99/月（若要保留）'))
  console.log(C.dim('  PAYPAL_SANDBOX=true'))
  console.log(C.dim('  一次性支付（$3.99 / $19.99）不需要 plan id，Orders v2 直接用金额 ✅\n'))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
