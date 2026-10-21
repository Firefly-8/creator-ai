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
  styleType?: 'Comic' | 'Vibrant' | 'Medieval' | 'Watercolor'
  /** Default number of images to generate */
  defaultCount?: number
  /** Starter idea shown in the textarea */
  prompt: string
  hint: string
}

/**
 * MiniMax image API has NO dedicated logo/UI/design modes.
 * Differentiation is done via prompt templates + aspect_ratio (+ optional live styles).
 * I2I subject_reference is character-only (for character consistency), not general style transfer.
 */
export const IMAGE_SCENE_PRESETS: ImageScenePreset[] = [
  {
    id: 'logo',
    label: 'Logo / Brand',
    shortLabel: 'Logo',
    icon: 'ph-app-window',
    aspectRatio: '1:1',
    defaultCount: 4,
    prompt:
      'Minimal geometric brand logo mark for a music app named Pulse, periwinkle violet accent, flat vector, centered, clean white background, high contrast, scalable icon, no mockup, no tiny text clutter',
    hint: 'Square, flat vector, clean background. API has no dedicated logo mode — rely on prompt constraints.',
  },
  {
    id: 'ui',
    label: 'UI / Interface',
    shortLabel: 'UI',
    icon: 'ph-devices',
    aspectRatio: '9:16',
    defaultCount: 2,
    prompt:
      'Modern dark-mode music player mobile UI mockup, clean hierarchy, large album art, transport controls, violet accent #8b7cff, high-end product design, readable layout, soft depth, no illegible micro text',
    hint: 'Use 9:16 / 16:9 to simulate mobile or desktop UI. Describe components and information hierarchy.',
  },
  {
    id: 'design',
    label: 'Poster / Design',
    shortLabel: 'Poster',
    icon: 'ph-layout',
    aspectRatio: '3:4',
    defaultCount: 4,
    prompt:
      'Editorial brand poster design, bold typography as graphic shapes, generous negative space, modern Swiss-inspired layout, violet and charcoal palette, print-ready composition, conceptual not photoreal clutter',
    hint: 'Poster / brand visual board. Describe text as graphic elements, avoid requiring readable long sentences.',
  },
  {
    id: 'portrait',
    label: 'Portrait',
    shortLabel: 'Portrait',
    icon: 'ph-user-focus',
    aspectRatio: '3:4',
    defaultCount: 2,
    prompt:
      'Cinematic portrait of a young musician, soft window light, shallow depth of field, natural skin detail, 85mm look, calm expression, photorealistic',
    hint: 'Image-to-image works best here: upload a single-person frontal photo as character reference.',
  },
  {
    id: 'product',
    label: 'Product',
    shortLabel: 'Product',
    icon: 'ph-package',
    aspectRatio: '1:1',
    defaultCount: 4,
    prompt:
      'Studio product photography of wireless earbuds on matte charcoal pedestal, softbox lighting, subtle reflection, commercial catalog style, sharp material detail',
    hint: 'E-commerce / product studio look. Emphasize materials, lighting, and surface.',
  },
  {
    id: 'album',
    label: 'Album Cover',
    shortLabel: 'Album',
    icon: 'ph-vinyl-record',
    aspectRatio: '1:1',
    defaultCount: 4,
    prompt:
      'Square album cover art, rainy neon city night, moody synthwave atmosphere, abstract silhouette, no readable song title text, cinematic color grade',
    hint: 'Square cover. Use minimal readable text, focus on mood and composition.',
  },
  {
    id: 'general',
    label: 'General',
    shortLabel: 'General',
    icon: 'ph-image',
    aspectRatio: '16:9',
    defaultCount: 2,
    prompt:
      'Dreamy coastal cliff at golden hour, volumetric light, film still, rich color, photorealistic detail',
    hint: 'Freely describe subject, style, lighting, and composition; prompt optimization available.',
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

export const IMAGE_LIVE_STYLES = ['Comic', 'Vibrant', 'Medieval', 'Watercolor'] as const
