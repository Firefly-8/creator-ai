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
  it('免费额度按**次**扣 → 文案要说"几次"不是"几张"', () => {
    const src = read('utils/pricing.ts')
    // ⚠️ 2026-10-27 改成按次：一次生成 = 1 次，出几张都算这 1 次。
    //    写 "pictures" 会让用户以为"选 4 张就扣 4 次"。
    expect(src).toContain('3 free generations in total')
    expect(src).not.toContain('free cards a day')
    expect(src).not.toContain('free pictures a day')
  })

  it('生成页要说清楚额度是"次"，不再出现「一次几张」选择器', () => {
    const src = read('pages/cards.vue')
    expect(src).toMatch(/free generation/)
    // 2026-11-23：固定一次 1 张，选项和单次上限字段全部移除
    expect(src).not.toContain('maxPerRun')
    expect(src).not.toContain('countChoice')
    expect(src).not.toContain('How many options?')
    expect(src).not.toMatch(/one go will make as many as you have left/i)
  })

  it('创作流程是「单弹窗一次填完」，不再是三步向导（2026-11-23 对齐原型）', () => {
    const src = read('pages/cards.vue')
    // 参数弹窗 + 一次填完的分区
    expect(src).toContain('ck-formmodal')
    expect(src).toContain('formOpen')
    expect(src).toContain('openForm')
    // 三步向导的状态与导航全清掉
    expect(src).not.toContain('stepLabels')
    expect(src).not.toContain('goNext')
    expect(src).not.toContain('goBack')
    expect(src).not.toContain('ck-stepsbar')
    // 弹窗层级高于 Cookie 条(100)、低于登录弹窗(120)：盖住 cookie 又不妨碍登录续跑
    expect(src).toMatch(/\.ck-formmodal\s*\{[^}]*z-index:\s*110/)
  })

  it('弹窗是「一屏主表单 + 二级子页」，不是全平铺（2026-11-23 竞品 UX 对齐）', () => {
    const src = read('pages/cards.vue')
    // 主屏：场合/风格/照片都收成内联当前值的 chip，加 More options 折叠
    expect(src).toContain('ck-mainform')
    expect(src).toContain('ck-valuechip')
    expect(src).toContain('ck-minichip')
    expect(src).toContain('class="ck-moreopt"')
    // 二级子页：场合/风格/照片三页，带返回栈
    expect(src).toContain("openSub('occasion')")
    expect(src).toContain("openSub('style')")
    expect(src).toContain("openSub('photo')")
    expect(src).toContain('function closeSub()')
    expect(src).toContain('ck-sub__back')
    // Best match 一等公民（对齐竞品渐变边框 + 对勾）
    expect(src).toContain('ck-style--best')
    expect(src).toContain('ck-style__check')
    expect(src).toContain('function pickBestMatch()')
    // 旧的平铺分区编号已移除（结果区仍用 ck-sec，但不能有「第1/2/3步」的分区号）
    expect(src).not.toContain('ck-sec__num')
    expect(src).not.toContain('What are we making?')
    expect(src).not.toContain('Add their photo and name')
    expect(src).not.toContain('Pick a look')
  })

  it('免费额度是累计 3 次、按完后跳付费墙，文案不能再说"今天/每日"', () => {
    const src = read('pages/cards.vue')
    // 后端已改成注册送 3 次、累计不重置（LIFETIME_SENTINEL）
    expect(src).not.toMatch(/left today/i)
    expect(src).not.toMatch(/today's free/i)
    expect(src).not.toMatch(/Daily limit reached/i)
    expect(src).not.toMatch(/generations every day/i)
    // 额度用完：按钮去付费墙，不是 disabled
    expect(src).toContain('handleMake')
    expect(src).toContain('Get ${PLANS.creator.cards} credits')
  })

  it('定价页不能承诺"无需注册"（下单接口是要登录的）', () => {
    const src = read('pages/pricing.vue')
    expect(src).not.toMatch(/No account tricks/i)
  })
})

describe('出图张数 — 固定一次 1 张（2026-11-23 产品决定）', () => {
  it('贺卡向导不再有张数选项，前端写死 n:1', () => {
    const src = read('pages/cards.vue')
    expect(src).not.toContain('COUNT_CHOICES')
    expect(src).not.toContain('countChoices')
    expect(src).not.toContain('actualCount')
    expect(src).toMatch(/n:\s*1,/)
  })

  it('一次生成 = 1 次额度，服务端按次扣且强制 1 张', () => {
    const src = read('pages/cards.vue')
    expect(src).toMatch(/n:\s*1,/)
    const api = read('server/api/image/generate.post.ts')
    expect(api).toContain("consumeQuota(event, auth.uid, 'image', 1)")
    expect(api).not.toContain("consumeQuota(event, auth.uid, 'image', count)")
    // 服务端写死 count=1，忽略客户端传来的 n
    expect(api).toMatch(/const count\s*=\s*1/)
  })

  it('图片工具页也不再有张数选择器', () => {
    const src = read('pages/image.vue')
    expect(src).not.toContain('countOptions')
    expect(src).not.toContain('countCapped')
    expect(src).not.toContain('$t(\'image.count\')')
    expect(src).toMatch(/n:\s*1,/)
  })
})
