<template>
  <div class="ck-cards">
    <!-- ============ 顶部 ============ -->
    <header class="ck-cards__head">
      <div class="ck-wrap">
        <h1 class="ck-h1">Let's make their day.</h1>
        <p class="ck-lede">
          Three small steps. You do not need to write a prompt, pick a font
          or know anything about design.
        </p>
        <ol class="ck-steps-nav">
          <li v-for="(s, i) in stepLabels" :key="s" :class="{ 'is-on': step >= i + 1, 'is-done': step > i + 1 }">
            <span class="ck-steps-nav__dot">
              <span v-if="step > i + 1" class="i-ph-check" />
              <template v-else>{{ i + 1 }}</template>
            </span>
            {{ s }}
          </li>
        </ol>
      </div>
    </header>

    <div class="ck-wrap ck-cards__body">
      <!-- ==================== STEP 1 · 场合 ==================== -->
      <section class="ck-sec">
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
      <section v-if="scenario" class="ck-sec ck-sec--card">
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
              :placeholder="scenario.inputHint || 'e.g. Margaret'"
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
      <section v-if="scenario" class="ck-sec ck-sec--card">
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

        <div class="ck-generate">
          <button
            class="ck-btn ck-btn--primary ck-btn--lg"
            :disabled="generating || !scenario"
            @click="generate"
          >
            <span v-if="generating" class="i-ph-spinner animate-spin" />
            <span v-else class="i-ph-magic-wand" />
            {{ generating ? 'Making your card…' : `Make ${scenario.label.toLowerCase()}` }}
          </button>
          <p class="ck-hint ck-hint--center">
            <span class="i-ph-check-circle" />
            Free to preview. Only pay when it is right.
          </p>
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

    <!-- 登录弹窗 -->
    <Teleport to="body">
      <div v-if="needLogin" class="ck-modal" @click.self="needLogin = false">
        <div class="ck-modal__box">
          <h3 class="ck-modal__title">Almost there</h3>
          <p class="ck-modal__text">
            We just need an account to save your card and keep your photo safe.
            Everything you have entered is kept.
          </p>
          <div class="ck-modal__actions">
            <NuxtLink to="/signup?redirect=/cards" class="ck-btn ck-btn--primary">Create a free account</NuxtLink>
            <NuxtLink to="/login?redirect=/cards" class="ck-btn ck-btn--ghost">I already have one</NuxtLink>
          </div>
          <button class="ck-modal__close" @click="needLogin = false">
            <span class="i-ph-x" />
          </button>
        </div>
      </div>
    </Teleport>
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
const needLogin = ref(false)
const hasPaid = ref(false)

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

async function uploadPhoto(): Promise<string> {
  if (!photoFile.value) return ''
  const fd = new FormData()
  fd.append('file', photoFile.value)
  const res = await api.upload<{ uploadId: string }>('/api/image/upload', fd)
  return res.uploadId
}

async function generate() {
  if (!scenario.value) return
  genError.value = ''
  generating.value = true
  try {
    const uid = await uploadPhoto()
    const res = await api.post<{ images: { id: string; url: string }[] }>('/api/image/generate', {
      scenario: scenario.value.id,
      style: style.value,
      name: name.value,
      extra: extra.value,
      uploadId: uid || undefined,
      n: 4,
      aspect_ratio: '3:4',
      promptOptimizer: false,
    })
    candidates.value = (res.images || []).map((im, i) => ({
      id: im.id || String(i),
      url: im.url,
    }))
    picked.value = candidates.value[0]?.id || ''
  } catch (e: any) {
    // 401 = 需要登录。判断放在服务端返回上，比读本地 auth 状态可靠
    //（useAuth 每次调用返回新 ref，组件里拿到的 user 常常是空的）
    if (isUnauthorized(e)) {
      needLogin.value = true
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
}

.ck-wrap { max-width: 74rem; margin: 0 auto; padding: 0 1.5rem; }

.ck-h1 {
  font-family: var(--ck-serif);
  font-size: clamp(2.2rem, 5vw, 3.4rem);
  font-weight: 600;
  line-height: 1.1;
  color: var(--ck-ink);
}
.ck-lede {
  margin-top: 0.85rem;
  font-size: 1.0625rem;
  line-height: 1.6;
  color: var(--ck-ink-2);
  max-width: 46ch;
}

/* ---------- 顶部 ---------- */
.ck-cards__head {
  padding: 3.5rem 0 1.5rem;
  border-bottom: 1px solid var(--ck-line);
  background: linear-gradient(180deg, #f7efe4 0%, var(--ck-bg) 100%);
}
.ck-steps-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.75rem;
  margin: 1.75rem 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #a08f81;
}
.ck-steps-nav li { display: inline-flex; align-items: center; gap: 0.5rem; }
.ck-steps-nav__dot {
  display: grid;
  place-items: center;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 999px;
  border: 1.5px solid var(--ck-line);
  background: #fff;
  font-size: 0.8125rem;
}
.ck-steps-nav li.is-on { color: var(--ck-ink); }
.ck-steps-nav li.is-on .ck-steps-nav__dot { border-color: var(--ck-coral); color: var(--ck-coral); }
.ck-steps-nav li.is-done { color: var(--ck-coral-deep); }
.ck-steps-nav li.is-done .ck-steps-nav__dot { background: var(--ck-coral); border-color: var(--ck-coral); color: #fff; }

/* ---------- 区块 ---------- */
.ck-cards__body { padding: 2.5rem 0 5rem; display: flex; flex-direction: column; gap: 3rem; }
.ck-sec { display: flex; flex-direction: column; gap: 0.6rem; }
.ck-sec--card {
  padding: 2rem;
  border: 1px solid var(--ck-line);
  border-radius: 1.1rem;
  background: var(--ck-white);
}
.ck-sec__title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: var(--ck-serif);
  font-size: clamp(1.5rem, 2.6vw, 1.95rem);
  font-weight: 600;
  color: var(--ck-ink);
}
.ck-sec__num {
  display: grid;
  place-items: center;
  flex: none;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 999px;
  background: var(--ck-coral);
  color: #fff;
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
}
.ck-sec__sub { font-size: 0.9375rem; color: var(--ck-ink-2); margin: 0 0 0.75rem; }
.ck-mini-title { margin: 0; font-size: 0.875rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #a08f81; }
.ck-mini-title--gap { margin-top: 1.25rem; }

/* ---------- tab ---------- */
.ck-tabs { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.75rem 0 0.5rem; }
.ck-tab {
  padding: 0.45rem 0.95rem;
  border: 1px solid var(--ck-line);
  border-radius: 999px;
  background: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ck-ink-2);
  cursor: pointer;
}
.ck-tab--on { background: var(--ck-ink); border-color: var(--ck-ink); color: #fff; }

/* ---------- 场景卡 ---------- */
.ck-scene-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11.5rem, 1fr));
  gap: 0.85rem;
  margin-top: 0.5rem;
}
.ck-scene {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 1.15rem 1rem;
  border: 1.5px solid var(--ck-line);
  border-radius: 0.9rem;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.14s ease, transform 0.14s ease;
}
.ck-scene:hover { transform: translateY(-2px); border-color: rgba(200, 84, 61, 0.5); }
.ck-scene--on { border-color: var(--ck-coral); background: rgba(200, 84, 61, 0.05); }
.ck-scene__icon { font-size: 1.5rem; color: var(--ck-coral); }
.ck-scene__label { font-size: 1.0625rem; font-weight: 700; color: var(--ck-ink); }
.ck-scene__desc { font-size: 0.8125rem; line-height: 1.45; color: var(--ck-ink-2); }
.ck-scene__tag {
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #a08f81;
}

/* ---------- step2 ---------- */
.ck-step2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
@media (max-width: 760px) { .ck-step2 { grid-template-columns: 1fr; } }

.ck-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 2rem 1rem;
  border: 2px dashed rgba(58, 46, 38, 0.22);
  border-radius: 0.9rem;
  background: #fdfbf7;
  text-align: center;
  cursor: pointer;
}
.ck-drop:hover { border-color: var(--ck-coral); }
.ck-drop__icon { font-size: 1.8rem; color: var(--ck-coral); }
.ck-drop__title { font-size: 1rem; font-weight: 700; color: var(--ck-ink); }
.ck-drop__hint { font-size: 0.8125rem; color: var(--ck-ink-2); }

.ck-photo { position: relative; border-radius: 0.9rem; overflow: hidden; border: 1px solid var(--ck-line); }
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
  margin-top: 0.5rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--ck-line);
  border-radius: 0.6rem;
  background: #fff;
  font-size: 1rem;
  font-family: inherit;
  color: var(--ck-ink);
}
.ck-input:focus { outline: 2px solid rgba(200, 84, 61, 0.4); outline-offset: 1px; }

.ck-hint { display: flex; align-items: flex-start; gap: 0.35rem; margin-top: 0.6rem; font-size: 0.8125rem; line-height: 1.5; color: var(--ck-ink-2); }
.ck-hint--center { justify-content: center; }
.ck-error { margin-top: 0.6rem; font-size: 0.875rem; color: var(--ck-coral-deep); }
.ck-error--big { padding: 0.75rem 1rem; border-radius: 0.6rem; background: rgba(200, 84, 61, 0.1); font-size: 0.9375rem; }

/* ---------- 画风 ---------- */
.ck-styles { display: grid; grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr)); gap: 0.7rem; }
.ck-style {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.85rem 0.9rem;
  border: 1.5px solid var(--ck-line);
  border-radius: 0.75rem;
  background: #fff;
  text-align: left;
  cursor: pointer;
}
.ck-style--on { border-color: var(--ck-coral); background: rgba(200, 84, 61, 0.05); }
.ck-style__name { font-size: 0.9375rem; font-weight: 700; color: var(--ck-ink); }
.ck-style__desc { font-size: 0.75rem; line-height: 1.4; color: var(--ck-ink-2); }

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
.ck-cands { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 0.85rem; }
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
.ck-msgpick { display: flex; flex-direction: column; gap: 0.5rem; margin: 0.75rem 0 1.5rem; }
.ck-msgpick__item {
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--ck-line);
  border-radius: 0.65rem;
  background: #fff;
  font-size: 0.9375rem;
  line-height: 1.5;
  text-align: left;
  color: var(--ck-ink);
  cursor: pointer;
}
.ck-msgpick__item--on { border-color: var(--ck-coral); background: rgba(200, 84, 61, 0.05); }
.ck-msgpick__item--ai { display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 700; color: var(--ck-coral-deep); border-style: dashed; }

/* ---------- 弹窗 ---------- */
.ck-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: rgba(36, 31, 27, 0.55);
}
.ck-modal__box {
  position: relative;
  width: min(28rem, 100%);
  padding: 2rem;
  border-radius: 1rem;
  background: #fffdfa;
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.4);
}
.ck-modal__title { font-family: var(--ck-serif); font-size: 1.5rem; font-weight: 600; color: var(--ck-ink); }
.ck-modal__text { margin-top: 0.6rem; font-size: 0.9375rem; line-height: 1.6; color: var(--ck-ink-2); }
.ck-modal__actions { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 1.25rem; }
.ck-modal__close { position: absolute; top: 0.75rem; right: 0.75rem; border: none; background: none; font-size: 1.1rem; color: #a08f81; cursor: pointer; }
</style>
