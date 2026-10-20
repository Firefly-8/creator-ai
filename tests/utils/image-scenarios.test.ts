import { describe, it, expect } from 'vitest'
import {
  IMAGE_SCENARIOS,
  IMAGE_STYLES,
  SCENARIO_GROUPS,
  buildScenarioPrompt,
  getScenario,
  getStyle,
  stylesForScenario,
  NO_TEXT_CLAUSE,
  HEADLINE_SPACE_CLAUSE,
} from '../../utils/imageScenarios'

describe('imageScenarios · 场景库结构', () => {
  it('场景 id 唯一', () => {
    const ids = IMAGE_SCENARIOS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('画风 id 唯一', () => {
    const ids = IMAGE_STYLES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('每个场景引用的画风都存在', () => {
    for (const s of IMAGE_SCENARIOS) {
      for (const sid of s.styles || []) {
        expect(getStyle(sid), `${s.id} 引用了不存在的画风 ${sid}`).toBeDefined()
      }
    }
  })

  it('每个场景的 group 都在分组表里', () => {
    const groups = SCENARIO_GROUPS.map(g => g.id)
    for (const s of IMAGE_SCENARIOS) {
      expect(groups).toContain(s.group)
    }
  })

  it('每个分组至少有一个场景（不能有空分组）', () => {
    for (const g of SCENARIO_GROUPS) {
      const n = IMAGE_SCENARIOS.filter(s => s.group === g.id).length
      expect(n, `分组 ${g.id} 是空的`).toBeGreaterThan(0)
    }
  })

  it('所有画风都已实测通过（新增画风必须先跑 scripts/test-i2i-consistency.py）', () => {
    const unproven = IMAGE_STYLES.filter(s => !s.proven).map(s => s.id)
    expect(unproven, '这些画风还没实测过，先实测再标 proven').toEqual([])
  })

  it('i2i 安全名单是硬约束（强画风会改写参考图里的主体）', () => {
    // 实测依据：impressionist 在 i2i 下把参考图里的狗换成了另一只；
    // sepia / vintage-postcard 在 i2i 下分别失效、只半生效。
    const I2I_SAFE = [
      'photo', 'watercolor', 'oil', 'oil-pastel',
      'paper-cut', 'vintage-color', 'cartoon',
    ]
    const marked = IMAGE_STYLES.filter(s => s.i2iSafe).map(s => s.id).sort()
    expect(marked).toEqual([...I2I_SAFE].sort())
  })

  it('需要参考图的场景只能用 i2i 安全画风', () => {
    for (const s of IMAGE_SCENARIOS) {
      if (!s.needReference) continue
      for (const sid of s.styles || []) {
        expect(getStyle(sid)?.i2iSafe, `${s.id} 用了 i2i 不安全的画风 ${sid}`).toBe(true)
      }
    }
  })
})

describe('buildScenarioPrompt · prompt 拼装', () => {
  it('占位符全部被替换', () => {
    for (const s of IMAGE_SCENARIOS) {
      for (const st of s.styles || IMAGE_STYLES.map(x => x.id)) {
        const r = buildScenarioPrompt(s.id, st, 'Margaret', 'a sunny afternoon')!
        expect(r, `${s.id}/${st} 应该能拼出来`).toBeTruthy()
        expect(r.prompt).not.toMatch(/\{(name|style|extra)\}/)
      }
    }
  })

  it('画风描述确实进了 prompt', () => {
    const r = buildScenarioPrompt('birthday', 'oil-pastel', 'Margaret', '')!
    expect(r.prompt).toContain('oil pastel')
    expect(r.prompt).toContain('Margaret')
  })

  it('场景关键词被追加', () => {
    const r = buildScenarioPrompt('birthday', 'photo', 'Margaret', '')!
    expect(r.prompt).toContain('birthday')
  })

  it('不存在的场景返回 null', () => {
    expect(buildScenarioPrompt('not-exist', 'photo')).toBeNull()
  })

  it('不存在的画风回落到第一个画风', () => {
    const r = buildScenarioPrompt('birthday', 'not-exist', '', '')!
    expect(r.style.id).toBe(IMAGE_STYLES[0].id)
  })

  it('prompt 长度不超 MiniMax 限制', () => {
    for (const s of IMAGE_SCENARIOS) {
      for (const st of s.styles || IMAGE_STYLES.map(x => x.id)) {
        const r = buildScenarioPrompt(s.id, st, 'Margaret Smith', 'a long extra description '.repeat(10))!
        expect(r.prompt.length, `${s.id}/${st} 太长`).toBeLessThan(1500)
      }
    }
  })

  it('需要填名字的场景都带预设祝贺语（AI 挂了也有兜底）', () => {
    for (const s of IMAGE_SCENARIOS) {
      if (!s.askName) continue
      expect(s.presetMessages?.length, `${s.id} 缺少 presetMessages`).toBeGreaterThan(0)
      for (const m of s.presetMessages!) {
        expect(m.length).toBeGreaterThan(8)
        expect(m.length).toBeLessThan(120)
      }
    }
  })

  it('需要参考图的场景 count 不超过 4（生成慢，要控成本）', () => {
    for (const s of IMAGE_SCENARIOS) {
      expect(s.count, `${s.id} 张数过多`).toBeLessThanOrEqual(4)
    }
  })
})

describe('stylesForScenario · 按模式过滤画风', () => {
  it('i2i 场景自动过滤掉不安全画风', () => {
    const pet = getScenario('pet')!
    const withRef = stylesForScenario(pet, true).map(s => s.id)
    const withoutRef = stylesForScenario(pet, false).map(s => s.id)
    expect(withRef.every(id => getStyle(id)!.i2iSafe)).toBe(true)
    expect(withoutRef.length).toBeGreaterThanOrEqual(withRef.length)
  })

  it('t2i 场景保留全部画风', () => {
    const birthday = getScenario('birthday')!
    const list = stylesForScenario(birthday, false)
    expect(list.length).toBe(birthday.styles!.length)
  })

  it('过滤后不能为空（必须有兜底）', () => {
    for (const s of IMAGE_SCENARIOS) {
      expect(stylesForScenario(s, true).length).toBeGreaterThan(0)
    }
  })
})

describe('成品排版约束 · 文字必须由我们排，不许模型写', () => {
  it('每个场景的 prompt 都带「画面里不许出现文字」的负面约束', () => {
    // 实测证据：showcase 里出现过 "Happy 70th Runthdscket" 这种模型自写字
    for (const sc of IMAGE_SCENARIOS) {
      const built = buildScenarioPrompt(sc.id, sc.styles![0], 'Margaret', '')
      expect(built, sc.id).not.toBeNull()
      expect(built!.prompt, sc.id).toContain('no text')
      expect(built!.prompt, sc.id).toContain('no lettering')
      expect(built!.prompt, sc.id).toContain('no numbers')
    }
  })

  it('带文字的场景留出标题空间，纯装饰画满幅', () => {
    const birthday = buildScenarioPrompt('birthday', 'watercolor', 'Margaret', '')!
    expect(birthday.prompt).toContain('empty space in the upper third')

    for (const sc of IMAGE_SCENARIOS) {
      if (sc.group !== 'wallart') continue
      const built = buildScenarioPrompt(sc.id, sc.styles![0], '', '')!
      expect(built.prompt, sc.id).not.toContain('empty space in the upper third')
    }
  })

  it('数字不由模型画（避免 "Runthdscket" 式错误，数字由排版层加）', () => {
    const milestone = buildScenarioPrompt('milestone', 'oil', 'Margaret 70', '')!
    expect(milestone.prompt).not.toMatch(/number balloon/i)
  })

  it('提示词里不要出现 "card" —— 会让模型理解为「画一张卡片」并自己写字', () => {
    for (const sc of IMAGE_SCENARIOS) {
      const built = buildScenarioPrompt(sc.id, sc.styles![0], 'Margaret', '')!
      // 允许 "picture" / "greeting picture"，但不允许 "card"
      expect(built.prompt, sc.id).not.toMatch(/\bcard\b/i)
    }
  })

  it('负面约束常量本身不含字面量 "text" 之外的诱导词', () => {
    expect(NO_TEXT_CLAUSE).toContain('no text')
    expect(HEADLINE_SPACE_CLAUSE).toContain('upper third')
  })
})
