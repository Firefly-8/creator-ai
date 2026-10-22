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
 *   node scripts/paypal-check.mjs --sync-price  # 把 PayPal 后台的订阅计划价格改成 utils/pricing.ts 里的价
 *
 * ⚠️ 为什么要有 --sync-price：
 *   订阅的**实际扣款金额由 PayPal 后台的 plan 对象决定**，代码里的 price 只是显示用。
 *   提价之后必须把后台那个 plan 的价格一起改掉 ——
 *   否则前端写着 $19.99、用户实际只被扣 $9.99（少收钱 + 虚假宣传）。
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
const WANT_SYNC_PRICE = ARGS.includes('--sync-price')

/**
 * 从 utils/pricing.ts 读价格 —— 脚本不能自己再抄一份（抄一份就会漂）
 */
function readPricing() {
  const src = readFileSync(join(ROOT, 'utils/pricing.ts'), 'utf8')
  const plans = {}
  const blockRe = /id:\s*'(\w+)',\s*name:[\s\S]*?price:\s*([\d.]+),[\s\S]*?cards:\s*(\d+),([\s\S]*?)\n  \},/g
  for (const m of src.matchAll(blockRe)) {
    const [, id, price, cards, tail] = m
    plans[id] = {
      price: Number(price),
      cards: Number(cards),
      interval: tail.match(/interval:\s*'(\w+)'/)?.[1],
    }
  }
  if (!plans.creator || !plans.single) {
    fail('读不到 utils/pricing.ts 里的价格（文件格式变了？）')
  }
  return plans
}

const PRICING = readPricing()

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
  // ⚠️ page_size 上限是 **20**，传 50 会 400：
  //    { field: 'page_size', value: '50', issue: 'INVALID_PARAMETER_VALUE' }
  //    （这是 /v1/billing/plans 的限制，/v1/catalogs/products 允许 50）
  //
  // ⚠️ 这个 bug 有连锁后果：下面 --create 用 plans 数组判断「计划是否已存在」，
  //    plans 永远是空 → 每次 --create 都会重复建一个同名计划。
  let plans = []
  try {
    const r = await api('GET', '/v1/billing/plans?page_size=20', null, token)
    plans = r.plans || []
    console.log(`${C.ok('✓')} 有 ${plans.length} 个订阅计划`)
    for (const p of plans) {
      // ⚠️ 列表接口返回的 plan **不含 billing_cycles**（没有价格！）。
      //    必须再 GET /v1/billing/plans/{id} 拿详情，否则：
      //      - 下面显示不出金额
      //      - 3.5 的「价格一致吗」检查拿到 undefined → 静默跳过 → 少收钱没人拦
      let full = p
      try {
        full = await api('GET', `/v1/billing/plans/${p.id}`, null, token)
      } catch (e) {
        console.log(`${C.warn('!')} 读计划 ${p.id} 详情失败：${e.message}`)
      }
      plans[plans.indexOf(p)] = { ...p, ...full }
      const amt = full.billing_cycles?.[0]?.pricing_scheme?.fixed_price
      console.log(
        `    ${C.dim('-')} ${p.id}  ${p.name}  ${C.dim(
          amt ? `${amt.value} ${amt.currency_code} / ${full.billing_cycles[0].frequency.interval_unit}` : '(价格未知)',
        )}  ${C.dim(p.status)}`,
      )
    }
  } catch (e) {
    console.log(`${C.warn('!')} 列计划失败：${e.message}`)
  }

  // 同名计划可能有一个已被停用（历史遗留）→ 优先挑 ACTIVE 的那个
  const findMonthly = () =>
    plans.find(p => /monthly/i.test(p.name || '') && p.status === 'ACTIVE') ||
    plans.find(p => /monthly/i.test(p.name || ''))

  // ── 3.5 价格对不对？──
  // 订阅的实际扣款金额就是 PayPal 后台 plan 里的价 —— 对不上就是少收钱。
  {
    const want = PRICING.creator.price.toFixed(2)
    const monthly = findMonthly()
    const amt = monthly?.billing_cycles?.[0]?.pricing_scheme?.fixed_price?.value
    if (monthly && amt) {
      if (String(amt) !== want) {
        console.log(
          `${C.bad('✗')} 月付计划价格对不上：PayPal 后台是 $${amt}，代码里是 $${want}`,
        )
        console.log(C.dim('  跑 node scripts/paypal-check.mjs --sync-price 把它改过来'))
      } else {
        console.log(`${C.ok('✓')} 月付计划价格一致（$${amt}）`)
      }
    } else {
      // ⚠️ 查不到价格不能静默放过 —— 静默 = 少收钱没人发现
      console.log(`${C.bad('✗')} 读不到月付计划的实际价格，无法校验（少收钱风险）`)
      console.log(C.dim(`  期望 $${want}；先确认 PAYPAL_CREATOR_PLAN_ID 指向的 plan 是 ACTIVE 的`))
    }
  }

  // ── 4. 可选：把 PayPal 后台的订阅计划价格同步成代码里的价 ──
  if (WANT_SYNC_PRICE) {
    console.log(C.b('\n同步订阅计划价格…'))
    const want = PRICING.creator.price.toFixed(2)
    const monthly = findMonthly()
    if (!monthly) {
      console.log(`${C.bad('✗')} 找不到名为 "Create Keepsakes Monthly" 的计划，先跑 --create`)
    } else {
      const cur = monthly.billing_cycles?.[0]?.pricing_scheme?.fixed_price?.value
      if (String(cur) === want) {
        console.log(`${C.ok('✓')} 已经是 $${want}，不用改`)
      } else {
        try {
          // ⚠️ billing_cycles **不能 PATCH**（PayPal 只允许改 description /
          //    name / payment_preferences.* / taxes.percentage）。
          //    改价必须走 POST /v1/billing/plans/{id}/update-pricing-schemes。
          //    （之前这里用 PATCH + billing_cycles，永远 400/422 —— 那条路径
          //     正是为了防「前端显示 $19.99、实际只扣 $9.99」而写的，坏了等于没防。）
          const seq = monthly.billing_cycles?.[0]?.sequence || 1
          await api(
            'POST',
            `/v1/billing/plans/${monthly.id}/update-pricing-schemes`,
            {
              pricing_schemes: [
                {
                  billing_cycle_sequence: seq,
                  pricing_scheme: { fixed_price: { value: want, currency_code: 'USD' } },
                },
              ],
            },
            token,
          )
          console.log(`${C.ok('✓')} ${monthly.id} 价格已改成 $${want}（原来 $${cur}）`)
          console.log(C.dim('  注意：已有订阅者通常在**下一个周期**才按新价扣款（PayPal 的行为）'))
        } catch (e) {
          console.log(`${C.bad('✗')} 改价失败：${e.message}`)
          console.log(C.dim('  PayPal 有时不允许直接改价 —— 那就新建一个计划，改环境变量 PAYPAL_CREATOR_PLAN_ID'))
        }
      }
    }
  }

  // ── 5. 可选：创建本项目需要的产品和计划 ──
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

    // 订阅计划（金额来自 utils/pricing.ts —— 改价只改那一处）
    const wantPlans = [
      {
        name: 'Create Keepsakes Monthly',
        amount: PRICING.creator.price.toFixed(2),
        interval: 'MONTH',
        code: `CK-MONTHLY-${PRICING.creator.price.toFixed(2).replace('.', '-')}`,
      },
    ]
    for (const wp of wantPlans) {
      // 只认 ACTIVE 的 —— 历史上被停用的同名计划不算「已存在」，
      // 否则会把新的有效计划判成重复
      const exists = plans.find(p => p.name === wp.name && p.status === 'ACTIVE')
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
            amount: { currency_code: 'USD', value: PRICING.single.price.toFixed(2) },
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
  console.log(C.dim(`  PAYPAL_CREATOR_PLAN_ID=P-xxxx     # $${PRICING.creator.price.toFixed(2)}/月`))
  console.log(C.dim('  PAYPAL_SANDBOX=true'))
  console.log(
    C.dim(
      `  一次性支付（$${PRICING.single.price.toFixed(2)} / $${PRICING.lifetime.price.toFixed(2)}）` +
        '不需要 plan id，Orders v2 直接用金额 ✅\n',
    ),
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
