/**
 * 首页搜索入口守卫（2026-11-23）
 * 原型 home 页有关键词搜索框，实际落地页之前缺失。这里锁住它别被删。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const src = readFileSync(join(ROOT, 'pages/index.vue'), 'utf8')

describe('首页搜索入口', () => {
  it('有搜索输入框和即时结果下拉', () => {
    expect(src).toContain('type="search"')
    expect(src).toContain('ck-search__results')
    expect(src).toContain('searchResults')
  })

  it('搜索索引覆盖场景 + 人群两类', () => {
    expect(src).toContain('IMAGE_SCENARIOS.map')
    expect(src).toContain('AUDIENCES.map')
    // 结果要能跳到场景页和人群页
    expect(src).toContain('cards?scenario=')
    expect(src).toContain('audienceUrl')
  })

  it('多词 AND 过滤，且限制结果条数', () => {
    expect(src).toContain('words.every')
    expect(src).toContain('.slice(0, 6)')
  })
})
