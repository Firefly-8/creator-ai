import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { IMAGE_STYLES, SCENARIO_GROUPS } from '../../utils/imageScenarios'

const root = resolve(__dirname, '../..')
const cardsSrc = readFileSync(resolve(root, 'pages/cards.vue'), 'utf8')

describe('步骤一/三 图标与语义配图', () => {
  it('每个画风都有语义图标 + 缩略图路径，且唯一', () => {
    expect(IMAGE_STYLES.length).toBeGreaterThan(8)
    const icons = new Set<string>()
    const thumbs = new Set<string>()
    for (const s of IMAGE_STYLES) {
      expect(s.icon, `${s.id} 缺 icon`).toMatch(/^ph-/)
      expect(s.thumb, `${s.id} 缺 thumb`).toMatch(/^style-thumbs\/.+\.webp(\?v=\d+)?$/)
      expect(icons.has(s.icon), `${s.icon} 重复`).toBe(false)
      icons.add(s.icon)
      expect(thumbs.has(s.thumb!), `${s.thumb} 重复`).toBe(false)
      thumbs.add(s.thumb!)
    }
  })

  it('每个场景分组都有语义图标，且唯一', () => {
    const icons = new Set<string>()
    for (const g of SCENARIO_GROUPS) {
      expect(g.icon, `${g.id} 缺 icon`).toMatch(/^ph-/)
      expect(icons.has(g.icon), `${g.icon} 重复`).toBe(false)
      icons.add(g.icon)
    }
  })

  it('步骤一渲染分组 tab 图标', () => {
    expect(cardsSrc).toContain('ck-tab__icon')
    expect(cardsSrc).toMatch(/:class="`i-\$\{g\.icon\}`"/)
  })

  it('步骤三渲染画风缩略图：assetUrl + 失败回退语义图标', () => {
    expect(cardsSrc).toContain("import { assetUrl } from '~/utils/assets'")
    expect(cardsSrc).toContain('assetUrl(st.thumb)')
    expect(cardsSrc).toContain('thumbFailed[st.id] = true')
    expect(cardsSrc).toMatch(/:class="`i-\$\{st\.icon\}`"/)
  })

  it('画风卡保留文字说明（缩略图不替代 desc）', () => {
    expect(cardsSrc).toContain('{{ st.desc || st.prompt }}')
  })
})
