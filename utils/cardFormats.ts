/**
 * 卡片格式定义（2026-11-20 按原型稿引入）
 *
 * 竞品 Greetings Island 从入口就区分两种格式，参数字段和版式都不同。
 * 我们沿用这个结构，但**不做 RSVP**（练手项目，不碰后端）：
 *
 *   - invite 邀请函 → 单卡片，正面印活动日期/地点
 *   - card   贺卡   → 带封面对开：封面是干净的（AI 只生成内页图 + 排版文字），
 *                     打印时多一张空白封面页，对折即用
 *
 * 两种格式共用同一套场景/画风/生图链路，只在「填什么字段」「版式提示」「prompt 微调」上分叉。
 */

export type CardFormat = 'invite' | 'card'

export interface CardFormatDef {
  id: CardFormat
  /** 短标签（步骤条/切换 tab 上） */
  label: string
  /** 图标（UnoCSS class） */
  icon: string
  /** 一句话说明这个格式是什么 */
  desc: string
  /** 卡片上的徽章 */
  badge: string
  /** 额外字段的标签（在通用「名字/照片」之外多问的一项） */
  extraLabel: string
  /** 额外字段的占位提示 */
  extraPlaceholder: string
  /** 编辑器里给的版式提示 */
  layoutHint: string
  /** 打印说明（交付区展示） */
  printNote: string
  /** 生图 prompt 追加的微调（对内页画面） */
  promptClause: string
}

export const CARD_FORMATS: Record<CardFormat, CardFormatDef> = {
  invite: {
    id: 'invite',
    label: 'Invitation',
    icon: 'ph-calendar-heart',
    desc: 'A single flat card. The date and place go on the front.',
    badge: 'SINGLE CARD',
    extraLabel: 'When & where',
    extraPlaceholder: 'e.g. Sat 14 June, 3pm, at our house',
    layoutHint: 'Flat card · date and place printed on the front',
    printNote: 'Print on one side of card stock and cut to size. The date and place are printed on the card.',
    promptClause: 'a clean flat invitation artwork, space at the bottom for event details',
  },
  card: {
    id: 'card',
    label: 'Greeting card',
    icon: 'ph-envelope-open',
    desc: 'A folded card with a cover. The picture and your words go inside.',
    badge: 'FOLDED CARD',
    // 2026-11-23 布局重构：第一个框已经收了名字，这里不能再问一遍「是谁」。
    // 对齐竞品 Card details 的第二个意图 —— 说清楚这张卡是给谁的、想表达什么。
    extraLabel: 'A little detail',
    extraPlaceholder: 'e.g. her 70th, the garden, an inside joke',
    layoutHint: 'Folded card · artwork and words inside, blank cover',
    printNote: 'Print the inside page and the blank cover page on one sheet, fold down the middle. The cover is left clean on purpose.',
    promptClause: 'an inside-page illustration for a folded greeting card, centred composition, calm background for lettering',
  },
}

export const CARD_FORMAT_LIST = [CARD_FORMATS.invite, CARD_FORMATS.card]

export function getCardFormat(id: string | null | undefined): CardFormatDef {
  return id === 'invite' ? CARD_FORMATS.invite : CARD_FORMATS.card
}

/**
 * 格式入口文案（2026-11-23：落地页 → 入口 → 弹窗一一对应）
 *
 * 竞品从入口就分 Invite / Card：Wedding 页只有 Magic Invite，Greeting cards 页是
 * Magic card。我们项目没有 Wedding 分类页，所以在首页双格式块做分流：
 *   Invitation 卡 → /cards?format=invite
 *   Greeting card 卡 → /cards?format=card
 * 其余落地页全部带 format=card（不靠默认值兜底，避免跨页复用错误）。
 *
 * ⚠️ 文案必须按格式走，不能写死 "Describe the card you want" ——
 *    invite 入口进来的用户看到 "card" 会以为走错了。
 */
export interface CardFormatCopy {
  /** 弹窗 eyebrow：Magic Invite / Magic Card */
  eyebrow: string
  /** 弹窗标题：对齐竞品 "Customize your AI invite" */
  title: string
  /** hero 文案（结果区为空时） */
  heroHeadline: string
  heroLede: string
  /** 分区 1「What are we making?」的小标题 */
  sectionTitle: string
  /** 格式只读说明条的补充（跟 formatDef.desc 拼一起） */
  sectionNote: string
  /** 生成按钮前缀：Make a ... */
  ctaNoun: string
  /** 带冠词的完整短语（hero CTA 用）：Make an invitation / Make a card */
  ctaPhrase: string
}

export const CARD_FORMAT_COPY: Record<CardFormat, CardFormatCopy> = {
  invite: {
    eyebrow: 'Magic Invite · one quick form',
    title: 'Customize your AI invitation',
    heroHeadline: "Let's set the date.",
    heroLede: 'One short form — tell us about the event, add a photo and a name, choose a look. No prompt to write, no font to pick.',
    sectionTitle: 'What are we celebrating?',
    sectionNote: 'Date and place are printed on the front, ready to cut and hand out.',
    ctaNoun: 'invitation',
    ctaPhrase: 'Make an invitation',
  },
  card: {
    eyebrow: 'Magic Card · one quick form',
    title: 'Customize your AI card',
    heroHeadline: "Let's make their day.",
    heroLede: 'One short form — pick an occasion, add a photo and a name, choose a look. No prompt to write, no font to pick.',
    sectionTitle: 'What are we making?',
    sectionNote: 'A folded card with a cover. The picture and your words go inside.',
    ctaNoun: 'card',
    ctaPhrase: 'Make a card',
  },
}

/** URL ?format= 白名单解析：非法值一律回落到 card，不让用户拼出第三种格式 */
export function parseCardFormat(raw: string | null | undefined): CardFormat {
  return raw === 'invite' ? 'invite' : 'card'
}
