/**
 * 贺卡向导的流程守卫
 *
 * ⚠️ 2026-11-17 减步改造的护栏。
 *   改造前：3 步（Occasion → Name & photo → Look）+ 结果页
 *   改造后：2 步（Who & what → Make it）+ 结果页
 *
 *   这些断言锁的是**「别再加步骤了」**这个决定：
 *   以后谁想再加一步（哪怕只是"更好看"），这里会红。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const src = readFileSync(join(ROOT, 'pages/cards.vue'), 'utf8')
const composer = readFileSync(join(ROOT, 'components/cards/CardComposer.vue'), 'utf8')

describe('贺卡向导 · 流程守卫', () => {
  it('只有 2 步（不是 3 步）', () => {
    const labels = src.match(/const stepLabels = \[([^\]]*)\]/)?.[1] || ''
    expect(labels).toContain("'Who & what'")
    expect(labels).toContain("'Make it'")
    // 不能再有第三步
    const count = (labels.match(/'/g) || []).length / 2
    expect(count).toBe(2)
  })

  it('结果页是第 3 步，步骤号不写进 URL（否则刷新后整页空白）', () => {
    // watch(step) 里只写 1 / 2
    const watchStep = src.match(/watch\(step[\s\S]*?\n\}\)/)?.[0] || ''
    expect(watchStep).toContain('v <= 2')
    // onMounted 的 ?step= 也只接受 1 / 2
    expect(src).toContain('q >= 1 && q <= 2')
  })

  it('没有「22 选 1」的一整面场景墙 —— 完整列表必须折起来', () => {
    // 场景网格必须在 <details> 里（More occasions）
    const detailsBlock = src.match(/<details class="ck-more" :open="showAllOccasions">[\s\S]*?<\/details>/)?.[0] || ''
    expect(detailsBlock).toContain('ck-scene-grid')
  })

  it('有高频场合快捷入口（一次点击就能定场合）', () => {
    expect(src).toContain('quickIntents')
    expect(src).toContain('pickQuick')
    // 完整场景网��不再是主视觉
    expect(src).toContain('showAllOccasions')
  })

  it('画风默认已选好，网格默认收起', () => {
    expect(src).toContain('const showStyles = ref(false)')
    // 有一个"已选画风"的展示块
    expect(src).toContain('ck-picked__name')
    expect(src).toContain('currentStyleLabel')
  })

  it('「想说什么」提前到生成前，并且出图后自动预填进成品', () => {
    // 前端要把它传给服务端（存起来）
    expect(src).toMatch(/message:\s*message\.value/)
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
    expect(body).toContain('message: message.value')
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
    expect(composer).toContain('emit(\'update:card\'')
    // 页面层：接 + 防抖存 + 带上版式
    expect(src).toContain('@update:card="onCardUpdate"')
    expect(src).toContain(':saved-card="savedCard"')
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

  it('Try again 不能把上一批候选顶掉（保留两批，最多 8 张）', () => {
    expect(src).toContain('const currentBatch = ref')
    expect(src).toContain('const olderBatch = ref')
    expect(src).toContain('const candidates = computed(')
    // 生成时上一批要挪走而不是被覆盖
    expect(src).toMatch(/olderBatch\.value = currentBatch\.value/)
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

  it('额度未知时给的是「先登录」的提示，不是假装知道剩几次', () => {
    const hint = src.match(/<p v-if="step === 2" class="ck-nav__hint">[\s\S]*?<\/p>/)?.[0] || ''
    // v-else 分支 = 额度没加载出来
    expect(hint).toContain('Sign in to make this card')
    // 别再出现"你说免费预览"这种含糊话
    expect(hint).not.toContain('Free to preview')
  })

  it('生成按钮文案不拼场景名（"Make birthday" / "Make restore an old photo card"）', () => {
    const btn = src.match(/class="ck-btn ck-btn--primary ck-btn--lg"[\s\S]*?@click="generate"[\s\S]*?<\/button>/)?.[0] || ''
    expect(btn).toContain('Make the card')
    expect(btn).not.toMatch(/Make \$\{scenario/)
  })

  it('快捷场合的高亮 class 是 is-on（验证脚本别选错名字）', () => {
    expect(src).toContain("'is-on': scenario?.id === q.id")
  })

  it('草稿恢复后能把场景回填（否则刷新后场合高亮丢失）', () => {
    const restore = src.match(/function restoreDraft\(\)[\s\S]*?\n\}/)?.[0] || ''
    expect(restore).toContain('IMAGE_SCENARIOS.find')
    expect(restore).toContain('scenario.value = sc')
  })
})
