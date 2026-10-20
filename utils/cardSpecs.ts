/**
 * 成品规格 —— 贺卡 / 装饰画的物理尺寸
 *
 * ⚠️ 内存约束（这是选尺寸的硬依据，不是随便定的）：
 *   ffmpeg.wasm 每一帧是 RGBA，内存 ≈ 宽 × 高 × 4 字节。
 *   - 5×7" @300dpi  = 1500×2100 = 12.6MB/帧  ✅ 稳妥
 *   - 16×20" @300dpi = 4800×6000 = 115MB/帧  ❌ wasm 堆撑不住
 *   所以墙画线统一按 150 DPI 出（Etsy 上大量卖家也用 150 DPI），
 *   贺卡线按 300 DPI 出（打印质量刚需）。
 *
 *   P0 验证项：在真实浏览器里跑最大规格（16×20" @150dpi = 2400×3000）
 *   确认不 OOM。若爆，降级到 120 DPI 或改成分块输出。
 */

export interface CardSpec {
  id: string
  label: string
  /** 物理尺寸（英寸），用于打印说明 */
  widthIn: number
  heightIn: number
  /** 输出像素 */
  width: number
  height: number
  /** 有效 DPI */
  dpi: number
  /** 用途分类 */
  use: 'card' | 'wall'
  /** 一句话说明 */
  note: string
}

export const CARD_SPECS: CardSpec[] = [
  {
    id: '5x7',
    label: '5 × 7 in',
    widthIn: 5,
    heightIn: 7,
    width: 1500,
    height: 2100,
    dpi: 300,
    use: 'card',
    note: 'The standard US card size. Prints perfectly on card stock.',
  },
  {
    id: '4x6',
    label: '4 × 6 in',
    widthIn: 4,
    heightIn: 6,
    width: 1200,
    height: 1800,
    dpi: 300,
    use: 'card',
    note: 'A smaller, classic postcard size.',
  },
  {
    id: 'a6',
    label: 'A6',
    widthIn: 4.13,
    heightIn: 5.83,
    width: 1240,
    height: 1748,
    dpi: 300,
    use: 'card',
    note: 'The standard European card size.',
  },
  {
    id: '16x20',
    label: '16 × 20 in',
    widthIn: 16,
    heightIn: 20,
    width: 2400,
    height: 3000,
    dpi: 150,
    use: 'wall',
    note: 'A large wall canvas — the most popular size for home walls.',
  },
  {
    id: 'a3',
    label: 'A3',
    widthIn: 11.7,
    heightIn: 16.5,
    width: 1754,
    height: 2480,
    dpi: 150,
    use: 'wall',
    note: 'A standard poster / large print size.',
  },
]

export function getCardSpec(id: string): CardSpec {
  return CARD_SPECS.find(s => s.id === id) || CARD_SPECS[0]
}

/** 场景 → 默认成品规格 */
export function defaultSpecFor(use: 'card' | 'wall'): CardSpec {
  return use === 'wall'
    ? CARD_SPECS.find(s => s.id === '16x20')!
    : CARD_SPECS.find(s => s.id === '5x7')!
}
