<template>
  <StudioWorkspace>
    <template #header>
      <div>
        <h1 class="font-display text-2xl font-700 text-white md:text-3xl">Image</h1>
        <p class="mt-1 text-[13.5px] text-ink-300">{{  $t('image.textToImage')  }} · {{  $t('image.scenePresets')  }} + {{  $t('image.optimizePrompt')  }}</p>
      </div>
    </template>

    <template #ops>
      <div class="space-y-4">
        <div v-if="remixFrom" class="ui-ops-banner">
          <div>
            <p class="ui-ops-banner__title">{{ $t('image.remixedFrom', { title: remixFrom }) }}</p>
            <p class="ui-ops-banner__hint">{{ $t('image.remixHint') }}</p>
          </div>
          <UiIconButton
            icon="i-ph-x"
            variant="ghost"
            size="sm"
            aria-label="Clear"
            @click="clearRemix"
          />
        </div>
        <UiSegmented v-model="mode" :options="modes" equal />
        <section class="space-y-2">
          <p class="field-label">{{ $t('image.scenePresets') }}</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="preset in IMAGE_SCENE_PRESETS"
              :key="preset.id"
              type="button"
              class="chip"
              :class="scene === preset.id ? 'chip-active !border-accent/45' : ''"
              @click="applyScene(preset)"
            >
              <span class="mr-1.5 text-[14px]" :class="`i-${preset.icon}`" />
              {{ preset.shortLabel }}
            </button>
          </div>
          <p class="field-hint">{{ activeScene?.hint }}</p>
        </section>

        <label class="block space-y-2">
          <span class="field-label">{{ $t('image.prompt') }} · {{ prompt.length }}/1500</span>
          <textarea
            v-model="prompt"
            class="field min-h-32"
            maxlength="1500"
            placeholder="{{ $t('image.promptPlaceholder') }}"
          />
        </label>

        <div class="flex flex-wrap gap-2">
          <UiButton
            variant="secondary"
            size="sm"
            :loading="optimizing"
            :disabled="!prompt.trim() || generating"
            @click="optimizePrompt"
          >
            <span class="i-ph-magic-wand text-[14px]" />
            {{ optimizing ? $t('image.optimizing') : $t('image.optimizePrompt') }}
          </UiButton>
          <label class="status-pill cursor-pointer select-none">
            <input v-model="promptOptimizer" type="checkbox" class="accent-[#8b7cff]" >
            API prompt_optimizer
          </label>
          <label class="status-pill cursor-pointer select-none">
            <input v-model="deepOptimize" type="checkbox" class="accent-[#8b7cff]" >
            {{ $t('image.deepOptimize') }}
          </label>
        </div>
        <p v-if="optimizeNotes" class="field-hint">{{ optimizeNotes }}</p>
        <p
          v-if="promptFinal && promptFinal !== prompt"
          class="rounded-2xl border border-accent/20 bg-accent-mute p-3 text-[12.5px] leading-relaxed text-ink-200"
        >
          <span class="font-semibold text-accent-soft">{{ $t('image.willUse') }}</span>
          {{ promptFinal }}
        </p>

        <div v-if="mode === 'i2i'" class="space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <span class="field-label">{{ $t('image.referenceImage') }}</span>
          <p class="field-hint">{{ $t('image.referenceHint') }}</p>
          <input class="field" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" @change="onRefFile" >
          <p v-if="refName" class="text-[13px] font-medium text-accent-soft">
            <span class="i-ph-check-circle-fill mr-1 text-[14px]" />
            {{ refName }}
          </p>
        </div>

        <!-- Model (icon buttons) -->
        <div class="space-y-2">
          <span class="field-label">{{ $t('image.model') }}</span>
          <div class="flex gap-2">
            <button
              type="button"
              class="icon-radio"
              :class="{ 'is-active': model === 'image-01' }"
              @click="model = 'image-01'"
            >
              <span class="i-ph-paint-brush-broad text-[16px]" />
              <span class="icon-radio__label">Standard</span>
            </button>
            <button
              type="button"
              class="icon-radio"
              :class="{ 'is-active': model === 'image-01-live' }"
              @click="model = 'image-01-live'"
            >
              <span class="i-ph-palette text-[16px]" />
              <span class="icon-radio__label">Style</span>
            </button>
          </div>
        </div>

        <!-- Aspect Ratio (visual ratio buttons) -->
        <div class="space-y-2">
          <span class="field-label">{{ $t('image.aspectRatio') }}</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="a in IMAGE_ASPECT_RATIOS"
              :key="a.value"
              type="button"
              class="ratio-btn"
              :class="{ 'is-active': aspectRatio === a.value }"
              :title="a.value"
              @click="aspectRatio = a.value"
            >
              <span class="ratio-btn__box" :class="`ratio-${a.value.replace(':', '-')}`" />
              <span class="ratio-btn__label">{{ a.value }}</span>
            </button>
          </div>
        </div>

        <!-- Count (icon buttons) -->
        <div class="space-y-2">
          <span class="field-label">{{ $t('image.count') }}</span>
          <div class="flex gap-2">
            <button
              v-for="n in 4"
              :key="n"
              type="button"
              class="count-btn"
              :class="{ 'is-active': count === n }"
              @click="count = n"
            >
              {{ n }}
            </button>
          </div>
        </div>

        <!-- Style Type (icon buttons, only for image-01-live) -->
        <div v-if="model === 'image-01-live'" class="space-y-2">
          <span class="field-label">{{ $t('image.styleType') }}</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="s in IMAGE_LIVE_STYLES"
              :key="s"
              type="button"
              class="icon-radio"
              :class="{ 'is-active': styleType === s }"
              @click="styleType = s"
            >
              <span :class="styleIcon(s)" />
              <span class="icon-radio__label">{{ s }}</span>
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
          <UiButton
            variant="generate"
            :loading="generating"
            :disabled="generating || optimizing || !canGenerate"
            @click="generate"
          >
            <span class="i-ph-image text-[16px]" />
{{ generating ? $t('image.generating') : 'Generate image' }}
          </UiButton>
          <span v-if="errorText" class="status-pill !border-danger/30 !text-danger">{{ errorText }}</span>
          <span v-else-if="statusText" class="status-pill">
            <span class="i-ph-circle-fill text-[8px] text-accent-soft" />
            {{ statusText }}
          </span>
        </div>
      </div>
    </template>

    <template #results-header>
      <div>
        <h2 class="font-display text-[16px] font-650 text-white">Gallery</h2>
        <p class="text-[12px] text-ink-400">{{ images.length }} results</p>
      </div>
      <UiRefreshButton :loading="pending" @click="refresh" />
    </template>

    <template #results>
      <div v-if="pending" class="grid items-start gap-3 sm:grid-cols-2">
        <div v-for="n in 4" :key="n" class="gallery-card">
          <div class="aspect-square animate-pulse rounded-[1rem] bg-white/[0.04]" />
        </div>
      </div>

      <div v-else-if="!images.length" class="px-2 py-12 text-center text-ink-400">
        No images generated yet. Configure on the left and click Generate.
      </div>

      <div v-else class="grid items-start gap-3 sm:grid-cols-2">
        <article
          v-for="img in images"
          :key="img.id"
          class="gallery-card"
          :class="{ 'is-open': expandedId === img.id }"
        >
          <button
            type="button"
            class="gallery-card__media"
            :aria-label="`View ${img.title}`"
            @click="openLightbox(img)"
          >
            <img
              v-if="img.imageUrl"
              :src="img.imageUrl"
              :alt="img.title"
              class="gallery-card__img"
              loading="lazy"
            >
          </button>

          <div class="gallery-card__chrome">
            <div class="gallery-card__bar">
              <button
                type="button"
                class="gallery-card__toggle"
                :aria-expanded="expandedId === img.id"
                @click="toggleMeta(img.id)"
              >
                <span class="gallery-card__toggle-left">
                  <span class="gallery-card__badge">{{ sceneLabel(img.scene) }}</span>
                  <span class="gallery-card__ratio">{{ img.aspectRatio }}</span>
                </span>
                <span class="gallery-card__toggle-right">
                  <span class="gallery-card__hint">
                    {{ expandedId === img.id ? 'Collapse' : 'Details' }}
                  </span>
                  <span
                    class="gallery-card__caret"
                    :class="expandedId === img.id ? 'i-ph-caret-up' : 'i-ph-caret-down'"
                  />
                </span>
              </button>
              <UiMoreMenu
                placement="top"
                :items="imageMenuItems(img)"
                :disabled="busyId === img.id || generating"
                @select="(id) => onImageMenu(id, img)"
              />
            </div>

            <div v-show="expandedId === img.id" class="gallery-card__meta">
              <div class="flex items-start justify-between gap-3">
                <h3 class="font-display text-[15px] font-600 text-white">{{ img.title }}</h3>
                <span class="shrink-0 text-[11px] uppercase tracking-wide text-ink-400">
                  {{ img.mode }} · {{ img.model }}
                </span>
              </div>
              <p class="mt-2 text-[12.5px] leading-relaxed text-ink-300">
                {{ img.promptFinal || img.prompt }}
              </p>
            </div>
          </div>
        </article>
      </div>

      <Teleport to="body">
        <div
          v-if="lightbox"
          class="lightbox"
          role="dialog"
          aria-modal="true"
          @click.self="lightbox = null"
        >
          <button class="lightbox__close" type="button" aria-label="Close" @click="lightbox = null">
            <span class="i-ph-x text-[20px]" />
          </button>
          <img
            v-if="lightbox.imageUrl"
            :src="lightbox.imageUrl"
            :alt="lightbox.title"
            class="lightbox__img"
          >
          <p class="lightbox__caption">{{ lightbox.title }} · {{ sceneLabel(lightbox.scene) }}</p>
        </div>
      </Teleport>
    </template>
  </StudioWorkspace>
</template>

<script setup lang="ts">
const { t } = useI18n()
import { useAnalytics } from '~/composables/useAnalytics'
const { trackGenerateStart: trackImgStart, trackGenerateSuccess: trackImgSuccess } = useAnalytics()
import {
  IMAGE_ASPECT_RATIOS,
  IMAGE_LIVE_STYLES,
  IMAGE_SCENE_PRESETS,
  type ImageScene,
  type ImageScenePreset,
} from '~/utils/imagePresets'

definePageMeta({ layout: 'default', middleware: ['auth'] })

type ImagePublic = {
  id: string
  title: string
  prompt: string
  promptFinal: string
  scene: string
  model: string
  mode: string
  aspectRatio: string
  styleType: string | null
  status: string
  errorMessage: string | null
  imageUrl: string | null
  meta: any
  createdAt: string
  updatedAt: string
}

const mode = ref<'t2i' | 'i2i'>('t2i')
const modes = [
  { value: 't2i' as const, label: 'Text→Image', icon: 'i-ph-text-aa' },
  { value: 'i2i' as const, label: 'Image→Image', icon: 'i-ph-user-focus' },
]

const scene = ref<ImageScene>('logo')
const prompt = ref(IMAGE_SCENE_PRESETS[0].prompt)
const promptFinal = ref('')
const optimizeNotes = ref('')
const promptOptimizer = ref(true)
const deepOptimize = ref(false)
const model = ref<'image-01' | 'image-01-live'>('image-01')
const aspectRatio = ref('1:1')
const count = ref(1)
const styleType = ref<(typeof IMAGE_LIVE_STYLES)[number]>('Comic')
const uploadId = ref<string | null>(null)
const refName = ref('')
const generating = ref(false)
const busyId = ref<string | null>(null)
const remixFrom = ref<string | null>(null)
const optimizing = ref(false)
const errorText = ref('')
const statusText = ref('')

const activeScene = computed(() => IMAGE_SCENE_PRESETS.find((p) => p.id === scene.value))
const canGenerate = computed(() => {
  if (!prompt.value.trim()) return false
  if (mode.value === 'i2i' && !uploadId.value) return false
  return true
})

const { data, pending, refresh } = await useFetch<{ images: ImagePublic[] }>('/api/images', {
  key: 'gallery-images',
})
const images = computed(() => data.value?.images || [])
const expandedId = ref<string | null>(null)
const lightbox = ref<ImagePublic | null>(null)

function sceneLabel(id: string) {
  return IMAGE_SCENE_PRESETS.find((p) => p.id === id)?.shortLabel || id
}

function toggleMeta(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function openLightbox(img: ImagePublic) {
  lightbox.value = img
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') lightbox.value = null
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

function applyScene(preset: ImageScenePreset) {
  scene.value = preset.id
  prompt.value = preset.prompt
  aspectRatio.value = preset.aspectRatio
  if (preset.model) model.value = preset.model
  if (preset.styleType) {
    model.value = 'image-01-live'
    styleType.value = preset.styleType
  }
  promptFinal.value = ''
  optimizeNotes.value = ''
  statusText.value = `Scene applied: ${preset.label}`
  errorText.value = ''
  if (preset.id === 'portrait') mode.value = 'i2i'
}

async function onRefFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  errorText.value = ''
  statusText.value = 'Uploading reference…'
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await $fetch<{ uploadId: string; filename: string }>('/api/image/upload', {
      method: 'POST',
      body: form,
    })
    uploadId.value = res.uploadId
    refName.value = res.filename
    mode.value = 'i2i'
    statusText.value = t('image.refReady')
  } catch (err: any) {
    errorText.value = err?.data?.statusMessage || err?.message || 'Upload failed'
    statusText.value = ''
    uploadId.value = null
    refName.value = ''
  }
}

async function optimizePrompt() {
  if (!prompt.value.trim()) return
  optimizing.value = true
  errorText.value = ''
  try {
    const res = await $fetch<{ optimized: string; notes: string }>('/api/image/optimize', {
      method: 'POST',
      body: {
        prompt: prompt.value,
        scene: scene.value,
        aspectRatio: aspectRatio.value,
      },
    })
    prompt.value = res.optimized
    promptFinal.value = res.optimized
    optimizeNotes.value = res.notes || 'Prompt optimized'
    statusText.value = 'Prompt optimized, ready to generate'
  } catch (err: any) {
    errorText.value = err?.data?.statusMessage || err?.message || 'Optimize failed'
  } finally {
    optimizing.value = false
  }
}

async function generate() {
  if (!requireAuth()) return
  if (!canGenerate.value) return
  generating.value = true
  errorText.value = ''
  statusText.value = deepOptimize.value ? $t('image.optimizingAndGenerating') : $t('image.generating')
  try {
    const res = await $fetch<{ images: ImagePublic[]; promptFinal: string }>('/api/image/generate', {
      method: 'POST',
      body: {
        prompt: prompt.value,
        scene: scene.value,
        model: model.value,
        mode: mode.value,
        aspectRatio: aspectRatio.value,
        n: count.value,
        promptOptimizer: promptOptimizer.value,
        deepOptimize: deepOptimize.value,
        styleType: model.value === 'image-01-live' ? styleType.value : null,
        uploadId: mode.value === 'i2i' ? uploadId.value : null,
        title: activeScene.value?.shortLabel,
      },
    })
    promptFinal.value = res.promptFinal
    const notes = res.notes ? `${res.notes} · ` : ''
    statusText.value = `Generated ${res.images.length} images`
    if (notes) optimizeNotes.value = notes
    await refresh()
  } catch (err: any) {
    errorText.value = err?.data?.statusMessage || err?.message || 'Generate failed'
    statusText.value = ''
  } finally {
    generating.value = false
  }
}

async function remove(id: string) {
  if (!confirm('Delete this image? This action cannot be undone.')) return
  if (expandedId.value === id) expandedId.value = null
  if (lightbox.value?.id === id) lightbox.value = null
  busyId.value = id
  try {
    await $fetch(`/api/images/${id}`, { method: 'DELETE' })
    await refresh()
  } finally {
    busyId.value = null
  }
}

async function regenerate(img: ImagePublic) {
  busyId.value = img.id
  errorText.value = ''
  statusText.value = 'Regenerating…'
  try {
    const res = await $fetch<{ images: ImagePublic[] }>(`/api/images/${img.id}/regenerate`, {
      method: 'POST',
    })
    statusText.value = `Regenerated ${res.images.length} images`
    await refresh()
  } catch (err: any) {
    errorText.value = err?.data?.statusMessage || err?.message || 'Regeneration failed'
    statusText.value = ''
  } finally {
    busyId.value = null
  }
}

function loadFromImage(img: ImagePublic) {
  prompt.value = img.prompt || ''
  promptFinal.value = img.promptFinal || ''
  scene.value = (img.scene as ImageScene) || 'general'
  mode.value = img.mode === 'i2i' ? 'i2i' : 't2i'
  model.value = img.model === 'image-01-live' ? 'image-01-live' : 'image-01'
  aspectRatio.value = img.aspectRatio || '1:1'
  if (img.styleType && IMAGE_LIVE_STYLES.includes(img.styleType as any)) {
    styleType.value = img.styleType as (typeof IMAGE_LIVE_STYLES)[number]
  }
  const meta = img.meta || {}
  promptOptimizer.value = meta.promptOptimizer !== false
  deepOptimize.value = !!meta.deepOptimize
  if (meta.uploadId) {
    uploadId.value = String(meta.uploadId)
    refName.value = $t('image.restoredRef')
  } else if (img.mode === 'i2i') {
    uploadId.value = null
    refName.value = ''
  }
  remixFrom.value = img.title || 'Untitled'
  statusText.value = $t('image.loadedParams')
  errorText.value = ''
  document.querySelector('.workspace__ops')?.scrollTo?.({ top: 0, behavior: 'smooth' })
}

function clearRemix() {
  remixFrom.value = null
}

function downloadImage(img: ImagePublic) {
  if (!img.imageUrl) return
  const a = document.createElement('a')
  a.href = img.imageUrl
  a.download = `${img.title || 'image'}.jpg`
  a.target = '_blank'
  a.rel = 'noopener'
  a.click()
}

function imageMenuItems(img: ImagePublic) {
  return [
    { id: 'remix', label: t('image.adjustParams'), icon: 'i-ph-pencil-simple' },
    {
      id: 'regenerate',
      label: t('image.regenerate'),
      icon: 'i-ph-arrows-clockwise',
      disabled: busyId.value === img.id || generating.value,
    },
    {
      id: 'download',
      label: t('image.download'),
      icon: 'i-ph-download-simple',
      disabled: !img.imageUrl,
    },
    { id: 'open', label: t('image.fullscreen'), icon: 'i-ph-eye' },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'i-ph-trash',
      danger: true,
      dividerBefore: true,
    },
  ]
}

function onImageMenu(id: string, img: ImagePublic) {
  if (id === 'remix') loadFromImage(img)
  else if (id === 'regenerate') regenerate(img)
  else if (id === 'download') downloadImage(img)
  else if (id === 'open') openLightbox(img)
  else if (id === 'delete') remove(img.id)
}
</script>

<style scoped>
.gallery-card {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  background: transparent;
}

.gallery-card__media {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 1rem;
  background: #0c0b12;
  cursor: zoom-in;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.gallery-card:hover .gallery-card__media,
.gallery-card.is-open .gallery-card__media {
  border-color: rgba(139, 124, 255, 0.32);
  box-shadow: 0 18px 40px -28px rgba(110, 92, 230, 0.55);
}

.gallery-card__img {
  display: block;
  width: 100%;
  height: auto;
  vertical-align: top;
}

.gallery-card__chrome {
  overflow: visible;
  border-radius: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(17, 16, 24, 0.92);
}

.gallery-card__bar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.15rem;
  padding-right: 0.25rem;
}

.gallery-card__bar .gallery-card__toggle {
  flex: 1;
  min-width: 0;
}

.gallery-card__toggle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 2.15rem;
  padding: 0.4rem 0.75rem;
  border: 0;
  background: transparent;
  color: #c9c3dd;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.gallery-card__toggle:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
}

.gallery-card__toggle-left,
.gallery-card__toggle-right {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.gallery-card__badge {
  border-radius: 999px;
  border: 1px solid rgba(139, 124, 255, 0.28);
  background: rgba(139, 124, 255, 0.12);
  padding: 0.12rem 0.5rem;
  color: #b4a9ff;
  font-size: 11px;
  font-weight: 650;
}

.gallery-card__ratio,
.gallery-card__hint {
  color: #817b99;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.gallery-card__caret {
  flex-shrink: 0;
  font-size: 13px;
  opacity: 0.8;
}

.gallery-card__meta {
  padding: 0.15rem 0.75rem 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
</style>

<style>
/* Teleported lightbox — must be unscoped */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  gap: 0.75rem;
  padding: 1.25rem;
  background: rgba(6, 5, 10, 0.88);
  backdrop-filter: blur(10px);
}

.lightbox__img {
  max-width: min(96vw, 1200px);
  max-height: min(82vh, 900px);
  object-fit: contain;
  border-radius: 0.75rem;
  box-shadow: 0 24px 80px -20px rgba(0, 0, 0, 0.85);
}

.lightbox__caption {
  max-width: 40rem;
  color: #a39db8;
  font-size: 12.5px;
  text-align: center;
}

.lightbox__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: pointer;
}

.lightbox__close:hover {
  background: rgba(255, 255, 255, 0.14);
}

/* —— Icon Radio Buttons —— */
.icon-radio {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: var(--ink-2, #d0cbe0);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.icon-radio:hover {
  border-color: rgba(139, 124, 255, 0.3);
  background: rgba(139, 124, 255, 0.08);
}
.icon-radio.is-active {
  border-color: rgba(139, 124, 255, 0.5);
  background: rgba(139, 124, 255, 0.12);
  color: #fff;
}
.icon-radio__label {
  white-space: nowrap;
}

/* —— Ratio Buttons —— */
.ratio-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.5rem 0.7rem;
  border-radius: 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: all 0.15s;
}
.ratio-btn:hover {
  border-color: rgba(139, 124, 255, 0.3);
  background: rgba(139, 124, 255, 0.08);
}
.ratio-btn.is-active {
  border-color: rgba(139, 124, 255, 0.5);
  background: rgba(139, 124, 255, 0.12);
}
.ratio-btn__box {
  display: block;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}
.ratio-btn.is-active .ratio-btn__box {
  background: #8b7cff;
}
.ratio-1-1 { width: 20px; height: 20px; }
.ratio-16-9 { width: 28px; height: 16px; }
.ratio-9-16 { width: 16px; height: 28px; }
.ratio-4-3 { width: 24px; height: 18px; }
.ratio-3-4 { width: 18px; height: 24px; }
.ratio-3-2 { width: 27px; height: 18px; }
.ratio-2-3 { width: 18px; height: 27px; }
.ratio-21-9 { width: 32px; height: 14px; }
.ratio-btn__label {
  font-size: 0.68rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.ratio-btn.is-active .ratio-btn__label {
  color: #b4a9ff;
}

/* —— Count Buttons —— */
.count-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: var(--ink-2, #d0cbe0);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.count-btn:hover {
  border-color: rgba(139, 124, 255, 0.3);
  background: rgba(139, 124, 255, 0.08);
  color: #fff;
}
.count-btn.is-active {
  border-color: rgba(139, 124, 255, 0.5);
  background: rgba(139, 124, 255, 0.15);
  color: #fff;
  box-shadow: 0 0 0 1px rgba(139, 124, 255, 0.3);
}
</style>
