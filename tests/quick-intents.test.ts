/**
 * 快捷场合入口的守卫测试
 *
 * ⚠️ 为什么要这个（2026-11-17）：
 *   QUICK_INTENTS 里的 id 是**手写的字符串**，跟 IMAGE_SCENARIOS 的 id
 *   靠人工对齐。改了 imageScenarios.ts 里的 id（比如 get-well-soon → get-well），
 *   快捷入口就静默失效 —— 点下去场景为空，用户一脸懵，还不报错。
 *
 *   这类"两个文件靠字符串对齐"的地方，必须有守卫测试。
 */
import { describe, it, expect } from 'vitest'
import { IMAGE_SCENARIOS } from '../utils/imageScenarios'
import { QUICK_INTENTS, findQuickIntent } from '../utils/quickIntents'

describe('quick intents', () => {
  it('每个快捷入口都对应一个真实存在的场景', () => {
    const ids = new Set(IMAGE_SCENARIOS.map(s => s.id))
    for (const q of QUICK_INTENTS) {
      expect(ids.has(q.id), `快捷入口 "${q.label}" (${q.id}) 在 IMAGE_SCENARIOS 里不存在`).toBe(true)
    }
  })

  it('快捷入口不重复', () => {
    const seen = new Set<string>()
    for (const q of QUICK_INTENTS) {
      expect(seen.has(q.id), `重复的快捷入口 id: ${q.id}`).toBe(false)
      seen.add(q.id)
    }
  })

  it('每个快捷入口都有开场白和图标（点了就能出图，不用用户再想）', () => {
    for (const q of QUICK_INTENTS) {
      expect(q.starter.trim().length, `${q.id} 缺开场白`).toBeGreaterThan(10)
      expect(q.icon.trim().length, `${q.id} 缺图标`).toBeGreaterThan(3)
      expect(q.label.trim().length, `${q.id} 缺标签`).toBeGreaterThan(2)
    }
  })

  it('findQuickIntent 找得到 / 找不到返回 null', () => {
    expect(findQuickIntent('birthday')?.id).toBe('birthday')
    expect(findQuickIntent('nope')).toBeNull()
  })

  it('快捷入口数量控制在 8 个以内（再多就变成选择题了）', () => {
    expect(QUICK_INTENTS.length).toBeLessThanOrEqual(8)
  })
})
