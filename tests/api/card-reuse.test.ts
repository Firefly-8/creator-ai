/**
 * 旧卡复用 —— 单元测试
 *
 * ⚠️ 2026-11-17 减步改造的配套。
 *   用户在「我的作品」里打开一张做过的卡，以前**只有图，没有字** ——
 *   因为用户在浏览器里写的名字/留言从来没存过服务器，
 *   只存在下载那一刻现排的 canvas 上。
 *
 *   现在链路是：
 *     生成时 → generated_images.meta_json 里存 { card: { name, message, style, layout } }
 *     读列表 → publicImage() 把 card 带出来
 *     打开旧卡 → loadFromCard() 把 card.name / card.message 回填进表单
 *
 *   这条链路**没有一环会报错**，断了只是"字悄悄没了"，
 *   所以必须有测试盯着。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()

describe('旧卡复用 · meta_json → publicImage().card', () => {
  it('publicImage() 把 meta_json 里的 card 带出来', async () => {
    const { publicImage } = await import('../../server/utils/images')
    const row: any = {
      id: 'img_1',
      title: 'Birthday card',
      scene: 'birthday',
      model: 'image-01',
      mode: 'text2image',
      aspect_ratio: '9:16',
      status: 'done',
      image_path: null, // 不触发签名 URL（R2 不在单测环境）
      meta_json: JSON.stringify({
        card: { name: 'Margaret', message: 'Happy 80th!', style: 'watercolor', layout: 'classic' },
      }),
      error_message: null,
      created_at: '2026-11-17T00:00:00.000Z',
      updated_at: '2026-11-17T00:00:00.000Z',
    }
    const out: any = await publicImage(row)
    expect(out.card).toBeTruthy()
    expect(out.card.name).toBe('Margaret')
    expect(out.card.message).toBe('Happy 80th!')
    expect(out.card.style).toBe('watercolor')
    expect(out.card.layout).toBe('classic')
  })

  it('老记录（meta_json 里没有 card）不能炸，card 就是 undefined', async () => {
    const { publicImage } = await import('../../server/utils/images')
    const base: any = {
      id: 'img_2', title: 'old', scene: 'birthday', model: 'image-01', mode: 'text2image',
      aspect_ratio: '9:16', status: 'done', image_path: null,
      error_message: null, created_at: 'x', updated_at: 'x',
    }
    // 1) 没有 meta_json
    const a: any = await publicImage({ ...base, meta_json: null })
    expect(a.card).toBeUndefined()
    // 2) meta_json 是别的业务数据
    const b: any = await publicImage({ ...base, meta_json: JSON.stringify({ model: 'x' }) })
    expect(b.card).toBeUndefined()
    // 3) meta_json 是坏 JSON —— 不能整个接口跟着 500
    const c: any = await publicImage({ ...base, meta_json: '{not json' })
    expect(c.card).toBeUndefined()
  })

  it('生成接口把卡面数据写进 meta_json', () => {
    const src = readFileSync(join(ROOT, 'server/api/image/generate.post.ts'), 'utf8')
    expect(src).toContain('metaJson: JSON.stringify')
    expect(src).toMatch(/card:\s*\{/)
    expect(src).toContain('name: String(body?.name')
    expect(src).toContain('message: String(body?.message')
    expect(src).toContain('layout: String(body?.layout')
  })

  it('前端 open 旧卡时把字回填进表单', () => {
    const src = readFileSync(join(ROOT, 'pages/cards.vue'), 'utf8')
    const fn = src.match(/async function loadFromCard\(\)[\s\S]*?\n\}/)?.[0] || ''
    expect(fn).toContain('hit.card?.name')
    expect(fn).toContain('hit.card?.message')
    // 回填的 name/message 会经 computed prefilledTexts 落到成品上
    expect(src).toMatch(/const prefilledTexts = computed/)
  })
})
