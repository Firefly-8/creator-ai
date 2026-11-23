/**
 * 格式入口守卫（2026-11-23）
 *
 * 竞品从入口就分 Invite / Card：Wedding 页只有 Magic Invite，Greeting cards 页是
 * Magic card。我们项目没有 Wedding 分类页，所以在首页双格式块分流，其余落地页
 * 全部带 ?format=card。弹窗文案/字段必须跟着入口走，不能出现：
 *   - 从 Invitation 进来却看到 "Describe the card you want"（跨页复用错误）
 *   - 落地页漏带 format，靠默认值兜底（以后改默认值会全站串味）
 *   - 弹窗里还能切格式（入口就定了，切了会前后矛盾）
 *
 * 这类问题不会报错，全靠测试盯着。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CARD_FORMATS,
  CARD_FORMAT_COPY,
  getCardFormat,
  parseCardFormat,
} from '../utils/cardFormats'

const ROOT = process.cwd()
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8')
}

describe('格式白名单解析', () => {
  it('只有 invite/card 两个格式，非法值一律回落 card', () => {
    expect(parseCardFormat('invite')).toBe('invite')
    expect(parseCardFormat('card')).toBe('card')
    expect(parseCardFormat('')).toBe('card')
    expect(parseCardFormat(null)).toBe('card')
    expect(parseCardFormat('wedding')).toBe('card')
    expect(parseCardFormat('CARD')).toBe('card')
    expect(parseCardFormat('undefined')).toBe('card')
  })

  it('getCardFormat 未知 id 回落 card，且两种格式字段不同', () => {
    expect(getCardFormat('invite').extraLabel).toBe('When & where')
    expect(getCardFormat('card').extraLabel).toBe('A little detail')
    expect(getCardFormat('bogus').id).toBe('card')
    expect(CARD_FORMATS.invite.promptClause).not.toBe(CARD_FORMATS.card.promptClause)
    // 2026-11-23：主屏第一个框已收名字，extra 不能再问「是谁」，否则两框语义撞车
    expect(getCardFormat('card').extraLabel).not.toMatch(/who/i)
  })
})

describe('每种格式的文案映射完整且不同', () => {
  it('invite/card 的 eyebrow、标题、CTA 都不同（避免跨页串味）', () => {
    const inv = CARD_FORMAT_COPY.invite
    const card = CARD_FORMAT_COPY.card
    expect(inv.eyebrow).toContain('Invite')
    expect(card.eyebrow).toContain('Card')
    expect(inv.title).toMatch(/invitation/i)
    expect(card.title).toMatch(/card/i)
    expect(inv.title).not.toBe(card.title)
    expect(inv.ctaNoun).toBe('invitation')
    expect(card.ctaNoun).toBe('card')
    // 英文冠词要对：an invitation / a card
    expect(inv.ctaPhrase).toBe('Make an invitation')
    expect(card.ctaPhrase).toBe('Make a card')
    expect(inv.heroHeadline).not.toBe(card.heroHeadline)
  })

  it('每个格式该有的文案键都齐全', () => {
    for (const copy of Object.values(CARD_FORMAT_COPY)) {
      for (const key of ['eyebrow', 'title', 'heroHeadline', 'heroLede', 'sectionTitle', 'sectionNote', 'ctaNoun', 'ctaPhrase'] as const) {
        expect(copy[key]).toBeTruthy()
      }
    }
  })
})

describe('弹窗文案跟入口走，不写死', () => {
  const src = read('pages/cards.vue')

  it('弹窗 eyebrow/标题/hero 都读 formatCopy，不写死 card', () => {
    expect(src).toContain('{{ formatCopy.eyebrow }}')
    // 工作区标题经 workspaceTitle/Eyebrow，参数相仍回落到 formatCopy
    expect(src).toContain('formatCopy.value.title')
    expect(src).toContain('formatCopy.value.eyebrow')
    expect(src).toContain('formatCopy.value.heroHeadline')
    expect(src).toContain('formatCopy.value.heroLede')
    // 不能再出现写死的旧标题
    expect(src).not.toContain('Describe the card you want')
    expect(src).not.toContain('Magic Card · one quick form</p>')
  })

  it('格式从 ?format= 读并白名单解析，不写死默认 card', () => {
    expect(src).toContain('parseCardFormat(String(route.query.format')
    // 续编旧卡按旧卡 format 覆盖
    expect(src).toContain('if (hit.format) cardFormat.value = parseCardFormat(hit.format)')
  })

  it('弹窗里没有格式切换卡，格式只由入口决定', () => {
    expect(src).not.toContain('CARD_FORMAT_LIST')
    expect(src).not.toContain('ck-format--on')
    // 2026-11-23 布局重构：格式只读说明条去掉了（主屏一屏表单），
    // 格式身份改由弹窗头部 eyebrow 显示（formatCopy.eyebrow 跟着入口走）。
    // 注意别用「全文是否含 ck-format-locked」断言 —— 样式区残留会造成假阳性。
    expect(src).not.toContain('class="ck-format-locked"')
    expect(src).toContain('class="ck-formmodal__eyebrow">{{ workspaceEyebrow }}')
    expect(src).toContain('return formatCopy.value.eyebrow')
  })

  it('生成按钮与 hero CTA 文案跟格式走', () => {
    expect(src).toContain('formatCopy.ctaNoun')
    expect(src).toContain('Making your ${formatCopy.ctaNoun}')
  })
})

describe('落地页入口一一对应', () => {
  it('首页双格式卡分别带 format=invite / format=card，且可点击', () => {
    const src = read('pages/index.vue')
    expect(src).toContain("to: '/cards?format=invite'")
    expect(src).toContain("to: '/cards?format=card'")
    expect(src).toContain('ck-why__item--link')
    expect(src).toContain(':to="f.to"')
  })

  it('首页其他入口全部显式带 format=card', () => {
    const src = read('pages/index.vue')
    // 裸 /cards 入口会靠默认值兜底，以后改默认值就串味
    expect(src).not.toContain('to="/cards"')
    expect(src).not.toContain('to="/cards?scenario=christmas"')
    expect(src).toContain('scenario=christmas&format=card')
    expect(src).toContain('&format=card`,')
  })

  it('场景页 / gallery / blog / 资产 / 定价页入口都带 format=card', () => {
    for (const file of [
      'pages/for/[slug].vue',
      'pages/gallery/index.vue',
      'pages/blog/index.vue',
      'pages/blog/[slug].vue',
      'pages/my-assets.vue',
      'pages/pricing.vue',
    ]) {
      const src = read(file)
      // 有任何一条到 /cards 的链接就必须带 format（续编 ?from= 除外，它按旧卡走）
      expect(src).toMatch(/\/cards\?[^\s"'`]*format=card/, `${file} 应有带 format=card 的入口`)
    }
  })

  it('续编旧卡 ?from= 不带 format（按旧卡 meta.format 覆盖）', () => {
    const src = read('pages/my-assets.vue')
    expect(src).toContain('`/cards?from=${c.id}`')
    expect(src).not.toContain('?from=${c.id}&format=')
  })
})
