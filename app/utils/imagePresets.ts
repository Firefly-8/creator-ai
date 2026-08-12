export type ImageScene =
  | 'general'
  | 'logo'
  | 'ui'
  | 'design'
  | 'portrait'
  | 'product'
  | 'album'

export type ImageScenePreset = {
  id: ImageScene
  label: string
  shortLabel: string
  icon: string
  /** Default aspect for this scene */
  aspectRatio: string
  /** Suggested model */
  model?: 'image-01' | 'image-01-live'
  /** image-01-live style only */
  styleType?: '漫画' | '元气' | '中世纪' | '水彩'
  /** Starter idea shown in the textarea */
  prompt: string
  hint: string
}

/**
 * MiniMax image API has NO dedicated logo/UI/design modes.
 * Differentiation is done via prompt templates + aspect_ratio (+ optional live styles).
 * I2I subject_reference is character-only (人物主体一致性), not general style transfer.
 */
export const IMAGE_SCENE_PRESETS: ImageScenePreset[] = [
  {
    id: 'logo',
    label: 'Logo / 品牌标识',
    shortLabel: 'Logo',
    icon: 'ph-app-window',
    aspectRatio: '1:1',
    prompt:
      'Minimal geometric brand logo mark for a music app named Pulse, periwinkle violet accent, flat vector, centered, clean white background, high contrast, scalable icon, no mockup, no tiny text clutter',
    hint: '方形、扁平矢量、干净背景。API 无 logo 专用模式，靠提示词约束。',
  },
  {
    id: 'ui',
    label: '界面 / UI 稿',
    shortLabel: 'UI',
    icon: 'ph-devices',
    aspectRatio: '9:16',
    prompt:
      'Modern dark-mode music player mobile UI mockup, clean hierarchy, large album art, transport controls, violet accent #8b7cff, high-end product design, readable layout, soft depth, no illegible micro text',
    hint: '用 9:16 / 16:9 模拟手机或桌面界面。描述组件与信息层级。',
  },
  {
    id: 'design',
    label: '设计稿 / 海报',
    shortLabel: '设计稿',
    icon: 'ph-layout',
    aspectRatio: '3:4',
    prompt:
      'Editorial brand poster design, bold typography as graphic shapes, generous negative space, modern Swiss-inspired layout, violet and charcoal palette, print-ready composition, conceptual not photoreal clutter',
    hint: '海报/品牌视觉板。把文字当图形元素描述，避免要求可读长句。',
  },
  {
    id: 'portrait',
    label: '人物肖像',
    shortLabel: '肖像',
    icon: 'ph-user-focus',
    aspectRatio: '3:4',
    prompt:
      'Cinematic portrait of a young musician, soft window light, shallow depth of field, natural skin detail, 85mm look, calm expression, photorealistic',
    hint: '图生图最适合这个场景：上传单人正面照作 character 参考。',
  },
  {
    id: 'product',
    label: '产品展示',
    shortLabel: '产品',
    icon: 'ph-package',
    aspectRatio: '1:1',
    prompt:
      'Studio product photography of wireless earbuds on matte charcoal pedestal, softbox lighting, subtle reflection, commercial catalog style, sharp material detail',
    hint: '电商/产品棚拍感。强调材质、灯光与台面。',
  },
  {
    id: 'album',
    label: '专辑封面',
    shortLabel: '专辑',
    icon: 'ph-vinyl-record',
    aspectRatio: '1:1',
    prompt:
      'Square album cover art, rainy neon city night, moody synthwave atmosphere, abstract silhouette, no readable song title text, cinematic color grade',
    hint: '方形封面。少写可读文字，多用氛围与构图。',
  },
  {
    id: 'general',
    label: '通用创作',
    shortLabel: '通用',
    icon: 'ph-image',
    aspectRatio: '16:9',
    prompt:
      'Dreamy coastal cliff at golden hour, volumetric light, film still, rich color, photorealistic detail',
    hint: '自由描述主体、风格、光线与构图；可开提示词优化。',
  },
]

export const IMAGE_ASPECT_RATIOS = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
  { value: '21:9', label: '21:9' },
] as const

export const IMAGE_LIVE_STYLES = ['漫画', '元气', '中世纪', '水彩'] as const
