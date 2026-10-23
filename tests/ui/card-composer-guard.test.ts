/**
 * 文字编辑面板（CardComposer）防回归守卫
 *
 * 背景：2026-10-23 修「文字添加页面 UX 混乱」时挖出来的一类坑 ——
 *  `.ck-input` 带 `width: 100%`，字号按钮也复用这个类，
 *  → A+/A− 变成横跨整页的超宽条，右侧面板被撑破，两个 select 被挤成两个小箭头。
 *
 * 这些是「源码级」守卫：样式写错时测试要立刻红，而不是等用户看到页面才发现。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '../../components/cards/CardComposer.vue'), 'utf8')

/** 取某条 CSS 规则（含后续声明），selector 要自己转义，如 '\\.ck-input' */
function rule(selector: string): string {
  const re = new RegExp(`${selector}\\s*\\{([^}]*)\\}`)
  const m = src.match(re)
  return m ? m[1] : ''
}

describe('CardComposer · 文字编辑面板', () => {
  it('按钮不能再复用带 width:100% 的 .ck-input（那会让 A+/A− 变成超宽横条）', () => {
    // 字号按钮现在有自己的类 .ck-size-btn
    expect(src).not.toContain('ck-input--btn')
    expect(src).not.toContain('ck-input--sm')
    // 字号按钮自己的样式里不能出现 width: 100%
    expect(rule('\\.ck-size-btn')).not.toMatch(/width:\s*100%/)
    // 字体按钮同理
    expect(rule('\\.ck-font')).not.toMatch(/width:\s*100%/)
  })

  it('面板里的控件宽度要有上限，不能横向溢出', () => {
    // 字体/字号按钮都要有收缩上限
    expect(rule('\\.ck-font')).toMatch(/min-width:\s*0/)
    expect(rule('\\.ck-size-chip')).toMatch(/min-width:\s*0/)
    // 选项行用 grid 的 minmax(0, 1fr)，避免被内容顶开
    expect(rule('\\.ck-opt')).toMatch(/minmax\(0,\s*1fr\)/)
  })

  it('预览 canvas 要能随容器收缩（否则窄屏整页横向滚动）', () => {
    expect(rule('\\.ck-comp__canvas')).toMatch(/max-width:\s*100%/)
    // grid/flex item 默认 min-width:auto，会被 canvas 固有宽度顶开
    expect(rule('\\.ck-comp__stage')).toMatch(/min-width:\s*0/)
  })

  it('字体和颜色用可见的按钮/色板，不用看不出内容的下拉框', () => {
    // 面板里不该再有 <select>
    expect(src).not.toMatch(/<select/)
    // 必须有：字体按钮组 + 色板 + 字号档位
    expect(src).toContain('ck-font')
    expect(src).toContain('ck-swatch')
    expect(src).toContain('ck-size-chip')
  })

  it('字体按钮用真实品牌字体做预览（所见即所得）', () => {
    expect(src).toContain("'Playfair Display'")
    expect(src).toContain("'Lora'")
    expect(src).toContain("'Caveat'")
  })
})
