/**
 * 文字编辑面板（CardComposer）防回归守卫
 *
 * 背景：
 *   1. 2026-10-23 修「UX 混乱」：`.ck-input` 带 `width: 100%`，
 *      字号按钮复用这个类 → A+/A− 变成横跨整页的超宽条，右侧面板被撑破。
 *   2. 2026-10-27 改成**版式模板化**：用户选一个成品版式，
 *      只填「给谁的名字 + 想说的话」两个字段，
 *      字体/颜色/字号/位置全由版式决定 —— 手动调这些控件的界面整个删掉。
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
  it('是**版式模板化**的：选版式 + 只填两个必要字段', () => {
    // 版式选择器必须在
    expect(src).toContain('ck-layouts')
    expect(src).toContain('applyLayout')
    // 手动调字体/颜色/字号的控件必须**没有**（这是 2026-10-27 删掉的）
    expect(src).not.toContain('ck-font__')
    expect(src).not.toContain('ck-swatch')
    expect(src).not.toContain('ck-size-chip')
    expect(src).not.toContain('FONT_OPTIONS')
    expect(src).not.toContain('COLOR_OPTIONS')
    // 也不能有看不出内容的下拉框
    expect(src).not.toMatch(/<select/)
  })

  it('默认只有两个必填字段（名字 + 留言），签名是可选的', () => {
    // 初始 texts 里不能有 signature
    const initial = src.match(/texts:\s*\[([\s\S]*?)\n  \],/)?.[1] || ''
    expect(initial).toContain("kind: 'name'")
    expect(initial).toContain("kind: 'message'")
    expect(initial).not.toContain("kind: 'signature'")
    // 签名要有单独的入口
    expect(src).toContain('addSignature')
  })

  it('换版式要保留用户已经写的字', () => {
    // applyLayout 只改位置/样式，不碰 text
    const fn = src.match(/function applyLayout[\s\S]*?\n\}/)?.[0] || ''
    expect(fn).toContain('updateText')
    expect(fn).not.toMatch(/text:\s*['"]/)
  })

  it('按钮不能再复用带 width:100% 的 .ck-input（那会让按钮变成超宽横条）', () => {
    // 版式按钮自己定尺寸
    expect(rule('\\.ck-layout')).not.toMatch(/width:\s*100%/)
    // 选项区用 grid 的 minmax(0, 1fr)，避免被内容顶开
    expect(rule('\\.ck-layouts')).toMatch(/minmax\(0,\s*1fr\)/)
  })

  it('预览 canvas 要能随容器收缩（否则窄屏整页横向滚动）', () => {
    expect(rule('\\.ck-comp__canvas')).toMatch(/max-width:\s*100%/)
    // grid/flex item 默认 min-width:auto，会被 canvas 固有宽度顶开
    expect(rule('\\.ck-comp__stage')).toMatch(/min-width:\s*0/)
  })

  // ---- 2026-11-20 原型对齐：交付按钮化 + 打印口径 ----

  it('打印/PDF 打的是合成后的成品图，不是没写字的人物底图', () => {
    const prepare = src.match(/async function preparePrintImage[\s\S]*?\n\}/)?.[0] || ''
    expect(prepare).toContain('exportCard(')
    expect(prepare).not.toContain('props.imageUrl')
    // 免费档跟下载同一口径：1024px + 水印
    expect(prepare).toContain('targetWidth: 1024')
    expect(prepare).toContain('watermark: true')
    expect(src).toContain('onBeforeUnmount')
  })

  it('打印层 teleport 到 body；card 格式第一张是空白封面', () => {
    expect(src).toContain('<Teleport to="body">')
    expect(src).toContain('ck-print-root')
    expect(src).toContain('ck-print-card--cover')
    expect(src).toContain("fmt.id === 'card' && n === 1")
    // 打印隔离必须隐藏 body 的其他直接子节点，否则会把页头页脚一起打出来
    expect(src).toMatch(/body > \*:not\(\.ck-print-root\)/)
  })

  it('PDF 每页张数 + 出血位是真选项：驱动打印层 CSS，不是摆设（2026-11-23）', () => {
    expect(src).toContain('pdfPerPage')
    expect(src).toContain('pdfBleed')
    // 打印层要按每页张数绑定 class，并有对应 CSS 排版
    expect(src).toContain('ck-print-n${pdfPerPage}')
    expect(src).toContain('ck-print--bleed')
    expect(src).toContain('grid-template-columns: repeat(2, auto)')
    expect(src).toContain('outline: 3mm solid')
  })
})
