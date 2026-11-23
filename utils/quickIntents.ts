/**
 * 快捷场合入口 —— Create Keepsakes
 *
 * ⚠️ 为什么要这个（2026-11-17 减步改造）：
 *   原来的第 1 步是「6 个分组 tab → 22 个场景卡片」的**两级选择**。
 *   中老年用户看到 "Birthday / Milestone Birthday / Wedding & Anniversary /
 *   New Baby / Graduation / Retirement / Thank You / Get Well Soon / Sympathy /
 *   Christmas / Easter / Hanukkah / Diwali / Lunar New Year / My Hometown /
 *   A Place I Loved / Our Home / The Garden / Four Seasons /
 *   Restore an Old Photo / Family Reunion / My Dog or Cat"
 *   要先理解"分组"这个概念,再在组里选 —— 两层决策,卡住不动。
 *
 *   现在改成：**默认只给 8 个高频场合**（一次点击），
 *   完整的 22 个折进「More occasions」。
 *   快速路径 = 1 次点击；完整路径 = 想找的人少 1 次点击。
 *
 * 场景 id 必须和 utils/imageScenarios.ts 里的 IMAGE_SCENARIOS 对得上。
 */
export interface QuickIntent {
  /** IMAGE_SCENARIOS 里的 id */
  id: string
  /** 给用户看的大白话 */
  label: string
  /** 点了之后往「想说什么」框里填的开场白（用户可以改） */
  starter: string
  /** 图标类名（iconify） */
  icon: string
}

/**
 * 8 个高频场合。
 *
 * 选取依据：覆盖「送礼 / 表达情感」两大类里最常见的场景，
 * 且这些场景**不需要额外上下文**就能出图。
 */
export const QUICK_INTENTS: QuickIntent[] = [
  {
    id: 'birthday',
    label: 'Birthday',
    starter: "Happy birthday — wishing you a wonderful day and another year of good health.",
    icon: 'i-ph-cake',
  },
  {
    id: 'wedding',
    label: 'Wedding or anniversary',
    starter: 'Congratulations on your special day — here is to many more happy years together.',
    icon: 'i-ph-heart',
  },
  {
    id: 'new-baby',
    label: 'New baby',
    starter: 'Congratulations on the new arrival — wishing the whole family happiness and health.',
    icon: 'i-ph-baby',
  },
  {
    id: 'thank-you',
    label: 'Thank you',
    starter: 'Thank you — you made my day. I am so grateful for everything you did.',
    icon: 'i-ph-hand-heart',
  },
  {
    id: 'get-well',
    label: 'Get well soon',
    starter: 'Wishing you a quick recovery — thinking of you and sending all my love.',
    icon: 'i-ph-first-aid',
  },
  {
    id: 'sympathy',
    label: 'Sympathy',
    starter: 'I am so sorry for your loss. Keeping you in my thoughts and my heart.',
    icon: 'i-ph-flower-lotus',
  },
  {
    id: 'christmas',
    label: 'Christmas',
    starter: 'Merry Christmas — wishing you a warm and joyful holiday with the people you love.',
    icon: 'i-ph-gift',
  },
  {
    id: 'graduation',
    label: 'Graduation',
    starter: 'Congratulations on your graduation — so proud of you and everything you have achieved.',
    icon: 'i-ph-graduation-cap',
  },
]

/** 在快捷入口里找场景 id */
export function findQuickIntent(id: string): QuickIntent | null {
  return QUICK_INTENTS.find(q => q.id === id) || null
}
