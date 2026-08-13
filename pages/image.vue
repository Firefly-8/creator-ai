<template>
  <StudioWorkspace>
    <template #header>
      <div>
        <h1 class="font-display text-2xl font-700 text-white md:text-3xl">Image</h1>
        <p class="mt-1 text-[13.5px] text-ink-300">文生图 / 图生图 · 场景预设 + 提示词优化</p>
      </div>
    </template>

    <template #ops>
      <div class="space-y-4">
        <div v-if="remixFrom" class="ui-ops-banner">
          <div>
            <p class="ui-ops-banner__title">已载入「{{ remixFrom }}」</p>
            <p class="ui-ops-banner__hint">修改提示词 / 比例 / 场景后生成新图（原图保留）。图生图需确认参考图仍可用。</p>
          </div>
          <UiIconButton
            icon="i-ph-x"
            variant="ghost"
            size="sm"
            aria-label="清除载入"
            @click="clearRemix"
          />
        </div>
        <UiSegmented v-model="mode" :options="modes" equal />
        <section class="space-y-2">
          <p class="field-label">场景预设</p>
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
          <span class="field-label">提示词 · {{ prompt.length }}/1500</span>
          <textarea
            v-model="prompt"
            class="field min-h-32"
            maxlength="1500"
            placeholder="描述主体、构图、风格、光线…"
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
            {{ optimizing ? '优化中…' : '对话优化提示词' }}
          </UiButton>
          <label class="status-pill cursor-pointer select-none">
            <input v-model="promptOptimizer" type="checkbox" class="accent-[#8b7cff]" >
            API prompt_optimizer
          </label>
          <label class="status-pill cursor-pointer select-none">
            <input v-model="deepOptimize" type="checkbox" class="accent-[#8b7cff]" >
            生成前再优化一轮
          </label>
        </div>
        <p v-if="optimizeNotes" class="field-hint">{{ optimizeNotes }}</p>
        <p
          v-if="promptFinal && promptFinal !== prompt"
          class="rounded-2xl border border-accent/20 bg-accent-mute p-3 text-[12.5px] leading-relaxed text-ink-200"
        >
          <span class="font-semibold text-accent-soft">将使用：</span>
          {{ promptFinal }}
        </p>

        <div v-if="mode === 'i2i'" class="space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <span class="field-label">人物参考图（图生图）</span>
          <p class="field-hint">仅支持 character 人物主体，单人正面照效果最好。</p>
          <input class="field" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" @change="onRefFile" >
          <p v-if="refName" class="text-[13px] font-medium text-accent-soft">
            <span class="i-ph-check-circle-fill mr-1 text-[14px]" />
            {{ refName }}
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block space-y-2">
            <span class="field-label">模型</span>
            <select v-model="model" class="field">
              <option value="image-01">image-01（通用）</option>
              <option value="image-01-live">image-01-live（画风）</option>
            </select>
          </label>
          <label class="block space-y-2">
            <span class="field-label">宽高比</span>
            <select v-model="aspectRatio" class="field">
              <option v-for="a in IMAGE_ASPECT_RATIOS" :key="a.value" :value="a.value">{{ a.label }}</option>
            </select>
          </label>
          <label class="block space-y-2">
            <span class="field-label">数量</span>
            <select v-model.number="count" class="field">
              <option v-for="n in 4" :key="n" :value="n">{{ n }}</option>
            </select>
          </label>
          <label v-if="model === 'image-01-live'" class="block space-y-2">
            <span class="field-label">画风（live）</span>
            <select v-model="styleType" class="field">
              <option v-for="s in IMAGE_LIVE_STYLES" :key="s" :value="s">{{ s }}</option>
            </select>
          </label>
        </div>

        <div class="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
          <UiButton
            variant="generate"
            :loading="generating"
            :disabled="generating || optimizing || !canGenerate"
            @click="generate"
          >
            <span class="i-ph-image text-[16px]" />
            {{ generating ? '生成中…' : 'Generate image' }}
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
        还没有生成图片。左侧配置后点击 Generate。
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
            :aria-label="`查看 ${img.title}`"
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
                    {{ expandedId === img.id ? '收起' : '详情' }}
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
import {
  IMAGE_ASPECT_RATIOS,
  IMAGE_LIVE_STYLES,
  IMAGE_SCENE_PRESETS,
  type ImageScene,
  type ImageScenePreset,
} from '~/utils/imagePresets'

definePageMeta({ layout: 'default' })

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
  { value: 't2i' as const, label: '文生图', icon: 'i-ph-text-aa' },
  { value: 'i2i' as const, label: '图生图', icon: 'i-ph-user-focus' },
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
const styleType = ref<(typeof IMAGE_LIVE_STYLES)[number]>('漫画')
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
  statusText.value = `已套用场景：${preset.label}`
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
    statusText.value = '参考图已就绪'
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
    optimizeNotes.value = res.notes || '提示词已优化'
    statusText.value = '提示词已优化，可直接生成'
  } catch (err: any) {
    errorText.value = err?.data?.statusMessage || err?.message || 'Optimize failed'
  } finally {
    optimizing.value = false
  }
}

async function generate() {
  if (!canGenerate.value) return
  generating.value = true
  errorText.value = ''
  statusText.value = deepOptimize.value ? '优化提示词并生成中…' : '生成中…'
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
    statusText.value = `已生成 ${res.images.length} 张`
    await refresh()
  } catch (err: any) {
    errorText.value = err?.data?.statusMessage || err?.message || 'Generate failed'
    statusText.value = ''
  } finally {
    generating.value = false
  }
}

async function remove(id: string) {
  if (!confirm('删除这张图片？此操作不可恢复。')) return
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
  statusText.value = '重新生成中…'
  try {
    const res = await $fetch<{ images: ImagePublic[] }>(`/api/images/${img.id}/regenerate`, {
      method: 'POST',
    })
    statusText.value = `已重新生成 ${res.images.length} 张`
    await refresh()
  } catch (err: any) {
    errorText.value = err?.data?.statusMessage || err?.message || '重新生成失败'
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
    refName.value = '已恢复参考图（来自上次生成）'
  } else if (img.mode === 'i2i') {
    uploadId.value = null
    refName.value = ''
  }
  remixFrom.value = img.title || '未命名'
  statusText.value = '已载入参数，可调整后生成'
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
    { id: 'remix', label: '调整参数', icon: 'i-ph-pencil-simple' },
    {
      id: 'regenerate',
      label: '重新生成',
      icon: 'i-ph-arrows-clockwise',
      disabled: busyId.value === img.id || generating.value,
    },
    {
      id: 'download',
      label: '下载',
      icon: 'i-ph-download-simple',
      disabled: !img.imageUrl,
    },
    { id: 'open', label: '全屏查看', icon: 'i-ph-eye' },
    {
      id: 'delete',
      label: '删除',
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
</style>
