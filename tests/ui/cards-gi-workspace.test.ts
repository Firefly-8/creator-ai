/**
 * GI UX 工作区守卫：连续遮罩创作（params → generating → editor）
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const cards = readFileSync(join(ROOT, 'pages/cards.vue'), 'utf8')
const composer = readFileSync(join(ROOT, 'components/cards/CardComposer.vue'), 'utf8')
const image = readFileSync(join(ROOT, 'pages/image.vue'), 'utf8')
const adopt = readFileSync(join(ROOT, 'docs/gi-ux-adoption.md'), 'utf8')
const apiMap = readFileSync(join(ROOT, 'docs/cards-api-mapping.md'), 'utf8')

describe('贺卡 GI 工作区', () => {
  it('有 workspacePhase 三态与落地自动 openForm', () => {
    expect(cards).toContain("type WorkspacePhase = 'params' | 'generating' | 'editor'")
    expect(cards).toContain('workspacePhase')
    expect(cards).toContain("workspacePhase.value = 'generating'")
    expect(cards).toContain('if (!formOpen.value) openForm()')
    expect(cards).toContain('requestCloseWorkspace')
    expect(cards).toContain('backToParams')
  })

  it('编辑器在遮罩内，不再挂营销页 ck-cards__body 结果区', () => {
    const tpl = cards.slice(0, cards.lastIndexOf('</template>'))
    expect(tpl).toContain('ck-workspace__editor')
    expect(tpl).toContain('data-phase="editor"')
    expect(tpl).not.toContain('ck-cards__body')
    expect(tpl).toContain('<CardComposer')
  })

  it('桌面宽面板 / 移动全屏仍保留', () => {
    expect(cards).toContain('ck-formmodal__panel--wide')
    expect(cards).toMatch(/@media \(max-width:\s*640px\)[\s\S]*max-height:\s*100vh/)
  })

  it('Composer 有 Undo/Redo 与本地主题色（不调 generate）', () => {
    expect(composer).toContain('function undo')
    expect(composer).toContain('function redo')
    expect(composer).toContain('applyTheme')
    expect(composer).toContain('Colour accent')
    expect(composer).not.toMatch(/applyTheme[\s\S]{0,200}\/api\/image\/generate/)
  })

  it('/image 默认导向 /cards，legacy 保留', () => {
    expect(image).toContain("path: '/cards'")
    expect(image).toContain("legacy")
    expect(image).toContain('format: \'card\'')
  })

  it('文档：采用清单 + API 映射已入库', () => {
    expect(adopt).toContain('进入即创作')
    expect(adopt).toContain('Undo / Redo')
    expect(apiMap).toContain('aspect_ratio')
    expect(apiMap).toContain('不扣生成额度')
  })
})
