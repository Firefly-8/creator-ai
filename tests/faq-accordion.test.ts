/**
 * FAQ 手风琴守卫
 *
 * ⚠️ 背景（2026-10-21）：
 *   FAQ 之前在三个页面各写各的 `<details>`：
 *     · 首页 / 定价页 = 下边框 + 加号列表
 *     · for/[slug]     = 白卡片 + "+" 伪元素
 *   三套长相不一样，而且 `<details>` 允许多个同时展开 —— 那不是手风琴。
 *   现在统一成 `components/ui/FaqAccordion.vue`。
 *
 * 这个测试锁住：
 *   1. 三处 FAQ 都用同一个组件，不再有裸 `<details>`
 *   2. 组件是**一次只展开一个**（手风琴），不是多开
 *   3. 展开动画走 grid-template-rows（纯 CSS，不用 JS 量高度）
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8')

const acc = read('components/ui/FaqAccordion.vue')
const pages = {
  index: read('pages/index.vue'),
  pricing: read('pages/pricing.vue'),
  'for/[slug]': read('pages/for/[slug].vue'),
}

describe('FAQ 手风琴', () => {
  it('组件存在且注册名是文件名（pathPrefix: false）', () => {
    expect(acc).toContain('ck-acc__item')
    expect(acc).toContain('aria-expanded')
  })

  it('一次只展开一个 —— open 是单个索引，不是数组', () => {
    // open 必须是单值（-1 = 全收起），不能是数组/Set
    expect(acc).toMatch(/const open = ref\(/)
    expect(acc).not.toMatch(/const open = ref\(\[\]/)
    expect(acc).not.toMatch(/const open = ref\(new Set/)
    // 点一条 → 另一条自动收起
    expect(acc).toMatch(/open\.value = open\.value === i \? -1 : i/)
  })

  it('展开动画用 grid-template-rows（纯 CSS 高度动画）', () => {
    expect(acc).toContain('grid-template-rows: 0fr')
    expect(acc).toContain('grid-template-rows: 1fr')
  })

  it.each(Object.entries(pages))('%s 的 FAQ 用共用组件，不再有裸 <details>', (_name, src) => {
    expect(src).toContain('<FaqAccordion')
    expect(src).not.toMatch(/<details/)
    expect(src).not.toContain('ck-faq__item')
  })
})
