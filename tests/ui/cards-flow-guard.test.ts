/**
 * 贺卡流程守卫
 *
 * ⚠️ 2026-11-23 弹窗化改造的护栏（合并远端线后重写）。
 *   改造前：2 步向导（Who & what → Make it）+ 结果页
 *   改造后：参数弹窗一步到位（ck-formmodal）+ 主屏 + 二级子页，无步骤条
 *
 *   这些断言锁的是**「别再加步骤了」「别把远端线修的功能退回去」**：
 *   以后谁想再加一步、或把旧卡复用/批次保留删掉，这里会红。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const src = readFileSync(join(ROOT, 'pages/cards.vue'), 'utf8')
const composer = readFileSync(join(ROOT, 'components/cards/CardComposer.vue'), 'utf8')

describe('贺卡向导 · 流程守卫', () => {
  it('一步到位：向导步骤已删（无 stepsbar/stepLabels，弹窗一站填完）', () => {
    expect(src).not.toContain('ck-stepsbar')
    expect(src).not.toContain('stepLabels')
    expect(src).toContain('const formOpen = ref(false)')
    // 生成按钮在弹窗里，一步到位
    expect(src).toContain('ck-formmodal__make')
  })

  it('旧 ?step= 链接显式忽略，步骤号不写进 URL（否则刷新后整页空白）', () => {
    expect(src).toContain('?step=2')
    expect(src).not.toMatch(/route\.query\.step/)
  })

  it('场合完整列表收进二级子页 —— 主屏不放一整面场景墙', () => {
    expect(src).toContain("openSub('occasion')")
    // 场景网格只出现一次（在 occasion 子页里，class="ck-scene-grid"；
    // CSS 定义里不含这个完整字符串）
    expect((src.match(/class="ck-scene-grid"/g) || []).length).toBe(1)
    expect(src).toMatch(/function pickScenario\([\s\S]*?closeSub\(\)/)
  })

  it('场合/画风一次点击就能定（选完自动退回主屏 chip）', () => {
    expect(src).toMatch(/function pickScenario\([\s\S]*?closeSub\(\)/)
    expect(src).toMatch(/function pickStyle\([\s\S]*?closeSub\(\)/)
  })

  it('画风默认已选好（主屏 chip 内联当前值）', () => {
    expect(src).toContain("const style = ref('watercolor')")
    // 有一个"已选画风"的展示块
    expect(src).toContain('currentStyleLabel')
    expect(src).toContain('isBestMatch')
  })

  it('「想说什么」默认已备好（场合预设第一条），并且自动预填进成品', () => {
    // 前端要把它传给服务端（存起来）
    expect(src).toMatch(/message:\s*chosenMessage\.value/)
    // 也要预填给编辑器
    expect(src).toContain('prefilledTexts')
    expect(src).toContain(':initial-texts="prefilledTexts"')
  })

  it('「想说什么」不进 AI prompt（模型自己写字必翻车）', () => {
    // ⚠️ message **要**传给服务端（存进 meta_json，老卡才带得走字），
    //    但**不能**参与 prompt 拼装 —— prompt 里只有 scenario/style/name/extra。
    const server = readFileSync(join(ROOT, 'server/api/image/generate.post.ts'), 'utf8')
    const built = server.match(/buildScenarioPrompt\([\s\S]*?\n\s*\)/)?.[0] || ''
    expect(built).toContain('body?.extra')
    expect(built).not.toContain('body?.message')

    // 前端请求体里传了 message（为了存）
    const body = src.match(/'\/api\/image\/generate', \{([\s\S]*?)\n\s*\}\)/)?.[1] || ''
    expect(body).toContain('message: chosenMessage.value')
  })

  it('有本地草稿（刷新/切后台不丢）', () => {
    expect(src).toContain('useCardDraft')
    expect(src).toContain('restoreDraft')
  })

  it('CardComposer 真的接上了 initialTexts', () => {
    expect(composer).toMatch(/props\.initialTexts\?\.length/)
  })

  it('旧卡恢复优先于初始文字（savedCard 的位置是精确的，不能再被套版式覆盖）', () => {
    expect(composer).toMatch(/texts:\s*props\.savedCard\?\.texts\?\.length/)
    // 恢复旧卡时**不要**再 applyLayout —— 会把用户当时的位置覆盖掉
    expect(composer).toMatch(/if \(!props\.savedCard\?\.texts\?\.length\) applyLayout/)
  })

  it('成品状态会报给页面层去保存（版式 + 文字位置都不丢）', () => {
    expect(composer).toContain("'update:card'")
    expect(composer).toContain("emit('update:card'")
    // 页面层：接 + 防抖存 + 带上版式
    expect(src).toContain('@update:card="onCardUpdate"')
    expect(src).toContain(':saved-card="savedCard')
    expect(src).toContain('saveCardNow')
    expect(src).toMatch(/layout:\s*finalCard\.value\.layout/)
    expect(src).toMatch(/texts:\s*finalCard\.value\.texts/)
  })

  it('「Try again」要标出消耗（以前一点就又扣一次额度，界面零提示）', () => {
    const regen = src.match(/<div class="ck-regen">[\s\S]*?<\/div>/)?.[0] || ''
    expect(regen).toContain('ck-nav__cost')
    // 同一个守卫：额度没加载出来就别报成本
    expect(regen).toContain('usageLoaded')
  })

  it('结果页不许说「You can make as many as you like」（一次就扣一次额度）', () => {
    expect(src).not.toContain('You can make as many as you like')
    expect(src).toContain('Each try uses 1 of your free goes')
  })

  it('Try again 不能把上一张顶掉（保留最近 3 张，新的在上面）', () => {
    expect(src).toContain('const currentBatch = ref')
    expect(src).toContain('const olderBatch = ref')
    expect(src).toContain('const candidates = computed(')
    // 生成时旧张挪到 olderBatch 而不是被覆盖（n:1 后按张保留）
    expect(src).toMatch(/olderBatch\.value = \[currentBatch\.value\[0\]/)
  })

  it('保存成品要走带归属校验的接口（不能按 id 裸写别人的图）', () => {
    const api = readFileSync(join(ROOT, 'server/api/images/[id]/card.put.ts'), 'utf8')
    expect(api).toContain('getImage(id, auth.uid)')
    expect(api).toContain('401')
    // 只收白名单字段
    expect(api).toContain('String(body.name')
    expect(api).toContain('Array.isArray(body.texts)')
    // 合并写 meta_json，不能整块覆盖
    expect(api).toContain('meta.card = { ...(meta.card || {}), ...card }')
  })

  it('额度没加载出来时，不许说「uses 1 of your free goes」', () => {
    // ⚠️ 2026-11-17：未登录 → /api/user/usage 401 → usageLoaded=false。
    //    但 outOfQuota 也是 false → 原来照样显示成本提示，
    //    等于跟没登录的人说"你还有免费次数"，而他登录后是 1 次还是 2 次
    //    （看邮箱验证没）根本不知道。
    const cost = src.match(/<span[^>]*ck-nav__cost[\s\S]*?<\/span>/)?.[0] || ''
    expect(cost).toContain('usageLoaded')
  })

  it('额度未知时不假装知道剩几次（兜底文案不报数字）', () => {
    const quota = src.match(/<p class="ck-formmodal__quota">[\s\S]*?<\/p>/)?.[0] || ''
    // 含剩余次数的分支必须挂 usageLoaded
    expect(quota).toContain('usageLoaded')
    // 额度没加载出来的兜底：不报任何数字
    expect(quota).toContain('Free to preview')
  })

  it('生成按钮文案不拼场景名（"Make birthday" / "Make restore an old photo card"）', () => {
    const btn = src.match(/class="ck-btn ck-btn--primary ck-btn--lg ck-formmodal__make"[\s\S]*?<\/button>/)?.[0] || ''
    // ctaPhrase 自带动词（'Make an invitation' / 'Make a card'），前面不能再拼 "Make "
    expect(btn).toContain('formatCopy.ctaPhrase')
    expect(btn).not.toMatch(/`Make \$\{formatCopy/)
    expect(btn).not.toMatch(/Make \$\{scenario/)
  })

  it('场合选中的高亮 class 是 ck-scene--on（验证脚本别选错名字）', () => {
    expect(src).toContain("'ck-scene--on': scenario?.id === sc.id")
  })

  it('草稿恢复后能把场景回填（否则刷新后场合高亮丢失）', () => {
    const restore = src.match(/function restoreDraft\(\)[\s\S]*?\n\}/)?.[0] || ''
    expect(restore).toContain('IMAGE_SCENARIOS.find')
    expect(restore).toContain('scenario.value = sc')
  })
})
