/**
 * 贺卡版式模板
 *
 * ⚠️ 为什么做这个（2026-10-27）：
 *   原来的文字编辑面板让用户逐项挑「字体 / 颜色 / 字号 / 位置」，
 *   四个控件挤在一行、还没有标签 —— 中老年用户根本不知道该选什么，
 *   交付出来的东西八成是默认样式（也就是"随便挑的"）。
 *
 *   换成**成品版式**：用户选一个版式（"Classic" / "Handwritten"…），
 *   位置、字体、颜色、字号全部由版式定好，用户只填**两个必要字段**：
 *   **给谁的名字** + **想说的话**。
 *
 *   跟 giftsong 的思路一致：卖的是"成品感"，不是"调色板"。
 *
 * 坐标说明：x/y 是相对画布的 0~1，y 是文字**中心**的位置。
 * size 是相对画布**宽度**的字号（0.06 = 宽度的 6%）。
 */
import type { CardTextItem } from '~/composables/useCardCanvas'

export interface CardLayoutText {
  x: number
  y: number
  size: number
  color: string
  align: CanvasTextAlign
  font: CardTextItem['font']
  rotate?: number
}

export interface CardLayout {
  id: string
  label: string
  /** 一句话说明这个版式的感觉 */
  desc: string
  /** 是否带签名位置（用户可填可不填） */
  hasSignature: boolean
  texts: {
    name: CardLayoutText
    message: CardLayoutText
    signature?: CardLayoutText
  }
}

/** 墨色 / 珊瑚 / 森林 —— 和 Composer 里的色板一致 */
const INK = '#3a2f28'
const CORAL = '#c8543d'
const FOREST = '#2f4034'

export const CARD_LAYOUTS: CardLayout[] = [
  {
    id: 'classic',
    label: 'Classic',
    desc: 'Name large in the middle, message underneath. Safe and warm.',
    hasSignature: true,
    texts: {
      name: { x: 0.5, y: 0.79, size: 0.075, color: CORAL, align: 'center', font: 'display' },
      message: { x: 0.5, y: 0.868, size: 0.028, color: INK, align: 'center', font: 'body' },
      signature: { x: 0.5, y: 0.945, size: 0.047, color: INK, align: 'center', font: 'script' },
    },
  },
  {
    id: 'modern',
    label: 'Modern',
    desc: 'Name top left, message below it. Clean and simple.',
    hasSignature: false,
    texts: {
      name: { x: 0.14, y: 0.74, size: 0.062, color: INK, align: 'left', font: 'display' },
      message: { x: 0.14, y: 0.83, size: 0.026, color: FOREST, align: 'left', font: 'body' },
    },
  },
  {
    id: 'handwritten',
    label: 'Handwritten',
    desc: 'Like a note you wrote by hand. Best for a close friend.',
    hasSignature: true,
    texts: {
      name: { x: 0.5, y: 0.775, size: 0.07, color: INK, align: 'center', font: 'script' },
      message: { x: 0.5, y: 0.862, size: 0.032, color: INK, align: 'center', font: 'script' },
      signature: { x: 0.78, y: 0.945, size: 0.042, color: FOREST, align: 'right', font: 'script' },
    },
  },
  {
    id: 'minimal',
    label: 'Just the words',
    desc: 'One line, big. For when the message is the whole point.',
    hasSignature: false,
    texts: {
      name: { x: 0.5, y: 0.8, size: 0.05, color: INK, align: 'center', font: 'display' },
      message: { x: 0.5, y: 0.868, size: 0.034, color: INK, align: 'center', font: 'body' },
    },
  },
]

export function getCardLayout(id: string): CardLayout {
  return CARD_LAYOUTS.find(l => l.id === id) || CARD_LAYOUTS[0]
}
