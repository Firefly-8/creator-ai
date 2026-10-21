import { createRequire } from 'node:module'
import {
  defineConfig,
  presetAttributify,
  presetUno,
  presetIcons,
  transformerDirectives,
} from 'unocss'
import { SONG_PRESETS } from './utils/presets'
import ICON_SAFELIST_DATA from './utils/icon-safelist.json'

const ICON_SAFELIST: string[] = ICON_SAFELIST_DATA.safelist

const require = createRequire(import.meta.url)
const phIcons = require('@iconify-json/ph/icons.json')

/**
 * 图标 safelist —— **自动生成**，不要手写。
 *
 * ⚠️ 为什么必须自动生成（2026-10-21）：
 *   presetIcons 只扫源码里的**字面量**类名。动态拼接的图标名扫不到：
 *     <span :class="`i-${a.icon}`" />   →  首页 8 个受众入口的图标全都不显示
 *   之前手写了一份 40 个的 safelist 兜底，项目实际用到 90+ 个 —— 必然漏。
 *   现在跑 `node scripts/gen-icon-safelist.mjs` 全量收集。
 */
export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.15,
      // Node 22 can't dynamic-import JSON without import attributes;
      // load Phosphor via createRequire so icons actually resolve.
      collections: {
        ph: () => phIcons,
      },
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle',
      },
      warn: true,
    }),
  ],
  transformers: [transformerDirectives()],
  safelist: ICON_SAFELIST,
  theme: {
    colors: {
      ink: {
        50: '#f3f1fb',
        100: '#e6e2f4',
        200: '#c9c3dd',
        300: '#a39db8',
        400: '#817b99',
        500: '#655f7c',
        600: '#4a455e',
        700: '#322e42',
        800: '#221f30',
        900: '#14121c',
        950: '#0a0910',
      },
      accent: {
        DEFAULT: '#8b7cff',
        soft: '#b4a9ff',
        deep: '#6e5ce6',
        mute: 'rgba(139, 124, 255, 0.14)',
      },
      danger: {
        DEFAULT: '#f07178',
        soft: '#f5a0a5',
      },
    },
    fontFamily: {
      display: '"Sora", sans-serif',
      sans: '"Manrope", sans-serif',
    },
  },
  shortcuts: {
    'btn-primary':
      'inline-flex items-center justify-center gap-2 h-11 rounded-full bg-accent px-5 text-[13.5px] font-semibold tracking-wide text-white shadow-[0_0_0_1px_rgba(139,124,255,0.28),0_10px_28px_-10px_rgba(110,92,230,0.65)] transition duration-200 hover:bg-accent-deep hover:shadow-[0_0_0_1px_rgba(139,124,255,0.4),0_14px_34px_-8px_rgba(110,92,230,0.75)] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100',
    'btn-secondary':
      'inline-flex items-center justify-center gap-2 h-11 rounded-full border border-white/[0.12] bg-white/[0.06] px-5 text-[13.5px] font-semibold tracking-wide text-white transition duration-200 hover:border-white/20 hover:bg-white/[0.1] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed',
    'btn-ghost':
      'inline-flex items-center justify-center gap-2 h-10 rounded-full border border-transparent bg-transparent px-3.5 text-[13px] font-medium text-ink-200 transition duration-200 hover:bg-white/[0.06] hover:text-white active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed',
    /* Prefer <UiIconButton> / <UiRefreshButton>; shortcut kept for legacy one-offs */
    'btn-icon':
      'inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-2.5 text-[12px] font-semibold text-ink-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-200 hover:border-white/20 hover:bg-white/[0.1] hover:text-white active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed',
    'btn-icon-lg':
      'inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink-950 shadow-[0_8px_24px_-8px_rgba(255,255,255,0.35)] transition duration-200 hover:scale-[1.04] hover:bg-accent-soft hover:text-ink-950 active:scale-[0.96] disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100',
    'field':
      'w-full rounded-2xl border border-white/[0.09] bg-[#100e18] px-4 py-3 text-[14px] leading-relaxed text-ink-50 placeholder:text-ink-500 outline-none transition duration-200 hover:border-white/[0.14] focus:border-accent/55 focus:bg-[#12101c] focus:shadow-[0_0_0_3px_rgba(139,124,255,0.18)]',
    'field-label':
      'block text-[12.5px] font-semibold tracking-wide text-ink-200',
    'field-hint':
      'text-[12px] leading-snug text-ink-400',
    'panel':
      'rounded-[1.35rem] border border-white/[0.07] bg-[#12101a]/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md',
    'chip':
      'inline-flex h-8 items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 text-[12px] font-medium text-ink-300 transition duration-150 hover:border-accent/35 hover:bg-accent-mute hover:text-accent-soft active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
    'chip-active':
      'inline-flex h-8 items-center rounded-full border border-accent/45 bg-accent-mute px-3 text-[12px] font-semibold text-accent-soft shadow-[0_0_0_1px_rgba(139,124,255,0.12)]',
    'segment':
      'inline-flex rounded-full border border-white/[0.08] bg-[#0e0c16] p-1',
    'segment-item':
      'relative rounded-full px-3.5 py-1.5 text-[13px] font-medium text-ink-300 transition duration-200 hover:text-white',
    'segment-item-active':
      'relative rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-[0_6px_18px_-8px_rgba(110,92,230,0.8)]',
    'status-pill':
      'inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12.5px] text-ink-200',
  },
})
