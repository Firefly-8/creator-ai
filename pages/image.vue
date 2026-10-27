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
        <UiSegmented v-if="!scenarioMode" v-model="mode" :options="modes" equal />

        <!-- 简单模式 / 高级模式 -->
        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-2xl border px-3 py-2.5 text-[14px] font-600 transition"
            :class="scenarioMode ? 'border-accent/50 bg-accent-mute text-accent-soft' : 'border-white/[0.08] bg-white/[0.02] text-ink-300'"
            @click="scenarioMode = true"
          >
            <span class="i-ph-hand-tap mr-1" />简单模式
          </button>
          <button
            type="button"
            class="flex-1 rounded-2xl border px-3 py-2.5 text-[14px] font-600 transition"
            :class="!scenarioMode ? 'border-accent/50 bg-accent-mute text-accent-soft' : 'border-white/[0.08] bg-white/[0.02] text-ink-300'"
            @click="scenarioMode = false"
          >
            <span class="i-ph-pencil-simple mr-1" />高级模式
          </button>
        </div>

        <!-- ============ 简单模式：选场景 → 选画风 → 填称呼 ============ -->
        <template v-if="scenarioMode">
          <section
            v-for="g in SCENARIO_GROUPS"
            :key="g.id"
            class="space-y-2"
          >
            <p class="field-label">
              <span :class="`i-${g.icon} mr-1`" />{{ g.label }}
            </p>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="s in scenariosOfGroup(g.id)"
                :key="s.id"
                type="button"
                class="scenario-card"
                :class="scenarioId === s.id ? 'is-active' : ''"
                @click="selectScenario(s)"
              >
                <span :class="`i-${s.icon} scenario-card__icon`" />
                <span class="scenario-card__label">{{ s.label }}</span>
                <span class="scenario-card__desc">{{ s.desc }}</span>
              </button>
            </div>
          </section>

          <!-- 画风 -->
          <section class="space-y-2">
            <p class="field-label">
              <span class="i-ph-palette mr-1" />画成什么样子
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="st in scenarioStyles"
                :key="st.id"
                type="button"
                class="chip !text-[15px] !px-4 !py-2"
                :class="styleId === st.id ? 'chip-active !border-accent/45' : ''"
                @click="selectStyle(st.id)"
              >
                {{ st.label }}
              </button>
            </div>
          </section>

          <!-- 称呼 -->
          <label v-if="currentScenario?.askName" class="block space-y-2">
            <span class="field-label">{{ currentScenario?.id === 'hobby-poster' ? '活动名字' : '写上谁的名字' }}</span>
            <input
              v-model="scenarioName"
              class="field !text-[16px]"
              :placeholder="currentScenario?.inputHint || '比如：老妈'"
            >
          </label>

          <!-- 补充描述（只有「随便画」用得到） -->
          <label v-if="currentScenario?.id === 'free'" class="block space-y-2">
            <span class="field-label">想画什么</span>
            <input
              v-model="scenarioExtra"
              class="field !text-[16px]"
              placeholder="比如：院子里的花猫"
            >
          </label>

          <!-- 参考图（需要照片的场景） -->
          <div
            v-if="currentScenario?.needReference"
            class="space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
          >
            <span class="field-label">上传一张照片</span>
            <p class="field-hint">选一张清晰的照片（正面、光线好），手机拍的会自动缩小再上传</p>
            <input class="field" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" @change="onRefFile">
            <p v-if="refName" class="text-[13px] font-medium text-accent-soft">
              <span class="i-ph-check-circle-fill mr-1 text-[14px]" />
              {{ refName }}
            </p>
          </div>

          <!-- prompt 预览（只读，给想看看的人） -->
          <details class="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
            <summary class="cursor-pointer text-[13.5px] text-ink-300">
              看看会怎么画（一般不用管）
            </summary>
            <p class="mt-2 text-[12.5px] leading-relaxed text-ink-400">{{ previewPrompt }}</p>
          </details>
        </template>

        <!-- ============ 高级模式：原来的自由创作界面 ============ -->
        <template v-else>
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
            :placeholder="$t('image.promptPlaceholder')"
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
        </template>

        <!-- 高级模式才显示模型/比例/张数等参数；简单模式由场景自动决定 -->
        <template v-if="!scenarioMode">
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
              v-for="n in countOptions"
              :key="n"
              type="button"
              class="count-btn"
              :class="{ 'is-active': count === n }"
              @click="count = n"
            >
              {{ n }}
            </button>
          </div>
          <!-- ⚠️ 免费档单次最多出 2 张（成本闸门）：别让用户选了 4 只出 2 却不解释 -->
          <p v-if="countCapped" class="field-hint">{{ $t('image.countCapped') }}</p>
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
        </template>

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
        <!-- ⚠️ 原来叫 "Gallery"，跟侧边栏那个公开 Gallery 撞名 ——
             这里其实是「我自己的图」，改成 Your images 更准 -->
        <h2 class="font-display text-[16px] font-650 text-white">Your images</h2>
        <p class="text-[12px] text-ink-400">{{ images.length }} results</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/my-assets" class="btn-secondary !h-8 !px-3 text-[12px]">My creations</NuxtLink>
        <UiRefreshButton :loading="pending" @click="refresh" />
      </div>
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
  <ConfirmModal
      v-model="confirmOpen"
      title="Delete Image"
      message="This action cannot be undone."
      :confirm-label="t('common.delete')"
      :cancel-label="t('common.cancel')"
      danger
      @confirm="onConfirmDelete"
      @cancel="confirmOpen = false"
    />
  </StudioWorkspace>
</template>

<script setup lang="ts">
// ⚠️ 不要用 useI18n()：auto-import 解析到 vue-i18n 原始实现，客户端拿到的
// t 不是函数 → 整页 500。用 useT()（内部走 useNuxtApp().$i18n.t）。
const { t } = useT()
/**
 * 登录成功后要接着做的事。
 * 点 Generate → 接着生成；点上传参考图 → 接着把那张图传上去。
 */
const pendingAction = ref<'generate' | 'upload' | null>(null)
/** 待上传的参考图（登录后要接着传） */
const pendingRefFile = ref<File | null>(null)

const requireAuth = useRequireAuth({
  note: 'Sign in to generate your picture — everything you have set up is kept.',
  afterAuth: () => {
    const action = pendingAction.value
    pendingAction.value = null
    if (action === 'upload' && pendingRefFile.value) {
      const f = pendingRefFile.value
      pendingRefFile.value = null
      return uploadRefFile(f)
    }
    return generate()
  },
})
import { useAnalytics } from '~/composables/useAnalytics'
const { trackGenerateStart: trackImgStart, trackGenerateSuccess: trackImgSuccess } = useAnalytics()
const route = useRoute()
import {
  IMAGE_ASPECT_RATIOS,
  IMAGE_LIVE_STYLES,
  IMAGE_SCENE_PRESETS,
  type ImageScene,
  type ImageScenePreset,
} from '~/utils/imagePresets'
import {
  IMAGE_SCENARIOS,
  IMAGE_STYLES,
  SCENARIO_GROUPS,
  buildScenarioPrompt,
  type ImageScenarioDef,
} from '~/utils/imageScenarios'

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

/* ---------------- 场景模式（给不擅长用 AI 工具的人） ---------------- */
/** true = 简单模式（选场景 → 选画风 → 填称呼）；false = 高级模式（自己写 prompt） */
const scenarioMode = ref(true)
const scenarioId = ref('avatar')
const styleId = ref('photo')
/** 称呼 / 要写上的人 */
const scenarioName = ref('')
/** 补充描述（只有「随便画」用得到） */
const scenarioExtra = ref('')

const currentScenario = computed(() => IMAGE_SCENARIOS.find(s => s.id === scenarioId.value))
const scenarioStyles = computed(() => {
  const ids = currentScenario.value?.styles
  return ids?.length ? IMAGE_STYLES.filter(s => ids.includes(s.id)) : IMAGE_STYLES
})
const scenariosOfGroup = (gid: string) => IMAGE_SCENARIOS.filter(s => s.group === gid)
/** 场景模式下最终会发给服务端的 prompt（前端只做预览，真正拼装在服务端） */
const previewPrompt = computed(() => {
  const r = buildScenarioPrompt(scenarioId.value, styleId.value, scenarioName.value, scenarioExtra.value)
  return r?.prompt || ''
})
const promptFinal = ref('')
const optimizeNotes = ref('')
const promptOptimizer = ref(true)
const deepOptimize = ref(false)
const model = ref<'image-01' | 'image-01-live'>('image-01')
const aspectRatio = ref('1:1')
const count = ref(1)
/**
 * 单次最多出几张 —— 免费档 2 张、付费 4 张（服务端也会 clamp）。
 * ⚠️ 场景预设里全是 count: 4，不收窄的话免费用户选场景就被静默砍成 2 张，
 *    而且界面上看不出来为什么。
 */
const maxPerRun = ref(4)
const countOptions = computed(() => [1, 2, 3, 4].filter(n => n <= maxPerRun.value))
const countCapped = computed(() => maxPerRun.value < 4)
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
  if (scenarioMode.value) {
    // 场景模式：需要参考图的场景必须先传照片
    if (currentScenario.value?.needReference && !uploadId.value) return false
    return true
  }
  if (!prompt.value.trim()) return false
  if (mode.value === 'i2i' && !uploadId.value) return false
  return true
})

const { data, pending, refresh } = await useFetch<{ images: ImagePublic[] }>('/api/images', {
  key: 'gallery-images',
})
const images = computed(() => data.value?.images || [])
// Default: expand first image's prompt for immediate context
watch(images, (imgs) => {
  if (imgs.length > 0 && expandedId.value === null) {
    expandedId.value = imgs[0].id
  }
}, { immediate: true })
const expandedId = ref<string | null>(null)
const lightbox = ref<ImagePublic | null>(null)

// Delete confirmation modal
const confirmOpen = ref(false)
const confirmTarget = ref<ImagePublic | null>(null)
function onConfirmDelete() {
  if (!confirmTarget.value) return
  const img = confirmTarget.value
  confirmOpen.value = false
  confirmTarget.value = null
  deleteImageConfirmed(img)
}
function promptDelete(img: ImagePublic) {
  confirmTarget.value = img
  confirmOpen.value = true
}
async function deleteImageConfirmed(img: ImagePublic) {
  const id = img.id
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

onMounted(() => {
  // ⚠️ 以前这里（和下面的 watch）会在**进页面就弹登录框** ——
  //    /image 是公开 SEO 落地页（/ai-image-generator、/tools 都链过来），
  //    访客点 CTA 落地看到的是登录框，界面一眼都没见着 → 漏斗最上面漏水。
  //    现在改成：**先进去看清楚能做什么，点 Generate 时才要登录**
  //    （generate() 里已有 requireAuth()）。
  window.addEventListener('keydown', onKeydown)
  // 拉一次额度：只为知道「单次最多出几张」（免费 2 / 付费 4）
  // 失败就算了 —— 服务端还会 clamp，最多出 2 张而已。
  useApi().get<{ image?: { maxPerRun?: number } }>('/api/user/usage')
    .then((res) => {
      const m = res.image?.maxPerRun
      if (m && m > 0) {
        maxPerRun.value = m
        if (count.value > m) count.value = m
      }
    })
    .catch(() => {})
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

/** 选场景：把画风/比例/张数/是否要参考图一次性切好 */
function selectScenario(s: ImageScenarioDef) {
  scenarioId.value = s.id
  const allowed = s.styles?.length ? s.styles : IMAGE_STYLES.map(x => x.id)
  if (!allowed.includes(styleId.value)) styleId.value = allowed[0]
  aspectRatio.value = s.aspectRatio
  count.value = s.count
  if (s.needReference) {
    mode.value = 'i2i'
  } else {
    mode.value = 't2i'
    uploadId.value = null
    refName.value = ''
  }
  promptFinal.value = ''
  optimizeNotes.value = ''
  errorText.value = ''
  statusText.value = `已选：${s.label}`
}

function selectStyle(id: string) {
  styleId.value = id
  promptFinal.value = ''
}

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

function styleIcon(style: string): string {
  const map: Record<string, string> = {
    Comic: 'i-ph-smiley',
    Vibrant: 'i-ph-sun',
    Medieval: 'i-ph-buildings',
    Watercolor: 'i-ph-drop',
  }
  return map[style] || 'i-ph-palette'
}

/**
 * 上传前在浏览器里把图缩小 —— 手机拍的原图动辄 5~10MB，
 * 缩小后既能秒传，也能塞进 MiniMax 的参考图体积限制。
 */
async function shrinkImage(file: File, maxSide = 1024, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) { bitmap.close(); return file }
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality))
  return blob || file
}

function onRefFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  // ⚠️ 上传接口要登录。未登录时先登录，**登录后接着把这张图传上去**，
  //    别让用户再选一次文件（手机端重新挑照片很烦）。
  pendingAction.value = 'upload'
  pendingRefFile.value = file
  if (!requireAuth()) return
  pendingAction.value = null
  pendingRefFile.value = null
  uploadRefFile(file)
}

async function uploadRefFile(file: File) {
  errorText.value = ''
  statusText.value = 'Uploading reference…'
  try {
    let payload: Blob = file
    if (file.size > 1024 * 1024) {
      statusText.value = '正在压缩照片…'
      payload = await shrinkImage(file)
    }
    const form = new FormData()
    form.append('file', payload, payload instanceof File ? payload.name : 'reference.jpg')
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
  // 登录成功后接着做的是「生成」——别被上一次残留的 pendingAction 带偏
  pendingAction.value = 'generate'
  if (!requireAuth()) return
  pendingAction.value = null
  if (!canGenerate.value) return
  generating.value = true
  errorText.value = ''
  statusText.value = deepOptimize.value ? t('image.optimizingAndGenerating') : t('image.generating')
  try {
    // 场景模式：prompt 由服务端按 scenario + style + name 拼，客户端不传
    const useScenario = scenarioMode.value && !!currentScenario.value
    const res = await $fetch<{ images: ImagePublic[]; promptFinal: string; notes?: string }>('/api/image/generate', {
      method: 'POST',
      body: {
        prompt: useScenario ? '' : prompt.value,
        scenario: useScenario ? scenarioId.value : undefined,
        style: useScenario ? styleId.value : undefined,
        name: useScenario ? scenarioName.value : undefined,
        extra: useScenario ? scenarioExtra.value : undefined,
        scene: scene.value,
        model: useScenario ? undefined : model.value,
        mode: mode.value,
        aspectRatio: aspectRatio.value,
        n: count.value,
        promptOptimizer: promptOptimizer.value,
        deepOptimize: deepOptimize.value,
        styleType: model.value === 'image-01-live' ? styleType.value : null,
        uploadId: mode.value === 'i2i' ? uploadId.value : null,
        title: useScenario ? currentScenario.value!.label : activeScene.value?.shortLabel,
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

function remove(img: ImagePublic) {
  promptDelete(img)
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
    refName.value = t('image.restoredRef')
  } else if (img.mode === 'i2i') {
    uploadId.value = null
    refName.value = ''
  }
  remixFrom.value = img.title || 'Untitled'
  statusText.value = t('image.loadedParams')
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
  // ⚠️ 存进 R2 的一律是 PNG（writeFile 固定 image/png），别再写 .jpg
  a.download = `${img.title || 'image'}.png`
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
  else if (id === 'delete') remove(img)
}

useHead({
  title: 'AI Image Generator — Create Images with AI | CraftAI',
  meta: [
    { name: 'description', content: 'Generate stunning AI images for free. Describe any scene, style, or concept and create unique visuals in seconds.' },
    { property: 'og:title', content: 'AI Image Generator — Create Images with AI' },
    { property: 'og:description', content: 'Describe any concept and generate unique AI images in seconds. Free to start.' },
    { property: 'og:type', content: 'website' },
  ],
  link: [{ rel: 'canonical', href: 'https://creator.yozzytools.com/image' }],
})
</script>

<style scoped>
/* 场景大卡片：给中老年用户，字大、点击区域大 */
.scenario-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3rem;
  padding: 0.85rem 0.9rem;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.02);
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
}

.scenario-card:hover {
  border-color: rgba(139, 124, 255, 0.35);
  background: rgba(139, 124, 255, 0.06);
}

.scenario-card:active {
  transform: scale(0.98);
}

.scenario-card.is-active {
  border-color: rgba(139, 124, 255, 0.6);
  background: rgba(139, 124, 255, 0.12);
}

.scenario-card__icon {
  font-size: 26px;
  line-height: 1;
  color: #b6a8ff;
}

.scenario-card__label {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.scenario-card__desc {
  font-size: 12.5px;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.55);
}

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
