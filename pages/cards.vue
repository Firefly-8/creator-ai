<template>
  <div class="ck-cards">
    <!-- ============ 顶部 ============ -->
    <header class="ck-cards__head">
      <div class="ck-wrap ck-cards__headgrid">
        <div class="ck-cards__headcopy">
          <p v-if="step < 4" class="ck-eyebrow">Step {{ step }} of 3</p>
          <h1 class="ck-h1">{{ stepHeadline }}</h1>
          <p class="ck-lede">{{ stepLede }}</p>
          <ol class="ck-steps-nav">
            <li
              v-for="(s, i) in stepLabels"
              :key="s"
              :class="{ 'is-on': step >= i + 1, 'is-done': step > i + 1, 'is-current': step === i + 1 }"
            >
              <button
                type="button"
                class="ck-steps-nav__btn"
                :disabled="i + 1 > maxReached"
                @click="goTo(i + 1)"
              >
                <span class="ck-steps-nav__dot">
                  <span v-if="step > i + 1" class="i-ph-check" />
                  <template v-else>{{ i + 1 }}</template>
                </span>
                {{ s }}
              </button>
            </li>
          </ol>
        </div>

        <!-- 真实成品卡示例：光有文字会显得又窄又空（跟首页 hero 同一个配方） -->
        <aside class="ck-cards__art" aria-hidden="true">
          <div class="ck-showcard">
            <img
              src="https://assets.yozzytools.com/showcase/hero-birthday.webp"
              alt=""
              loading="lazy"
            />
            <div class="ck-showcard__caption">
              <p class="ck-showcard__kicker">Their inside joke</p>
              <p class="ck-showcard__line">“Margaret still does the crossword in pen.”</p>
            </div>
          </div>
        </aside>
      </div>
    </header>

    <div class="ck-wrap ck-cards__body">
      <!-- ==================== STEP 1 · 场合 ==================== -->
      <section v-if="step === 1" class="ck-sec ck-sec--card">
        <h2 class="ck-sec__title">
          <span class="ck-sec__num">1</span>
          What is it for?
        </h2>
        <p class="ck-sec__sub">Pick the closest one. You can change it later.</p>

        <!-- 分组 tab -->
        <div class="ck-tabs">
          <button
            v-for="g in SCENARIO_GROUPS"
            :key="g.id"
            class="ck-tab"
            :class="{ 'ck-tab--on': group === g.id }"
            @click="group = g.id"
          >
            {{ g.label }}
          </button>
        </div>

        <div class="ck-scene-grid">
          <button
            v-for="sc in visibleScenarios"
            :key="sc.id"
            class="ck-scene"
            :class="{ 'ck-scene--on': scenario?.id === sc.id }"
            @click="pickScenario(sc)"
          >
            <span class="ck-scene__icon" :class="`i-${sc.icon}`" />
            <span class="ck-scene__label">{{ sc.label }}</span>
            <span class="ck-scene__desc">{{ sc.desc }}</span>
            <span v-if="sc.needReference" class="ck-scene__tag">
              <span class="i-ph-image" /> photo
            </span>
          </button>
        </div>
      </section>

      <!-- ==================== STEP 2 · 照片 + 称呼 ==================== -->
      <section v-if="step === 2 && scenario" class="ck-sec ck-sec--card">
        <h2 class="ck-sec__title">
          <span class="ck-sec__num">2</span>
          Add their photo and name
        </h2>
        <p class="ck-sec__sub">
          This is what makes it theirs. A photo is best, but you can skip it.
        </p>

        <div class="ck-step2">
          <!-- 照片 -->
          <div class="ck-step2__col">
            <h3 class="ck-mini-title">Their photo</h3>
            <div v-if="photoPreview" class="ck-photo">
              <img :src="photoPreview" alt="Your uploaded photo" />
              <button class="ck-photo__clear" title="Remove photo" @click="clearPhoto">
                <span class="i-ph-x" />
              </button>
            </div>
            <label v-else class="ck-drop">
              <input type="file" accept="image/jpeg,image/png" hidden @change="onFile" />
              <span class="ck-drop__icon i-ph-upload-simple" />
              <span class="ck-drop__title">Choose a photo</span>
              <span class="ck-drop__hint">From your phone or computer. We shrink it for you.</span>
            </label>

            <button v-if="!photoPreview" class="ck-linkish" @click="useSample">
              <span class="i-ph-sparkle" />
              No photo handy? Try one of ours
            </button>

            <p v-if="photoError" class="ck-error">{{ photoError }}</p>
            <p class="ck-hint">
              <span class="i-ph-lock-key" />
              Your photo stays private. Never published, never used to train anything.
            </p>
          </div>

          <!-- 称呼 -->
          <div class="ck-step2__col">
            <h3 class="ck-mini-title">Their name</h3>
            <input
              class="ck-input"
              type="text"
              :value="name"
              :placeholder="scenario?.inputHint || 'e.g. Margaret'"
              @input="name = ($event.target as HTMLInputElement).value"
            />
            <p class="ck-hint">
              We put this on the card exactly as you type it. Check it once.
            </p>

            <h3 class="ck-mini-title ck-mini-title--gap">Anything else we should know?</h3>
            <input
              class="ck-input"
              type="text"
              :value="extra"
              placeholder="e.g. loves gardening, has a golden retriever called Biscuit"
              @input="extra = ($event.target as HTMLInputElement).value"
            />
            <p class="ck-hint">Optional. A detail like this makes the card much more personal.</p>
          </div>
        </div>
      </section>

      <!-- ==================== STEP 3 · 画风 + 生成 ==================== -->
      <section v-if="step === 3 && scenario" class="ck-sec ck-sec--card">
        <h2 class="ck-sec__title">
          <span class="ck-sec__num">3</span>
          Choose a look, then make it
        </h2>
        <p class="ck-sec__sub">Every style below has been tested — the result will look like the picture.</p>

        <div class="ck-styles">
          <button
            v-for="st in availableStyles"
            :key="st.id"
            class="ck-style"
            :class="{ 'ck-style--on': style === st.id }"
            @click="style = st.id"
          >
            <span class="ck-style__name">{{ st.label }}</span>
            <span class="ck-style__desc">{{ st.desc || st.prompt }}</span>
          </button>
        </div>

        <!-- 额度用完 → 升级引导（付费点是 2K 无水印 + 300 DPI 打印规格） -->
        <div v-if="outOfQuota && !usageUnlimited" class="ck-quota">
          <template v-if="outOfCards">
            <p class="ck-quota__title">You have used all your cards.</p>
            <p class="ck-quota__text">
              Add one more card, or a pack of twenty, and you can keep making
              print-ready files.
            </p>
            <NuxtLink to="/pricing" class="ck-btn ck-btn--primary">Add cards</NuxtLink>
          </template>
          <template v-else>
            <p class="ck-quota__title">You have used today's free generations.</p>
            <p class="ck-quota__text">
              Upgrade for 2K images with no watermark, ready to print at 300 DPI —
              and more generations every day.
            </p>
            <NuxtLink to="/pricing" class="ck-btn ck-btn--primary">See plans</NuxtLink>
          </template>
        </div>

        <p v-if="genError" class="ck-error ck-error--big">{{ genError }}</p>
      </section>

      <!-- ==================== 结果 / 编辑器 ==================== -->
      <section v-if="candidates.length" class="ck-sec ck-sec--card">
        <h2 class="ck-sec__title">
          <span class="ck-sec__num">4</span>
          Pick the one you like
        </h2>
        <p class="ck-sec__sub">You can make as many as you like. Regenerate any time.</p>

        <div class="ck-cands">
          <button
            v-for="c in candidates"
            :key="c.id"
            class="ck-cand"
            :class="{ 'ck-cand--on': picked === c.id }"
            @click="picked = c.id"
          >
            <img :src="c.url" :alt="`Generated option ${c.id}`" loading="lazy" />
            <span v-if="picked === c.id" class="ck-cand__tick i-ph-check-circle" />
          </button>
        </div>

        <div class="ck-regen">
          <button class="ck-btn ck-btn--ghost" :disabled="generating" @click="generate">
            <span class="i-ph-arrow-clockwise" />
            Try again
          </button>
          <!-- 生成完顺手给个「看全部作品」的出口 -->
          <NuxtLink to="/my-assets" class="ck-btn ck-btn--ghost">
            <span class="i-ph-images" />
            All my creations
          </NuxtLink>
        </div>

        <div v-if="pickedUrl" class="ck-editor">
          <h3 class="ck-mini-title ck-mini-title--gap">Now add your words</h3>
          <div class="ck-msgpick">
            <button
              v-for="(m, i) in messageOptions"
              :key="i"
              class="ck-msgpick__item"
              :class="{ 'ck-msgpick__item--on': chosenMessage === m }"
              @click="chosenMessage = m"
            >
              {{ m }}
            </button>
            <button
              class="ck-msgpick__item ck-msgpick__item--ai"
              :disabled="writingMessage"
              @click="askAI"
            >
              <span v-if="writingMessage" class="i-ph-spinner animate-spin" />
              <span v-else class="i-ph-magic-wand" />
              Write it for me
            </button>
          </div>

          <CardComposer
            :image-url="pickedUrl"
            :initial-texts="[]"
            :has-paid="hasPaid"
            class="ck-editor__composer"
          />
        </div>
      </section>
    </div>

    <!-- ============ 底部操作栏：返回 / 继续 ============ -->
    <div v-if="step <= 3" class="ck-nav">
      <div class="ck-wrap ck-nav__inner">
        <button
          v-if="step > 1"
          type="button"
          class="ck-btn ck-btn--ghost ck-btn--lg"
          @click="goBack"
        >
          <span class="i-ph-arrow-left" />
          Back
        </button>
        <span v-else class="ck-nav__spacer" />

        <button
          v-if="step < 3"
          type="button"
          class="ck-btn ck-btn--primary ck-btn--lg"
          :disabled="!canContinue"
          @click="goNext"
        >
          Continue
          <span class="i-ph-arrow-right" />
        </button>
        <button
          v-else
          type="button"
          class="ck-btn ck-btn--primary ck-btn--lg"
          :disabled="generating || !scenario || (outOfQuota && !usageUnlimited)"
          @click="generate"
        >
          <span v-if="generating" class="i-ph-spinner animate-spin" />
          <span v-else class="i-ph-magic-wand" />
          {{ generating ? 'Making your card…' : (outOfQuota && !usageUnlimited ? (outOfCards ? 'No cards left' : 'Daily limit reached') : `Make ${scenario?.label.toLowerCase() || 'card'}`) }}
        </button>
      </div>
      <p v-if="step === 3" class="ck-nav__hint">
        <template v-if="usageUnlimited">Unlimited generations on your plan.</template>
        <template v-else-if="usageMode === 'credit' && usageLoaded">
          You have {{ quotaRemaining }} card{{ quotaRemaining === 1 ? '' : 's' }} left on your plan.
        </template>
        <template v-else-if="usageLoaded">You have {{ quotaRemaining }} free generation{{ quotaRemaining === 1 ? '' : 's' }} left today.</template>
        <template v-else>Free to preview. Only pay when it is right.</template>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  IMAGE_SCENARIOS,
  SCENARIO_GROUPS,
  getStyle,
  stylesForScenario,
  type ImageScenarioDef,
} from '~/utils/imageScenarios'
import CardComposer from '~/components/cards/CardComposer.vue'

definePageMeta({ layout: 'marketing' })

useHead({
  title: 'Create a personalised card — Create Keepsakes',
  description: 'Make a birthday card, thank you card or wall print for someone you love. Add their photo, their name and your words. Ready to print.',
})

const stepLabels = ['The occasion', 'Photo & name', 'Style & make']

// ── 分步向导 ─────────────────────────────────────────────
// 以前三步是**滚动**的一整页（一个 section 接一个 section），
// 引导太少、不知道自己在哪。现在一个步骤一个视图，带返回/继续。
// ⚠️ step 以前**根本没定义** —— 模板里 `step >= i + 1` 全是 undefined >= 1，
//    所以步骤指示器从来没点亮过。
const step = ref(1)
/** 走到过的最远步骤（只允许回退到走过的步骤） */
const maxReached = ref(1)

// 文案按步骤一一对应：index 0 = 第 1 步（选场合），依此类推
const STEP_COPY = [
  {
    headline: "Let's make their day.",
    lede: 'Three small steps — no prompt to write, no font to pick. Start with the occasion: it decides the picture. You can change it later.',
  },
  {
    headline: 'Add their photo and name.',
    lede: 'This is what makes it theirs. A photo is best, but you can skip it and still get a lovely card.',
  },
  {
    headline: 'Choose a look, then make it.',
    lede: 'Every style below has been tested — the result will look like the picture. Pick one and we will do the rest.',
  },
  {
    headline: 'Pick the one you like.',
    lede: 'Here are your cards. Add your words, then download it ready to print.',
  },
]

const stepHeadline = computed(() => {
  // 从「My cards」打开旧卡时，第 4 步不是「挑一张」，而是「继续做这张」
  if (step.value === 4 && route.query.from) return 'Your card, ready to finish.'
  return STEP_COPY[step.value - 1]?.headline || STEP_COPY[0].headline
})
const stepLede = computed(() => STEP_COPY[step.value - 1]?.lede || STEP_COPY[0].lede)

/** 能不能继续：第 1 步必须先选了场合 */
const canContinue = computed(() => {
  if (step.value === 1) return !!scenario.value
  return true
})

function goTo(n: number) {
  if (n < 1 || n > 3) return
  if (n > maxReached.value) return
  step.value = n
}

function goNext() {
  if (!canContinue.value) return
  if (step.value >= 3) return
  step.value += 1
  if (step.value > maxReached.value) maxReached.value = step.value
}

function goBack() {
  if (step.value <= 1) return
  step.value -= 1
}

const group = ref<string>('birthday')
const scenario = ref<ImageScenarioDef | null>(null)
const style = ref('watercolor')
const name = ref('')
const extra = ref('')

const photoFile = ref<File | null>(null)
const photoPreview = ref('')
const photoError = ref('')
const uploadId = ref('')

const generating = ref(false)
const genError = ref('')
const candidates = ref<{ id: string; url: string }[]>([])
const picked = ref('')
const pickedUrl = computed(() => candidates.value.find(c => c.id === picked.value)?.url || '')

const messageOptions = ref<string[]>([])
const chosenMessage = ref('')
const writingMessage = ref(false)

// ── 登录弹窗（全站共用那套 AuthModal）──────────────────────
// ⚠️ 以前这里自己画了一个 "Almost there" 弹窗，但它 Teleport 到 body 之后
//    拿不到 .ck-cards 上的 CSS 变量（--ck-ink / --ck-coral / --ck-line ...）
//    → 标题变浅灰、主按钮「Create a free account」变成白底白字（看不见），
//    整个弹窗像坏掉了一样。
//    现在直接用 layouts/marketing.vue 里的 <AuthModal>：
//    自带浅色变量、焦点陷阱、Google 登录、邮箱/密码切换。
const { openSignup, setNote, setAfterAuth, clearNote, clearAfterAuth } = useAuthModal()

/**
 * 未登录点了「Make card」→ 弹登录弹窗。
 * 登录成功后**自动接着出图**（用户不用再点一次按钮），
 * 已经填好的照片、名字、画风都还在页面上，不会丢。
 */
function openAuthForGenerate() {
  setNote('Create an account or sign in — everything you have already entered is kept.')
  setAfterAuth(async () => {
    await loadUsage()
    await generate()
  })
  openSignup()
}

// ── 每日免费额度 ────────────────────────────────────────────
// 额度是服务端强制的（server/utils/daily-usage.ts），这里只是读出来显示。
// 服务端会按**实际出图张数**扣，所以这里也要按剩余额度决定一次出几张。
const usageLoaded = ref(false)
const quotaRemaining = ref(0)
const usageUnlimited = ref(false)
/** 'credit' = 付费档（扣买来的张数）；'daily' = 免费档（扣每日额度） */
const usageMode = ref<'credit' | 'daily' | 'unlimited'>('daily')
/** 有没有付费权益（决定下载是不是 2K 无水印） */
const hasPaid = ref(false)
const outOfQuota = computed(() => usageLoaded.value && !usageUnlimited.value && quotaRemaining.value <= 0)
/** 付费档但张数用完了 —— 和「免费额度用完」要说不同的话 */
const outOfCards = computed(() => usageMode.value === 'credit' && outOfQuota.value)

async function loadUsage() {
  try {
    const res = await api.get<{
      image: {
        limit: number | null
        used: number
        remaining: number | null
        unlimited: boolean
        mode?: 'credit' | 'daily' | 'unlimited'
      }
      paid?: boolean
    }>('/api/user/usage')
    quotaRemaining.value = res.image?.remaining ?? 0
    usageUnlimited.value = !!res.image?.unlimited
    usageMode.value = res.image?.mode || (res.image?.unlimited ? 'unlimited' : 'daily')
    // ⚠️ 付费权益 = 是不是付费档，**不看他卡够不够** ——
    //    付过钱的人做过的卡，永远能下 2K 无水印的打印文件。
    hasPaid.value = !!res.paid
    usageLoaded.value = true
  } catch {
    // 没登录 / 接口不通 → 不显示额度信息，不阻断流程
    usageLoaded.value = false
  }
}

const api = useApi()

/** $fetch 抛错时把 401 认出来（不同版本字段不一样，都试一遍） */
function isUnauthorized(e: any): boolean {
  return (
    e?.statusCode === 401
    || e?.status === 401
    || e?.response?.status === 401
    || e?.data?.statusCode === 401
  )
}

const visibleScenarios = computed(() =>
  IMAGE_SCENARIOS.filter(s => s.group === group.value && s.id !== 'free'),
)

/**
 * SEO 落地页入口：/cards?scenario=birthday
 * 竞品（Silly Robot / Orylia）都按「给谁 / 什么场合」分落地页，
 * 进来就直接落在对应的场景上，别让用户再选一遍。
 */
const route = useRoute()
const routeScenario = computed(() => String(route.query.scenario || ''))
{
  const sc = IMAGE_SCENARIOS.find(s => s.id === routeScenario.value)
  if (sc) {
    group.value = sc.group
    scenario.value = sc
    style.value = sc.styles?.[0] || 'watercolor'
    messageOptions.value = sc.presetMessages ? [...sc.presetMessages] : []
    chosenMessage.value = sc.presetMessages?.[0] || ''
  }
}

/** 有参考图时只给 i2i 安全画风（强画风会改写主体特征） */
const availableStyles = computed(() => {
  if (!scenario.value) return []
  return stylesForScenario(scenario.value, !!uploadId.value || !!photoFile.value)
})

function pickScenario(sc: ImageScenarioDef) {
  scenario.value = sc
  messageOptions.value = sc.presetMessages ? [...sc.presetMessages] : []
  chosenMessage.value = sc.presetMessages?.[0] || ''
  const list = stylesForScenario(sc, !!uploadId.value || !!photoFile.value)
  if (!list.find(s => s.id === style.value)) style.value = list[0]?.id || 'watercolor'
  nextTick(() => {
    document.querySelector('.ck-sec--card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (!f) return
  photoError.value = ''
  if (!/image\/(jpeg|png)/.test(f.type)) {
    photoError.value = 'Please use a JPG or PNG image.'
    return
  }
  photoFile.value = f
  photoPreview.value = URL.createObjectURL(f)
  if (scenario.value) {
    const list = stylesForScenario(scenario.value, true)
    if (!list.find(s => s.id === style.value)) style.value = list[0]?.id || style.value
  }
}

function clearPhoto() {
  photoFile.value = null
  photoPreview.value = ''
  uploadId.value = ''
  if (scenario.value) {
    const list = stylesForScenario(scenario.value, false)
    if (!list.find(s => s.id === style.value)) style.value = list[0]?.id || style.value
  }
}

async function useSample() {
  try {
    const res = await api.get<{ url: string }>('/api/image/samples')
    photoPreview.value = res.url
    // 样例图直接当底图用，不走 i2i
    photoFile.value = null
    uploadId.value = ''
  } catch {
    photoError.value = 'Could not load a sample right now. Please add your own photo.'
  }
}

/**
 * 上传参考图。
 * 上传接口需要登录（未登录时返回 401）——
 * 这时**不要阻断流程**：降级成不带参考图的生成（t2i），
 * 用户仍然能看到成品，注册后回来再用自己的照片。
 */
async function uploadPhoto(): Promise<string> {
  if (!photoFile.value) return ''
  const fd = new FormData()
  fd.append('file', photoFile.value)
  try {
    const res = await api.upload<{ uploadId: string }>('/api/image/upload', fd)
    return res.uploadId || ''
  } catch (e: any) {
    if (isUnauthorized(e)) {
      uploadId.value = ''
      return ''
    }
    throw e
  }
}

async function generate() {
  if (!scenario.value) return
  genError.value = ''
  generating.value = true
  try {
    const uid = await uploadPhoto()
    // 出图张数不能超过今天剩余的免费额度 —— 服务端也会按实际张数扣，
    // 这里先按额度收敛，避免请求到一半才被拒。
    const maxN = usageUnlimited.value ? 4 : Math.max(1, Math.min(4, quotaRemaining.value))
    const res = await api.post<{ images: { id: string; imageUrl: string | null }[] }>('/api/image/generate', {
      scenario: scenario.value.id,
      style: style.value,
      name: name.value,
      extra: extra.value,
      uploadId: uid || undefined,
      n: maxN,
      aspect_ratio: '3:4',
      promptOptimizer: false,
    })
    await loadUsage()
    // ⚠️ 后端返回的是 { id, imageUrl }（签名 URL），
    //    以前这里读的是 im.url → 永远是 undefined → 候选图一片空白
    candidates.value = (res.images || [])
      .filter((im) => !!im.imageUrl)
      .map((im) => ({
        id: im.id,
        url: im.imageUrl as string,
      }))
    picked.value = candidates.value[0]?.id || ''
    // 出图了 → 切到结果页（第 4 步）
    step.value = 4
    maxReached.value = Math.max(maxReached.value, 4)
  } catch (e: any) {
    // 401 = 需要登录。判断放在服务端返回上，比读本地 auth 状态可靠
    //（useAuth 每次调用返回新 ref，组件里拿到的 user 常常是空的）
    if (isUnauthorized(e)) {
      // 弹全站共用的登录弹窗，登录成功自动接着出图
      openAuthForGenerate()
    } else if (e?.data?.code === 'OUT_OF_CREDITS' || e?.data?.data?.code === 'OUT_OF_CREDITS') {
      // 付费档但张数用完了 —— 说人话 + 给充值入口
      quotaRemaining.value = 0
      genError.value = 'You have used all your cards. Add more to keep making them.'
      await loadUsage()
    } else if (e?.statusCode === 429 || e?.data?.statusCode === 429) {
      // 每日免费额度用完 —— 说人话 + 给升级入口
      quotaRemaining.value = 0
      genError.value = "You've used today's free generations. Upgrade for no-watermark 2K prints."
      await loadUsage()
    } else {
      genError.value =
        e?.data?.statusMessage || e?.message || 'Something went wrong. Please try again.'
    }
  } finally {
    generating.value = false
  }
}

async function askAI() {
  if (!scenario.value) return
  writingMessage.value = true
  try {
    const res = await api.post<{ message: string }>('/api/image/message', {
      scenario: scenario.value.id,
      name: name.value,
      extra: extra.value,
    })
    if (res.message) {
      messageOptions.value = [res.message, ...messageOptions.value]
      chosenMessage.value = res.message
    }
  } catch {
    genError.value = 'Could not write a message just now. Try one of the suggestions.'
  } finally {
    writingMessage.value = false
  }
}

/**
 * 从「My cards」点某张卡进来的：/cards?from=<imageId>
 * ⚠️ 以前这个参数**根本没人读** —— 点「My cards」里的卡片只是开了一张新卡，
 *    用户以为在编辑旧卡，其实从头来过。
 * 现在把那张图放回编辑区（能改字、能再下载一次）。
 */
async function loadFromCard() {
  const id = String(route.query.from || '')
  if (!id) return
  try {
    const res = await api.get<{ images: { id: string; imageUrl: string | null }[] }>('/api/images')
    const hit = (res.images || []).find(i => i.id === id)
    if (!hit?.imageUrl) return
    candidates.value = [{ id: hit.id, url: hit.imageUrl }]
    picked.value = hit.id
    step.value = 4
    maxReached.value = 4
  } catch {
    // 没登录 / 找不到 / 没权限 → 正常走「做一张新卡」的流程
  }
}

// 额度：进入页面就读一次（未登录会失败，忽略即可 —— 生成时服务端会要求登录）
onMounted(() => {
  loadUsage()
  // 支持 /cards?step=2 直接落到某一步
  const q = Number(route.query.step || 1)
  if (Number.isFinite(q) && q >= 1 && q <= 3) {
    step.value = q
    maxReached.value = q
  }
  // 从「My cards」过来的 → 直接把旧卡打开
  loadFromCard()
})

// 步骤写进 URL —— 刷新和浏览器后退都保持在同一步
watch(step, (v) => {
  const q = { ...route.query }
  if (v > 1) q.step = String(v)
  else delete q.step
  navigateTo({ path: '/cards', query: q }, { replace: true })
})

// 离开页面时把弹窗的说明/回调清掉 —— 别让别的页面误触发这一页的逻辑
onBeforeUnmount(() => {
  clearNote()
  clearAfterAuth()
})
</script>

<style scoped>
.ck-cards {
  --ck-bg: #fbf7f1;
  --ck-cream: #f5ede1;
  --ck-white: #fffdfa;
  --ck-ink: #2a2420;
  --ck-ink-2: #6b5f55;
  --ck-line: rgba(58, 46, 38, 0.12);
  --ck-coral: #c8543d;
  --ck-coral-deep: #a53f2c;
  --ck-serif: 'Playfair Display', Georgia, serif;

  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: 'Manrope', system-ui, sans-serif;
  min-height: 100vh;
  /* 底部操作栏是 sticky 的 —— 内容不满一屏时它会飘在半空，
     所以整页用 flex 纵向排，body 撑开，把操作栏压到屏幕底部 */
  display: flex;
  flex-direction: column;
}

/* ⚠️ width:100% 不能少 ——
   .ck-cards 是 flex 纵向容器，子项带 margin:0 auto 时会**收缩成内容宽**
   （auto margin 吃掉了剩余空间），导致正文卡片比头部窄一大截、两边没对齐。 */
.ck-wrap { max-width: 74rem; width: 100%; margin: 0 auto; padding: 0 1.5rem; }

.ck-h1 {
  font-family: var(--ck-serif);
  font-size: clamp(2.5rem, 5.6vw, 3.9rem);
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -0.015em;
  color: var(--ck-ink);
}
.ck-lede {
  margin-top: 1.15rem;
  font-size: 1.125rem;
  line-height: 1.65;
  color: var(--ck-ink-2);
  max-width: 46ch;
}

/* ---------- 顶部 ---------- */
.ck-cards__head {
  padding: 3.75rem 0 2.75rem;
  border-bottom: 1px solid var(--ck-line);
  background: linear-gradient(180deg, #f7efe4 0%, var(--ck-bg) 100%);
}
/* ⚠️ 头部两栏：左边文案，右边真实成品卡
   （原来整页只有文字，看起来又窄又空 —— 首页是「文案 + 成品图」两栏） */
.ck-cards__headgrid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 15rem;
  gap: 3rem;
  align-items: center;
}
@media (max-width: 900px) {
  .ck-cards__headgrid { grid-template-columns: 1fr; gap: 2.5rem; }
  .ck-cards__art { display: none; }
}
.ck-cards__art { justify-self: end; }
.ck-showcard {
  width: 100%;
  border-radius: 1.25rem;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 28px 56px -30px rgba(58, 46, 38, 0.55);
  transform: rotate(1.5deg);
}
.ck-showcard img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
}
.ck-showcard__caption {
  padding: 0.85rem 1rem 0.95rem;
  border-top: 1px solid var(--ck-line);
}
.ck-showcard__kicker {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ck-coral);
}
.ck-showcard__line {
  margin: 0.3rem 0 0;
  font-family: var(--ck-serif);
  font-size: 1rem;
  font-style: italic;
  color: var(--ck-ink);
}
.ck-steps-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 2rem;
  margin: 2.5rem 0 0;
  padding: 0;
  list-style: none;
  font-size: 1rem;
  font-weight: 600;
  color: #a08f81;
}
.ck-steps-nav li { display: inline-flex; align-items: center; gap: 0.5rem; }
.ck-steps-nav__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  background: none;
  border: 0;
  padding: 0.35rem 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  transition: color 0.15s ease;
}
.ck-steps-nav__btn:disabled { cursor: default; opacity: 0.55; }
.ck-steps-nav__btn:not(:disabled):hover { color: var(--ck-coral-deep); }
.ck-steps-nav__dot {
  display: grid;
  place-items: center;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 999px;
  border: 1.5px solid var(--ck-line);
  background: #fff;
  font-size: 0.8125rem;
}
.ck-steps-nav li.is-on { color: var(--ck-ink); }
.ck-steps-nav li.is-on .ck-steps-nav__dot { border-color: var(--ck-coral); color: var(--ck-coral); }
.ck-steps-nav li.is-current { color: var(--ck-ink); }
.ck-steps-nav li.is-current .ck-steps-nav__dot {
  background: var(--ck-coral);
  border-color: var(--ck-coral);
  color: #fff;
  box-shadow: 0 0 0 4px rgba(200, 84, 61, 0.14);
}
.ck-steps-nav li.is-done { color: var(--ck-coral-deep); }
.ck-steps-nav li.is-done .ck-steps-nav__dot { background: var(--ck-coral); border-color: var(--ck-coral); color: #fff; }

/* ---------- 步骤眉标 ---------- */
.ck-eyebrow {
  margin: 0 0 0.6rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ck-coral);
}

/* ---------- 底部操作栏 ---------- */
.ck-nav {
  position: sticky;
  bottom: 0;
  z-index: 40;
  background: rgba(251, 247, 241, 0.94);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--ck-line);
  padding: 1.1rem 0 1.3rem;
}
.ck-nav__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.ck-nav__spacer { display: block; }
.ck-nav__hint {
  margin: 0.7rem 0 0;
  text-align: center;
  font-size: 0.85rem;
  color: var(--ck-ink-2);
}

/* ---------- 区块 ---------- */
.ck-cards__body { padding: 4rem 0 6.5rem; display: flex; flex-direction: column; gap: 4rem; flex: 1 0 auto; }
.ck-sec { display: flex; flex-direction: column; gap: 1rem; }
.ck-sec--card {
  padding: 2.5rem;
  border: 1px solid var(--ck-line);
  border-radius: 1.25rem;
  background: var(--ck-white);
  box-shadow: 0 20px 48px -36px rgba(58, 46, 38, 0.45);
}
.ck-sec__title {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  font-family: var(--ck-serif);
  font-size: clamp(1.7rem, 3vw, 2.2rem);
  font-weight: 600;
  line-height: 1.15;
  color: var(--ck-ink);
}
.ck-sec__num {
  display: grid;
  place-items: center;
  flex: none;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  background: var(--ck-coral);
  color: #fff;
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
}
.ck-sec__sub {
  margin: -0.35rem 0 0.75rem;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--ck-ink-2);
  max-width: 54ch;
}
.ck-mini-title { margin: 0; font-size: 0.9375rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #a08f81; }
.ck-mini-title--gap { margin-top: 1.75rem; }

/* ---------- tab ---------- */
.ck-tabs { display: flex; flex-wrap: wrap; gap: 0.55rem; margin: 0.25rem 0 0.5rem; }
.ck-tab {
  padding: 0.6rem 1.15rem;
  border: 1px solid var(--ck-line);
  border-radius: 999px;
  background: #faf6ef;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ck-ink-2);
  cursor: pointer;
}
.ck-tab--on { background: var(--ck-ink); border-color: var(--ck-ink); color: #fff; }

/* ---------- 场景卡 ---------- */
.ck-scene-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14.5rem, 1fr));
  gap: 1.1rem;
  margin-top: 0.25rem;
}
.ck-scene {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1.5rem 1.35rem;
  border: 1.5px solid var(--ck-line);
  border-radius: 1rem;
  background: #faf6ef;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.14s ease, transform 0.14s ease, background 0.14s ease;
}
.ck-scene:hover { transform: translateY(-2px); border-color: rgba(200, 84, 61, 0.5); background: #fff; }
.ck-scene--on { border-color: var(--ck-coral); background: rgba(200, 84, 61, 0.07); }
.ck-scene__icon { font-size: 1.85rem; color: var(--ck-coral); }
.ck-scene__label { font-size: 1.125rem; font-weight: 700; color: var(--ck-ink); }
.ck-scene__desc { font-size: 0.875rem; line-height: 1.5; color: var(--ck-ink-2); }
.ck-scene__tag {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #a08f81;
}

/* ---------- step2 ---------- */
.ck-step2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2.75rem; }
@media (max-width: 760px) { .ck-step2 { grid-template-columns: 1fr; } }

.ck-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 2.5rem 1.25rem;
  border: 2px dashed rgba(58, 46, 38, 0.22);
  border-radius: 1rem;
  background: #faf6ef;
  text-align: center;
  cursor: pointer;
}
.ck-drop:hover { border-color: var(--ck-coral); }
.ck-drop__icon { font-size: 2.1rem; color: var(--ck-coral); }
.ck-drop__title { font-size: 1.0625rem; font-weight: 700; color: var(--ck-ink); }
.ck-drop__hint { font-size: 0.875rem; color: var(--ck-ink-2); }

.ck-photo { position: relative; border-radius: 1rem; overflow: hidden; border: 1px solid var(--ck-line); }
.ck-photo img { display: block; width: 100%; max-height: 22rem; object-fit: cover; }
.ck-photo__clear {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 999px;
  background: rgba(42, 36, 32, 0.65);
  color: #fff;
  cursor: pointer;
}

.ck-linkish {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.6rem;
  border: none;
  background: none;
  padding: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ck-coral-deep);
  cursor: pointer;
  text-decoration: underline;
}

.ck-input {
  width: 100%;
  margin-top: 0.65rem;
  padding: 0.85rem 1rem;
  border: 1px solid rgba(58, 46, 38, 0.16);
  border-radius: 0.7rem;
  background: #fff;
  font-size: 1rem;
  font-family: inherit;
  color: var(--ck-ink);
}
.ck-input:focus { outline: 2px solid rgba(200, 84, 61, 0.4); outline-offset: 1px; }

.ck-hint { display: flex; align-items: flex-start; gap: 0.4rem; margin-top: 0.75rem; font-size: 0.875rem; line-height: 1.55; color: var(--ck-ink-2); }
.ck-hint--center { justify-content: center; }
.ck-quota {
  margin-top: 1rem;
  padding: 1.35rem 1.5rem;
  border-radius: 1rem;
  background: #fff;
  border: 1px solid var(--ck-line, rgba(58, 46, 38, 0.12));
  box-shadow: 0 8px 22px -14px rgba(58, 46, 38, 0.35);
  max-width: 34rem;
}
.ck-quota__title {
  margin: 0 0 0.35rem;
  font-weight: 700;
  font-size: 1rem;
  color: var(--ck-ink, #2a2420);
}
.ck-quota__text {
  margin: 0 0 0.9rem;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--ck-ink-2, #6b5f55);
}

.ck-error { margin-top: 0.6rem; font-size: 0.875rem; color: var(--ck-coral-deep); }
.ck-error--big { padding: 0.75rem 1rem; border-radius: 0.6rem; background: rgba(200, 84, 61, 0.1); font-size: 0.9375rem; }

/* ---------- 画风 ---------- */
.ck-styles { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 0.9rem; }
.ck-style {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 1.15rem 1.2rem;
  border: 1.5px solid var(--ck-line);
  border-radius: 0.9rem;
  background: #faf6ef;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.14s ease, background 0.14s ease;
}
.ck-style:hover { border-color: rgba(200, 84, 61, 0.5); background: #fff; }
.ck-style--on { border-color: var(--ck-coral); background: rgba(200, 84, 61, 0.07); }
.ck-style__name { font-size: 1rem; font-weight: 700; color: var(--ck-ink); }
.ck-style__desc { font-size: 0.8125rem; line-height: 1.45; color: var(--ck-ink-2); }

/* ---------- 生成 ---------- */
.ck-generate { margin-top: 1.5rem; display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem; }
.ck-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1.6rem;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: transform 0.14s ease, background 0.14s ease;
}
.ck-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.ck-btn--primary { background: var(--ck-coral); color: #fff; box-shadow: 0 12px 26px -12px rgba(200, 84, 61, 0.75); }
.ck-btn--primary:hover:not(:disabled) { background: var(--ck-coral-deep); }
.ck-btn--ghost { border: 1.5px solid var(--ck-line); color: var(--ck-ink); background: transparent; }
.ck-btn--ghost:hover:not(:disabled) { border-color: var(--ck-coral); color: var(--ck-coral-deep); }
.ck-btn--lg { padding: 1rem 2rem; font-size: 1.0625rem; }

/* ---------- 候选 ---------- */
.ck-cands { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: 1rem; }
.ck-cand {
  position: relative;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 0.75rem;
  overflow: hidden;
  background: none;
  cursor: pointer;
}
.ck-cand img { display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: cover; }
.ck-cand--on { border-color: var(--ck-coral); }
.ck-cand__tick { position: absolute; top: 0.4rem; right: 0.4rem; font-size: 1.4rem; color: #fff; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5)); }
.ck-regen { margin-top: 1rem; }

/* ---------- 编辑器 ---------- */
.ck-editor { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--ck-line); }
.ck-msgpick { display: flex; flex-direction: column; gap: 0.6rem; margin: 0.9rem 0 1.75rem; }
.ck-msgpick__item {
  padding: 0.85rem 1.05rem;
  border: 1px solid var(--ck-line);
  border-radius: 0.75rem;
  background: #faf6ef;
  font-size: 0.9375rem;
  line-height: 1.5;
  text-align: left;
  color: var(--ck-ink);
  cursor: pointer;
}
.ck-msgpick__item--on { border-color: var(--ck-coral); background: rgba(200, 84, 61, 0.05); }
.ck-msgpick__item--ai { display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 700; color: var(--ck-coral-deep); border-style: dashed; }
</style>
