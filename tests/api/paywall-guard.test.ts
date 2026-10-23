/**
 * 付费点守卫 — 单元测试
 *
 * 2026-10-23 的一次 UX/商业化走查发现三个漏口，全都是**静默**的：
 *   1. Share 走的是预览 canvas（无水印）→ 免费用户能把干净成品发出去
 *   2. 预览不加水印、下载才加 → "预览和下载不一样"，最容易招差评
 *   3. 登录墙在页面入口 → 公开 SEO 落地页的访客点 CTA 只看到登录框
 *
 * 这类问题没有一条会报错，全靠测试盯着。
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8')
}

describe('付费点 — 水印必须三处都有', () => {
  it('预览也要打标（renderPreview 里必须有水印）', () => {
    const src = read('composables/useCardCanvas.ts')
    expect(src).toContain('drawWatermark')
    // renderPreview 里也要画 —— 以前只有 exportCard 画
    const preview = src.slice(src.indexOf('function renderPreview'), src.indexOf('function renderPreview') + 900)
    expect(preview).toContain('watermark.value')
    expect(preview).toContain('drawWatermark')
  })

  it('水印只画一处（预览/导出共用 drawWatermark）', () => {
    const src = read('composables/useCardCanvas.ts')
    // "Create Keepsakes" 这个水印文字只能出现一次
    const hits = src.match(/fillText\('Create Keepsakes'/g) || []
    expect(hits.length).toBe(1)
  })

  it('Share 不能直接用预览 canvas（那是没有水印的）', () => {
    const src = read('components/cards/CardComposer.vue')
    const share = src.slice(src.indexOf('async function doShare'))
    // 注意查的是**实际取用**（previewCanvas.value），不是注释里提到这个词
    expect(share).not.toContain('previewCanvas.value')
    // 免费用户分享也必须带标 + 1024 限制
    expect(share).toContain('watermark: true')
    expect(share).toContain('targetWidth: 1024')
  })

  it('免费版预览也要有标（CardComposer 把 hasPaid 接到 watermark 上）', () => {
    const src = read('components/cards/CardComposer.vue')
    expect(src).toMatch(/watermark\.value\s*=\s*!paid/)
  })
})

describe('付费点 — 登录墙的位置', () => {
  const studios = ['pages/image.vue', 'pages/create.vue', 'pages/cover.vue']

  studios.forEach((file) => {
    it(`${file} 不能再进页面就弹登录框`, () => {
      const src = read(file)
      // 页面入口弹登录 → 公开 SEO 落地页的访客看不到界面
      expect(src).not.toMatch(/openLoginWithRedirect\(route\.fullPath\)/)
    })

    it(`${file} 生成前仍要拦截（requireAuth 不能被拆掉）`, () => {
      const src = read(file)
      expect(src).toContain('requireAuth()')
    })
  })

  it('登录成功后要接着做刚才那件事（afterAuth）', () => {
    const src = read('composables/useRequireAuth.ts')
    expect(src).toContain('setAfterAuth')
    expect(src).toContain('setNote')
  })
})

describe('付费点 — 额度文案要说实话', () => {
  it('免费额度按张数扣 → 文案不能说成"几张卡片"', () => {
    const src = read('utils/pricing.ts')
    expect(src).toContain('2 free pictures a day')
    expect(src).not.toContain('2 free cards a day')
  })

  it('生成页在额度不足 4 张时要说清楚是"张"不是"次"', () => {
    const src = read('pages/cards.vue')
    expect(src).toMatch(/quotaRemaining < 4/)
    expect(src).toMatch(/one go will make as many as you have left/i)
  })

  it('定价页不能承诺"无需注册"（下单接口是要登录的）', () => {
    const src = read('pages/pricing.vue')
    expect(src).not.toMatch(/No account tricks/i)
  })
})

describe('出图张数 — 用户能自己选', () => {
  it('贺卡向导要能选出几张（以前写死 4 张，免费额度一天才 2 张）', () => {
    const src = read('pages/cards.vue')
    expect(src).toContain('COUNT_CHOICES')
    expect(src).toContain('countChoice')
    // 不能再是写死的 min(4, 剩余)
    expect(src).not.toMatch(/const maxN = usageUnlimited\.value \? 4/)
    expect(src).toContain('const maxN = actualCount.value')
  })

  it('选几张就扣几张（服务端按实际出图张数扣）', () => {
    // 前端传的 n 必须来自用户选择
    const src = read('pages/cards.vue')
    expect(src).toMatch(/n: maxN/)
    // 服务端拿 n 当扣费单位
    const api = read('server/api/image/generate.post.ts')
    expect(api).toContain('consumeQuota(event, auth.uid, \'image\', count)')
  })

  it('额度不够时要收敛并说清楚', () => {
    const src = read('pages/cards.vue')
    expect(src).toContain('actualCount')
    expect(src).toContain('countShort')
    expect(src).toMatch(/this go will make \{\{ actualCount \}\}/)
  })
})
