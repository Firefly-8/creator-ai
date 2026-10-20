/**
 * 场景 prompt 拼接自检 —— 保证没有占位符漏替换、场景/画风组合都合法
 * 用法：npx tsx scripts/test-scenario-prompts.ts
 */
import { buildScenarioPrompt, IMAGE_SCENARIOS, IMAGE_STYLES, SCENARIO_GROUPS } from '../utils/imageScenarios'

console.log('=== Create Keepsakes · 场景 prompt 抽查 ===\n')
for (const g of SCENARIO_GROUPS) {
  console.log(`───── ${g.label} ─────`)
  for (const s of IMAGE_SCENARIOS.filter(x => x.group === g.id)) {
    const styleId = s.styles?.[0] || IMAGE_STYLES[0].id
    const r = buildScenarioPrompt(s.id, styleId, s.askName ? 'Margaret' : '', '')!
    console.log(`\n【${s.label}】${s.desc}`)
    console.log(`  参考图:${s.needReference ? '要' : '不要'}  比例:${s.aspectRatio}  张数:${s.count}  画风:${r.style.label}`)
    console.log(`  ${r.prompt}`)
    if (s.askName && s.presetMessages?.length) {
      console.log(`  预设语: ${s.presetMessages[0]}`)
    }
  }
  console.log()
}

let bad = 0
for (const s of IMAGE_SCENARIOS) {
  for (const st of s.styles || IMAGE_STYLES.map(x => x.id)) {
    const r = buildScenarioPrompt(s.id, st, 'Margaret', 'extra')!
    if (/\{(name|style|extra)\}/.test(r.prompt)) { console.log(`❌ ${s.id}/${st} 占位符未替换`); bad++ }
    if (r.prompt.length > 1500) { console.log(`❌ ${s.id}/${st} prompt 超长 ${r.prompt.length}`); bad++ }
  }
}
console.log(bad === 0
  ? `✅ 全部 ${IMAGE_SCENARIOS.length} 个场景 / ${IMAGE_STYLES.length} 种画风组合通过（无漏占位符、无超长）`
  : `❌ ${bad} 个问题`)
