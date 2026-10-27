/**
 * 定价的守卫测试
 *
 * ⚠️ 这组测试存在的理由（2026-10-21 提价时踩的坑）：
 *   价格以前散在 4 个文件里，改一次要改 4 处，漏一处就是
 *   「前端显示 A、实际收 B」。现在价格只有 utils/pricing.ts 一个真相源，
 *   这组测试就是防止它再散开、防止假承诺再回来。
 *
 * 覆盖：
 *   - 价格只有一个真相源
 *   - 梯度合理（买得越多单价越低，但不能便宜到单张卖不动）
 *   - 定价页没有假承诺（跟实现对不上的文案 = 虚假宣传）
 *   - 前端显示价 == 服务端收价
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  PLANS,
  PLAN_LIST,
  PAID_DAILY_LIMITS,
  FREE_DAILY_LIMITS,
  isPaidPlan,
  resolvePlanId,
  planAmount,
  planCards,
  FREE_MAX_IMAGES_PER_RUN,
  PAID_MAX_IMAGES_PER_RUN,
} from '../utils/pricing'

const ROOT = join(__dirname, '..')
function read(p: string) {
  return readFileSync(join(ROOT, p), 'utf8')
}

/** 会被当成「硬编码价格」的源码文件（定价页之外的营销文案也算） */
const SOURCE_FILES = [
  'pages/pricing.vue',
  'pages/index.vue',
  'server/api/subscriptions/plans.get.ts',
  'server/api/paypal/order.post.ts',
  'server/api/paypal/order/capture.post.ts',
  'server/api/subscriptions/activate.post.ts',
]

describe('定价单一真相源', () => {
  it('三档 + 免费档，价格都是数', () => {
    expect(PLANS.single.price).toBe(6.99)
    expect(PLANS.creator.price).toBe(19.99)
    expect(PLANS.lifetime.price).toBe(59.99)
    expect(PLANS.free.price).toBe(0)
  })

  it('张数对：单张 1 / 月付 5 / 买断 20', () => {
    expect(PLANS.single.cards).toBe(1)
    expect(PLANS.creator.cards).toBe(5)
    expect(PLANS.lifetime.cards).toBe(20)
  })

  it('服务端下单价用同一个函数，不会出现两位小数丢精度', () => {
    expect(planAmount('single')).toBe('6.99')
    expect(planAmount('creator')).toBe('19.99')
    expect(planAmount('lifetime')).toBe('59.99')
    expect(planCards('lifetime')).toBe(20)
  })

  it('付费档判定：free 不算，付费的都算', () => {
    expect(isPaidPlan('free')).toBe(false)
    expect(isPaidPlan(null)).toBe(false)
    expect(isPaidPlan('single')).toBe(true)
    expect(isPaidPlan('creator')).toBe(true)
    expect(isPaidPlan('lifetime')).toBe(true)
    // 历史别名
    expect(resolvePlanId('pro')).toBe('creator')
    expect(isPaidPlan('pro')).toBe(true)
  })

  it('定价页 / plan 接口 / 下单接口都从 pricing.ts 读', () => {
    expect(read('pages/pricing.vue')).toContain("from '~/utils/pricing'")
    expect(read('server/api/subscriptions/plans.get.ts')).toContain("from '../../../utils/pricing'")
    expect(read('server/api/paypal/order.post.ts')).toContain("from '../../../utils/pricing'")
  })

  it('源码里不能再出现硬编码的旧价格（$3.99 / $9.99 / $19.99）', () => {
    // 这些是旧价。留一个 = 前端显示和实际收钱会对不上。
    const stale = [/\$\s*3\.99/, /\$\s*9\.99/, /\$\s*19\.99/, /price:\s*3\.99/, /price:\s*9\.99/, /price:\s*19\.99/]
    for (const f of SOURCE_FILES) {
      const src = read(f)
      for (const re of stale) {
        expect(`${f} :: ${re} :: ${src.match(re)?.[0] || ''}`).not.toMatch(re)
      }
    }
  })

  it('plan 接口不再手写一份价格表', () => {
    const src = read('server/api/subscriptions/plans.get.ts')
    expect(src).toContain('PLAN_LIST')
    expect(src).not.toMatch(/price:\s*\d/)
  })
})

describe('价格梯度', () => {
  it('买得越多单价越低（否则单张卖不动）', () => {
    const perCardSingle = PLANS.single.price / PLANS.single.cards
    const perCardMonthly = PLANS.creator.price / PLANS.creator.cards
    const perCardPack = PLANS.lifetime.price / PLANS.lifetime.cards

    expect(perCardMonthly).toBeLessThan(perCardSingle)
    expect(perCardPack).toBeLessThan(perCardMonthly)
  })

  it('买断包不能便宜到离谱（否则白送）', () => {
    // 之前买断 20 张是 $1.00/张，单张 $3.99 —— 便宜 75%，单张根本没人买
    const ratio = (PLANS.lifetime.price / PLANS.lifetime.cards) / PLANS.single.price
    expect(ratio).toBeGreaterThan(0.3)
    expect(ratio).toBeLessThan(0.8)
  })

  it('月付比买断单张便宜，但比买断包贵（引导买包）', () => {
    expect(PLANS.creator.price).toBeGreaterThan(PLANS.single.price)
    expect(PLANS.lifetime.price).toBeGreaterThan(PLANS.creator.price)
  })
})

describe('定价页不能有假承诺', () => {
  const pricing = read('pages/pricing.vue')

  it('不能再承诺没实现的东西', () => {
    // 1. 一次买断包早就上线了，不能再说 "coming"
    expect(pricing).not.toMatch(/one-off pack coming/i)
    expect(pricing).not.toMatch(/coming soon/i)
    // 2. 「多一张 $2.00」从来没实现过
    expect(pricing).not.toMatch(/extra (one|card)[^.]*\$2\.00/i)
    expect(pricing).not.toMatch(/\$2\.00/)
    // 3. 免费档的真实额度是「已验证邮箱 2 张/天」，不能写 1 张
    expect(pricing).not.toMatch(/1 card per day/i)
  })

  it('免费档的文案说的是真话（2 次/天，未验证 1 次）', () => {
    expect(FREE_DAILY_LIMITS.image.verified).toBe(2)
    expect(FREE_DAILY_LIMITS.image.unverified).toBe(1)
    // 文案在 pricing.ts（定价页是从那里渲染的）
    // ⚠️ 2026-10-27：额度改成**按次**扣 —— 一次生成 = 1 次，不管出几张图。
    //    所以写 "generations"（次数），不是 "pictures"（张数）：
    //    写张数会让用户以为"选 4 张就扣 4 次"。
    expect(PLANS.free.features.join(' ')).toContain('2 free generations a day')
    expect(PLANS.free.features.join(' ')).toContain('1 if your email is not verified')
    // 必须说清楚"一次生成消耗一次"
    expect(PLANS.free.features.join(' ')).toMatch(/each go makes up to \d+ pictures/i)
  })

  it('免费档单次出图张数有上限（成本闸门，且文案要说到）', () => {
    // MiniMax 按张收费：不限张数的话，2 次 × 4 张 = 成本 4 倍
    expect(FREE_MAX_IMAGES_PER_RUN).toBe(2)
    expect(PAID_MAX_IMAGES_PER_RUN).toBe(4)
    // 文案里要出现这个上限，用户才知道一次能拿几个候选
    expect(PLANS.free.features.join(' ')).toContain(`${FREE_MAX_IMAGES_PER_RUN} pictures`)
  })

  it('付费档的文案里说了「2K / 无水印 / 300 DPI」—— 那是真的付费点', () => {
    const paidFeatures = [PLANS.single, PLANS.creator, PLANS.lifetime]
      .flatMap(p => p.features)
      .join(' ')
    expect(paidFeatures).toContain('2K, no watermark')
    expect(paidFeatures).toContain('300 DPI')
  })

  it('价格必须用等高数字（Playfair 默认是 oldstyle，「1」会比「9」矮一截）', () => {
    const src = read('pages/pricing.vue')
    expect(src).toMatch(/font-variant-numeric:[^;]*lining-nums/)
    // 全站标题也一样：标题里出现数字同样会高低不齐
    const fonts = read('assets/css/brand-fonts.css')
    expect(fonts).toMatch(/font-variant-numeric:[^;]*lining-nums/)
  })

  it('价格里的 $ 要单独渲染（Playfair 的 $ 带长竖笔，跟数字同字号会浮着）', () => {
    const src = read('pages/pricing.vue')
    expect(src).toContain('ck-plan__currency')
    // 大数字里不能再夹着 $ 符号
    expect(src).not.toMatch(/ck-plan__amount[^>]*>\s*\{\{\s*money\(/)
  })

  it('PayPal 按钮的备用按钮样式必须写在组件里（父页面的 scoped CSS 进不去）', () => {
    // ⚠️ 踩过的坑：.ck-btn 写在 pages/pricing.vue 的 scoped 样式里，
    //    但 PayPalButton 内部的 <button> 拿不到父组件的 scope 属性
    //    → 渲染成浏览器默认按钮，插在卡片里特别怪。
    const src = read('components/pricing/PayPalButton.vue')
    const style = src.slice(src.indexOf('<style'))
    expect(style).toContain('.pp-btn__fallback')
    expect(style).toMatch(/\.pp-btn__fallback\s*\{[\s\S]*?background:/)
    expect(style).toMatch(/\.pp-btn__fallback\s*\{[\s\S]*?border-radius:/)
  })

  it('单张购买按钮接的是真的 PayPal 下单（不是跳转卡片页）', () => {
    // 单张那一段必须有 PayPalButton，否则用户点了还是得自己找入口
    const singleSection = pricing.slice(pricing.indexOf('ck-single'), pricing.indexOf('ck-faq-wrap'))
    expect(singleSection).toContain('PayPalButton')
    expect(singleSection).toContain('singlePlan.id')
  })

  it('「用完张数会怎样」这件事有交代（不能让人以为还能无限用）', () => {
    expect(pricing).toMatch(/use all my cards/i)
  })
})

describe('额度语义（付费 ≠ 无限）', () => {
  it('付费用户的音乐/文案有上限，不是无限', () => {
    expect(PAID_DAILY_LIMITS.music.verified).toBeGreaterThan(0)
    expect(PAID_DAILY_LIMITS.text.verified).toBeGreaterThan(0)
    // 付费档比免费档宽
    expect(PAID_DAILY_LIMITS.text.verified).toBeGreaterThan(FREE_DAILY_LIMITS.text.verified)
    expect(PAID_DAILY_LIMITS.music.verified).toBeGreaterThan(FREE_DAILY_LIMITS.music.verified)
  })

  it('daily-usage 不再有「付费 = 无限」那条短路', () => {
    const src = read('server/utils/daily-usage.ts')
    expect(src).not.toMatch(/plan !== 'free' && status === 'active'\) \{\s*return \{[^}]*unlimited: true/)
    expect(src).toContain("mode: 'credit'")
  })

  it('付费用户用完张数会被拒（402 OUT_OF_CREDITS）', () => {
    const src = read('server/utils/daily-usage.ts')
    expect(src).toContain('OUT_OF_CREDITS')
    expect(src).toContain('statusCode: 402')
  })

  it('发额度的地方用的是 pricing.ts 的张数', () => {
    expect(read('server/api/paypal/order/capture.post.ts')).toContain('planCards')
    expect(read('server/api/subscriptions/activate.post.ts')).toContain('getPlan')
  })

  it('单张档必须把 plan 落库（以前只写 lifetime，买单张的人被当成 free）', () => {
    const src = read('server/api/paypal/order/capture.post.ts')
    // 不能再有那个只处理 lifetime 的 CASE
    expect(src).not.toMatch(/WHEN \? = 'lifetime' THEN 'lifetime'/)
    expect(src).toContain('nextPlan')
  })
})

describe('档位列表', () => {
  it('四个档位都在，顺序稳定', () => {
    expect(PLAN_LIST.map(p => p.id)).toEqual(['free', 'single', 'creator', 'lifetime'])
  })

  it('每个档位都有文案（前端直接用，不许缺字段）', () => {
    for (const p of PLAN_LIST) {
      expect(p.name).toBeTruthy()
      expect(p.description).toBeTruthy()
      expect(p.cta).toBeTruthy()
      expect(p.features.length).toBeGreaterThan(0)
    }
  })

  it('档位说明不能跟特性列表说同一句话（之前 desc 和 blurb 重复渲染）', () => {
    for (const p of PLAN_LIST) {
      const desc = p.description.toLowerCase()
      for (const f of p.features) {
        const feat = f.toLowerCase()
        // 同一句话不该既当说明又当特性
        const same = desc.includes(feat) || feat.includes(desc)
        expect(same, `${p.id}: 说明「${p.description}」和特性「${f}」重复了`).toBe(false)
      }
    }
  })
})
