/**
 * 样例底图（"No photo handy?" 的兜底）
 *
 * 竞品 Orylia 有同样的设计：没有照片也能先做一张，降低第一步的门槛。
 * 样例图放在 public/samples/ 下，是无文字的纯画面（带字的成品不能当参考图用）。
 */
import { defineEventHandler } from 'h3'

const SAMPLES = [
  { id: 'person-pet', url: '/samples/person-pet.webp', label: 'A golden retriever in a party hat' },
  { id: 'person-grandma', url: '/samples/person-grandma.webp', label: 'Golden balloons and white roses' },
  { id: 'person-mum', url: '/samples/person-mum.webp', label: 'Roses and a cup of tea' },
  { id: 'scene-christmas', url: '/samples/scene-christmas.webp', label: 'A decorated Christmas tree' },
  { id: 'scene-wallart', url: '/samples/scene-wallart.webp', label: 'A village street in the afternoon' },
]

export default defineEventHandler(() => {
  // 随机挑一个，让用户每次看到的都不一样
  const pick = SAMPLES[Math.floor(Math.random() * SAMPLES.length)]
  return { ...pick, samples: SAMPLES }
})
