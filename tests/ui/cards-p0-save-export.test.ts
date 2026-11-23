/**
 * P0 保存/导出语义 + 登录回跳保稿守卫（2026-11-23）
 *
 * 锁住本轮最小改造，避免再混成「一个 Download 区里又 Finish 又去水印」：
 *   1. Keep（自动存排版 + Finish）与 Take（下载/分享）分区
 *   2. 自动保存有 dirty/saving/saved/error，不另开重复 Save 按钮
 *   3. Finish 后再改可 dirty 重存；下载按钮标明免费带水印
 *   4. 登录闸在生成；401 时表单保持打开；?from= 优先于本地草稿
 *   5. Try again 保留旧候选；照片缩略图进草稿
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const cards = readFileSync(join(ROOT, 'pages/cards.vue'), 'utf8')
const composer = readFileSync(join(ROOT, 'components/cards/CardComposer.vue'), 'utf8')
const draft = readFileSync(join(ROOT, 'composables/useCardDraft.ts'), 'utf8')

describe('P0 · Keep vs Take 分区', () => {
  it('Composer 有 Keep / Take 两个分区，Finish 不在 Download 标题下', () => {
    expect(composer).toContain('data-sec="keep"')
    expect(composer).toContain('data-sec="take"')
    expect(composer).toContain('Keep your design')
    expect(composer).toContain('Download &amp; share')
    // Finish 落在 Keep 区
    const keep = composer.match(/data-sec="keep"[\s\S]*?<\/section>/)?.[0] || ''
    expect(keep).toContain('data-act="finish"')
    expect(keep).toContain('ck-save-status')
    // Take 区有下载，没有 Finish
    const take = composer.match(/data-sec="take"[\s\S]*?<\/section>/)?.[0] || ''
    expect(take).toContain('data-act="download"')
    expect(take).not.toContain('data-act="finish"')
  })

  it('不另开手动 Save draft 按钮（避免和自动保存 / Finish 重复）', () => {
    // 注释里可以提到「不要 Save draft」；禁止的是真正的按钮文案
    expect(composer).not.toMatch(/<(button|a)\b[^>]*>[^<]*Save draft/i)
    expect(composer).toContain('metaSaveStatus')
    expect(composer).toContain('Layout saves automatically')
  })

  it('Finish 后再改字会 finishDirty，允许再次 Finish', () => {
    expect(composer).toContain('finishDirty')
    expect(composer).toContain('Save updates to your creations')
    expect(composer).toMatch(/if \(finalized\.value\) finishDirty\.value = true/)
    expect(composer).toMatch(/:disabled="[^"]*finalized && !finishDirty/)
  })

  it('Finish 401 登录后 afterAuth 自动再 Finish（不丢稿）', () => {
    const fn = composer.match(/async function finishCard\([\s\S]*?\n\}/)?.[0] || ''
    expect(fn).toContain('setAfterAuth')
    expect(fn).toContain('await finishCard()')
    expect(fn).toContain('openLogin')
  })
})

describe('P0 · 导出权限透明（不改计价）', () => {
  it('免费/付费两行说明存在，下载按钮标明带水印', () => {
    expect(composer).toContain('data-act="export-permission"')
    expect(composer).toContain('1024 px file with a small mark')
    expect(composer).toContain('2K · 300 DPI · no mark')
    expect(composer).toContain('Download free version (with mark)')
    expect(composer).toContain('data-act="remove-watermark"')
  })

  it('不去堆阻断式「先选再下」弹窗；付费仍走原 remove-watermark emit', () => {
    expect(composer).not.toContain('ck-wm-modal')
    expect(composer).toContain("$emit('remove-watermark')")
    // 免费导出仍带 watermark: true
    expect(composer).toMatch(/targetWidth:\s*1024,\s*watermark:\s*true/)
  })
})

describe('P0 · 登录回跳 / 草稿 / from= / Try again', () => {
  it('401 时强制保持表单打开，afterAuth 续跑 generate', () => {
    const auth = cards.match(/function openAuthForGenerate\(\)[\s\S]*?\n\}/)?.[0] || ''
    expect(auth).toContain('formOpen.value = true')
    expect(auth).toContain('setAfterAuth')
    expect(auth).toContain('await generate()')
    expect(auth).toContain('everything you have already entered is kept')
  })

  it('?from= 旧卡优先于本地草稿恢复', () => {
    expect(cards).toMatch(/if \(String\(route\.query\.from \|\| ''\)\) loadFromCard\(\)\s*\n\s*else restoreDraft\(\)/)
  })

  it('本地草稿自动保存 + 照片缩略图进草稿', () => {
    expect(cards).toContain('useCardDraft')
    expect(cards).toContain('makeThumbnail')
    expect(cards).toMatch(/draftStore\.state\.value = \{[\s\S]*thumb/)
    expect(draft).toContain('craftai_card_draft_v1')
    expect(draft).toContain('if (hasDraft()) save()')
    expect(draft).toContain('watch(')
  })

  it('刷新恢复草稿时能回填缩略图预览（原图仍须重选）', () => {
    const restore = cards.match(/function restoreDraft\(\)[\s\S]*?\n\}/)?.[0] || ''
    expect(restore).toContain('st.thumb')
    expect(restore).toContain('photoPreview.value = st.thumb')
    expect(restore).toContain('photoFile.value = null')
  })

  it('自动保存有 dirty/saving/saved/error，失败不丢编辑', () => {
    expect(cards).toContain("metaSaveStatus = ref<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>")
    expect(cards).toContain("metaSaveStatus.value = 'dirty'")
    expect(cards).toContain("metaSaveStatus.value = 'saving'")
    expect(cards).toContain("metaSaveStatus.value = 'saved'")
    expect(cards).toContain("metaSaveStatus.value = 'error'")
    expect(cards).toContain(':meta-save-status="metaSaveStatus"')
  })

  it('Try again 保留旧候选并标消耗', () => {
    expect(cards).toMatch(/olderBatch\.value = \[currentBatch\.value\[0\]/)
    expect(cards).toContain('uses 1 of your free goes')
  })

  it('生成失败不 closeForm（输入保留在弹窗里）', () => {
    const gen = cards.match(/async function generate\(\)[\s\S]*?\n\}/)?.[0] || ''
    // closeForm 只应出现在成功路径（fresh 处理之后），catch 里不能关
    const catchBlock = gen.split('} catch')[1] || ''
    expect(catchBlock).not.toContain('closeForm(')
    expect(gen).toContain('openAuthForGenerate()')
  })

  it('uiPreview=composer 仅 localhost 注入，不走真实生成', () => {
    expect(cards).toContain('uiPreview')
    expect(cards).toContain("host === 'localhost'")
    expect(cards).toContain("host === '127.0.0.1'")
    expect(cards).toContain('hero-birthday.webp')
    expect(cards).not.toMatch(/uiPreview[\s\S]{0,200}\/api\/image\/generate/)
  })
})
