<template>
  <div class="ck-cards">
    <!--
      ============ 顶部 ============
      2026-11-23：三步向导收进了一个就地参数弹窗（对齐竞品/原型）。
      这里只留一个醒目的入口按钮 —— 点开弹窗，格式/场合/照片名字/画风一次填完。
      结果生成后弹窗关闭，编辑器和交付留在下方页面内，不再有步骤跳转。
    -->
    <header class="ck-cards__head">
      <div class="ck-wrap ck-cards__headgrid">
        <div class="ck-cards__headcopy">
          <p class="ck-eyebrow">{{ formatCopy.eyebrow }}</p>
          <h1 class="ck-h1">{{ pageHeadline }}</h1>
          <p class="ck-lede">{{ pageLede }}</p>
          <button type="button" class="ck-btn ck-btn--primary ck-btn--lg ck-hero__cta" @click="openForm">
            <span class="i-ph-magic-wand" />
            {{ candidates.length ? 'Make another one' : formatCopy.ctaPhrase }}
            <span class="i-ph-arrow-right" />
          </button>
          <p class="ck-hero__hint">
            <span class="i-ph-clock-counter-clockwise" />
            About a minute · no account needed to start
          </p>
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

    <!--
      ============ 参数弹窗（就地，不 Teleport）============
      内联在 .ck-cards 内，继承它的 CSS 变量；z-index 低于登录弹窗(120)，
      这样未登录点生成时登录框能浮在上面，参数不丢、登录后自动续跑。
    -->
    <div v-if="formOpen" class="ck-formmodal" role="dialog" aria-modal="true" aria-label="Make a card">
      <div class="ck-formmodal__backdrop" @click="closeForm" />
      <div class="ck-formmodal__panel">
        <div class="ck-formmodal__head">
          <div>
            <p class="ck-formmodal__eyebrow">{{ formatCopy.eyebrow }}</p>
            <h2 class="ck-formmodal__title">{{ formatCopy.title }}</h2>
          </div>
          <button type="button" class="ck-formmodal__close" aria-label="Close" @click="closeForm">
            <span class="i-ph-x" />
          </button>
        </div>

        <div class="ck-formmodal__body">
          <!-- ============ 主屏：一屏填完核心参数 ============
               ⚠️ 必须常驻（不能 v-if/v-show 跟着 subPage 切换）：
               二级子页是 absolute 定位、不占文档流高度 —— 主屏一卸载，
               body 高度就塌成 0，弹窗只剩头尾一条缝、子页内容从缝里溢出。 -->
          <div class="ck-mainform">
            <!-- 场合 chip（内联当前值，点击进二级页） -->
            <div class="ck-field">
              <span class="ck-field__label">What is it for?</span>
              <button type="button" class="ck-valuechip" @click="openSub('occasion')">
                <span class="ck-valuechip__icon" :class="`i-${scenario?.icon || 'ph-calendar-heart'}`" />
                <span class="ck-valuechip__text">{{ scenario?.label || 'Choose an occasion' }}</span>
                <span class="ck-valuechip__change">Change</span>
              </button>
            </div>

            <!-- 名字（唯一必填） -->
            <div class="ck-field">
              <label class="ck-field__label" for="ck-name">Who is it for? <span class="ck-field__req">*</span></label>
              <input
                id="ck-name"
                class="ck-input"
                type="text"
                :value="name"
                :placeholder="scenario?.inputHint || 'e.g. Margaret'"
                @input="name = ($event.target as HTMLInputElement).value"
              />
            </div>

            <!-- 一句话 / 详情（格式决定是日期地点还是收件人提示） -->
            <div class="ck-field">
              <label class="ck-field__label" for="ck-extra">{{ formatDef.extraLabel }}</label>
              <textarea
                id="ck-extra"
                class="ck-input ck-textarea"
                :value="extra"
                :placeholder="formatDef.extraPlaceholder"
                @input="extra = ($event.target as HTMLInputElement).value"
              />
            </div>

            <!-- Make it yours：风格/照片 chip（内联当前值，点击进二级页） -->
            <div class="ck-field">
              <span class="ck-field__label">Make it yours</span>
              <div class="ck-chips">
                <button type="button" class="ck-minichip" @click="openSub('style')">
                  <span>Style</span>
                  <b>{{ isBestMatch ? 'Best match' : currentStyleLabel }}</b>
                  <span class="i-ph-caret-right" />
                </button>
                <button type="button" class="ck-minichip" @click="openSub('photo')">
                  <span>Photo</span>
                  <b>{{ photoAdded ? 'Added' : 'None' }}</b>
                  <span class="i-ph-caret-right" />
                </button>
              </div>
            </div>

            <!-- 次要信息默认收起 -->
            <details class="ck-moreopt">
              <summary>More options</summary>
              <div class="ck-moreopt__inner">
                <p class="ck-hint">
                  <span class="i-ph-lock-key" />
                  Your photo stays private. Never published, never used to train anything.
                </p>
                <p class="ck-hint">
                  {{ cardFormat === 'invite'
                    ? 'Date and place print on the front, exactly as you typed them.'
                    : 'A small detail like this makes the card much more personal.' }}
                </p>
              </div>
            </details>

            <!-- 额度用完 → 升级引导（付费点是 2K 无水印 + 300 DPI 打印规格） -->
            <div v-if="outOfQuota && !usageUnlimited" class="ck-quota ck-quota--main">
              <template v-if="outOfCards">
                <p class="ck-quota__title">You have used all your cards.</p>
                <p class="ck-quota__text">
                  Add one more card, or a pack of twenty, and you can keep making
                  print-ready files.
                </p>
                <NuxtLink to="/pricing" class="ck-btn ck-btn--primary">Add cards</NuxtLink>
              </template>
              <template v-else>
                <p class="ck-quota__title">You've used your 3 free generations.</p>
                <p class="ck-quota__text">
                  Those 3 are yours for good — they don't reset. Upgrade for 2K images
                  with no watermark, ready to print at 300 DPI, and 200 credits a month.
                </p>
                <NuxtLink to="/pricing" class="ck-btn ck-btn--primary">See plans</NuxtLink>
              </template>
            </div>

            <p v-if="genError" class="ck-error ck-error--big">{{ genError }}</p>
          </div>

          <!-- ============ 二级页 · 场合 ============ -->
          <div v-if="subPage === 'occasion'" class="ck-sub">
            <div class="ck-sub__head">
              <button type="button" class="ck-sub__back" @click="closeSub">
                <span class="i-ph-caret-left" /> Back
              </button>
              <b>Choose an occasion</b>
            </div>
            <div class="ck-tabs">
              <button
                v-for="g in SCENARIO_GROUPS"
                :key="g.id"
                class="ck-tab"
                :class="{ 'ck-tab--on': group === g.id }"
                @click="group = g.id"
              >
                <span class="ck-tab__icon" :class="`i-${g.icon}`" />
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
          </div>

          <!-- ============ 二级页 · 风格 ============ -->
          <div v-if="subPage === 'style'" class="ck-sub">
            <div class="ck-sub__head">
              <button type="button" class="ck-sub__back" @click="closeSub">
                <span class="i-ph-caret-left" /> Back
              </button>
              <b>Choose a style</b>
            </div>
            <div class="ck-styles">
              <button
                type="button"
                class="ck-style ck-style--best"
                :class="{ 'ck-style--on': isBestMatch }"
                @click="pickBestMatch"
              >
                <span class="ck-style__thumb ck-style__thumb--best"><span class="i-ph-sparkle" /></span>
                <span class="ck-style__name">Best match</span>
                <span v-if="isBestMatch" class="ck-style__check">✓</span>
              </button>
              <button
                v-for="st in availableStyles"
                :key="st.id"
                class="ck-style"
                :class="{ 'ck-style--on': !isBestMatch && style === st.id }"
                @click="pickStyle(st.id)"
              >
                <span class="ck-style__thumb">
                  <img
                    v-if="st.thumb && !thumbFailed[st.id]"
                    :src="assetUrl(st.thumb)"
                    :alt="`${st.label} example`"
                    loading="lazy"
                    decoding="async"
                    width="160"
                    height="160"
                    @error="thumbFailed[st.id] = true"
                  />
                  <span v-else class="ck-style__glyph" :class="`i-${st.icon}`" />
                </span>
                <span class="ck-style__name">{{ st.label }}</span>
                <span class="ck-style__desc">{{ st.desc || st.prompt }}</span>
              </button>
            </div>
            <div class="ck-pickrow">
              <button type="button" class="ck-pickme" @click="surpriseMe">
                <span class="i-ph-sparkle" />
                Pick one for me
              </button>
              <span class="ck-pickrow__hint">{{ pickMeHint }}</span>
            </div>
            <p class="ck-sub__note">Not sure? Leave it on Best match — it's picked for {{ scenario?.label }}.</p>
          </div>

          <!-- ============ 二级页 · 照片 ============ -->
          <div v-if="subPage === 'photo'" class="ck-sub">
            <div class="ck-sub__head">
              <button type="button" class="ck-sub__back" @click="closeSub">
                <span class="i-ph-caret-left" /> Back
              </button>
              <b>Add a photo</b>
            </div>
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
            <button type="button" class="ck-btn ck-btn--primary ck-sub__done" @click="closeSub">Done</button>
          </div>
        </div><!-- /ck-formmodal__body -->

        <!-- 弹窗底部：额度说明 + 生成按钮（一步到位，点完直接出结果） -->
        <div class="ck-formmodal__foot">
          <p class="ck-formmodal__quota">
            <template v-if="usageUnlimited">Unlimited generations on your plan.</template>
            <template v-else-if="usageMode === 'credit' && usageLoaded">
              You have {{ quotaRemaining }} card{{ quotaRemaining === 1 ? '' : 's' }} left on your plan.
            </template>
            <template v-else-if="usageLoaded">
              {{ quotaRemaining }} free generation{{ quotaRemaining === 1 ? '' : 's' }} left in total.
            </template>
            <template v-else>Free to preview. Only pay when it is right.</template>
          </p>
          <p v-if="genError" class="ck-error">{{ genError }}</p>
          <button
            type="button"
            class="ck-btn ck-btn--primary ck-btn--lg ck-formmodal__make"
            :disabled="generating || !scenario"
            @click="handleMake"
          >
            <span v-if="generating" class="i-ph-spinner animate-spin" />
            <span v-else-if="outOfQuota && !usageUnlimited" class="i-ph-sparkle" />
            <span v-else class="i-ph-magic-wand" />
            {{
              generating
                ? `Making your ${formatCopy.ctaNoun}…`
                : (outOfQuota && !usageUnlimited)
                  ? (outOfCards ? 'Get more cards' : `Get ${PLANS.creator.cards} credits`)
                  : `Make ${scenario?.label.toLowerCase() || formatCopy.ctaNoun} ${formatCopy.ctaNoun}`
            }}
          </button>
        </div>
      </div><!-- /ck-formmodal__panel -->
    </div><!-- /ck-formmodal -->

    <!-- ==================== 结果 / 编辑器 ==================== -->
    <div class="ck-wrap ck-cards__body">
      <section v-if="candidates.length" class="ck-sec ck-sec--card ck-result">
        <h2 class="ck-sec__title">
          Pick the one you like
        </h2>
        <p class="ck-sec__sub">Add your words, then download it ready to print. Remake any time with the button above.</p>

        <div class="ck-cands">
          <button
            v-for="c in candidates"
            :key="c.id"
            class="ck-cand"
            :class="{ 'ck-cand--on': picked === c.id }"
            @click="pickCandidate(c.id)"
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
          <p class="ck-hint ck-hint--lead">
            Pick one below, or let us write it for you. You can change every word after.
          </p>
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
            :format="cardFormat"
            :card-id="picked"
            class="ck-editor__composer"
            @remove-watermark="openPaywall"
            @finalized="onFinalized"
          />
          <p v-if="finishToast" class="ck-finish-toast">
            <span class="i-ph-check-circle" /> Saved — your share link now shows the finished card.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import {
  IMAGE_SCENARIOS,
  SCENARIO_GROUPS,
  getStyle,
  stylesForScenario,
  type ImageScenarioDef,
} from '~/utils/imageScenarios'
import {
  CARD_FORMAT_COPY,
  getCardFormat,
  parseCardFormat,
  type CardFormat,
} from '~/utils/cardFormats'
import { PLANS } from '~/utils/pricing'
import { assetUrl } from '~/utils/assets'
import CardComposer from '~/components/cards/CardComposer.vue'

definePageMeta({ layout: 'marketing' })

useHead({
  title: 'Create a personalised card — Create Keepsakes',
  description: 'Make a birthday card, thank you card or wall print for someone you love. Add their photo, their name and your words. Ready to print.',
})

// ── 参数弹窗（2026-11-23 重构：三步向导 → 一步到位）─────────
// 竞品/原型都是「就地弹窗一次填完参数」，以前这里做成了三步向导，跳转多。
// 现在格式/场合/照片名字/画风都在一个弹窗里，填完点生成直接出结果。
const formOpen = ref(false)

/**
 * 弹窗二级导航栈（2026-11-23 竞品 UX 对齐）。
 * 竞品把场合/风格/配色全收进带 ‹ 返回的二级子页，主界面只留自然语言字段。
 * 这里同构：main 一屏填完，点 chip push 到子页，选完 pop 回 main。
 * 子页切换只是弹窗内的 UI 状态，不写 URL、不碰生成参数。
 */
type SubPage = '' | 'occasion' | 'style' | 'photo'
const subPage = ref<SubPage>('')
function openSub(page: Exclude<SubPage, ''>) { subPage.value = page }
function closeSub() { subPage.value = '' }

const pageHeadline = computed(() =>
  candidates.value.length ? 'Ready for another one?' : formatCopy.value.heroHeadline,
)
const pageLede = computed(() =>
  candidates.value.length
    ? 'Same quick form — a different occasion, a different person, a brand-new card.'
    : formatCopy.value.heroLede,
)

function openForm() {
  formOpen.value = true
  subPage.value = '' // 每次都从主屏开始，不残留上次停在的子页
  genError.value = ''
  // 弹窗打开时锁背景滚动；关闭时恢复（在 closeForm 里）
  document.body.style.overflow = 'hidden'
}
function closeForm() {
  formOpen.value = false
  document.body.style.overflow = ''
}

/** 去水印付费墙：跳到站内唯一的定价页（练手项目不引入新弹窗支付流程） */
const router = useRouter()
function openPaywall() {
  router.push('/pricing')
}

const finishToast = ref(false)
function onFinalized() {
  finishToast.value = true
  setTimeout(() => { finishToast.value = false }, 3500)
}

/**
 * 「生成」按钮统一入口（2026-11-23 原型对齐）。
 * 额度用完时按钮不再 disabled —— 改为点击直接去付费墙（原型里按钮会变成
 * 「订阅得 200 积分」，点了弹付费墙）。未登录时 quotaRemaining=0 但
 * usageLoaded=false → outOfQuota=false，仍走 generate，由服务端 401 弹登录框。
 */
function handleMake() {
  if (outOfQuota.value && !usageUnlimited.value) {
    openPaywall()
    return
  }
  void generate()
}

/**
 * 卡片格式（2026-11-23：由落地页入口决定，不在弹窗里切）
 *   ?format=invite → 邀请函（首页 Invitation 卡入口）
 *   ?format=card   → 贺卡（其余全部落地页）
 * 白名单解析：非法值回落 card。续编旧卡 ?from= 时再按旧卡 meta.format 覆盖。
 */
const route = useRoute()
const cardFormat = ref<CardFormat>(parseCardFormat(String(route.query.format || '')))
const formatDef = computed(() => getCardFormat(cardFormat.value))
/** 当前格式的整套文案（eyebrow/标题/hero/CTA），跟着入口走 */
const formatCopy = computed(() => CARD_FORMAT_COPY[cardFormat.value])

const group = ref<string>('birthday')
// 默认选中 birthday：弹窗一开，照片/名字/画风三个分区就都在（真·一步到位），
// 场合只是「换一个」，不是「解锁后面」。?scenario=xxx 会在下面覆盖成指定场景。
const defaultScenario = IMAGE_SCENARIOS.find(s => s.id === 'birthday') || IMAGE_SCENARIOS[0]
const scenario = ref<ImageScenarioDef | null>(defaultScenario || null)
const style = ref('watercolor')
/** 缩略图加载失败时回退到语义矢量图标（R2 偶发失败也不留空白） */
const thumbFailed = ref<Record<string, boolean>>({})
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

/**
 * 选一张候选图 → 顺手把「写字」那一段带进视野。
 *
 * ⚠️ 为什么要：候选图 + 编辑区是上下排的，选完图用户还得自己往下找
 * 「Now add your words」，中间要滚一两屏 —— 每次生成都白费一次。
 * 用 block:'nearest'：候选图还留在视野里，不会跳太远。
 */
function pickCandidate(id: string) {
  picked.value = id
  nextTick(() => {
    document.querySelector('.ck-editor')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}
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
const usageLoaded = ref(false)
const quotaRemaining = ref(0)
const usageUnlimited = ref(false)
/** 'credit' = 付费档（扣买来的张数）；'daily' = 免费档（扣每日额度） */
const usageMode = ref<'credit' | 'daily' | 'unlimited'>('daily')
/** 有没有付费权益（决定下载是不是 2K 无水印） */
const hasPaid = ref(false)
const outOfQuota = computed(() => usageLoaded.value && !usageUnlimited.value && quotaRemaining.value <= 0)

// 一次固定出 1 张（2026-11-23 产品决定：不做「一次几张」选项，成本也可控）。
// 额度仍按次扣：一次生成 = 1 次，跟张数无关。

/**
 * 「帮我选一个画风」—— 借鉴 giftsong 的 "Pick for me"。
 *
 * ⚠️ 为什么要这个：第 3 步有 5~6 个画风，中老年用户面对
 *    「Photograph / Watercolour / Oil Pastel / Vintage Postcard / Paper Cut / Cartoon」
 *    基本不知道选哪个，只能瞎点或者卡住不动。
 *    给一个明确的默认，比逼他做决定有用得多。
 *
 * 规则（确定性，不随机 —— 同一个场合每次推荐一样，用户能形成预期）：
 *   有照片（i2i）→ 优先挑对参考图安全的画风（i2iSafe）
 *   没照片 → 用该场景的推荐画风（styles 数组第一项）
 */
function surpriseMe() {
  const list = availableStyles.value
  if (!list.length) return
  const hasRef = !!uploadId.value || !!photoFile.value
  const safe = hasRef ? list.filter(s => s.i2iSafe) : list
  const pool = safe.length ? safe : list
  style.value = pool[0].id
  closeSub() // 选完退回主屏，chip 上显示新画风
}

/** 当前画风的一句说明（让用户知道选的是什么效果） */
const styleHint = computed(() => {
  const st = availableStyles.value.find(s => s.id === style.value)
  if (!st) return ''
  return st.desc || ''
})

/** 「帮我选」按钮旁边的解释 */
const pickMeHint = computed(() => {
  const hasRef = !!uploadId.value || !!photoFile.value
  return hasRef
    ? 'We will pick one that keeps their face looking right.'
    : 'We will pick the one that suits a card best.'
})
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
const routeScenario = computed(() => String(route.query.scenario || ''))
{
  // 默认场景的文案预设（弹窗一开就齐）；?scenario= 会整体覆盖
  if (defaultScenario) {
    style.value = defaultScenario.styles?.[0] || 'watercolor'
    messageOptions.value = defaultScenario.presetMessages ? [...defaultScenario.presetMessages] : []
    chosenMessage.value = defaultScenario.presetMessages?.[0] || ''
  }
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

/** 主屏 chip 上显示的当前画风名（从可用画风里找，找不到给通用名） */
const currentStyleLabel = computed(
  () => availableStyles.value.find(s => s.id === style.value)?.label || 'Best match',
)
/** 是否停在「推荐画风」——默认就是第一个（对齐竞品 Best match 一等公民） */
const isBestMatch = computed(
  () => !availableStyles.value.length || style.value === availableStyles.value[0]?.id,
)
/** 照片 chip 显示 Added / None */
const photoAdded = computed(() => !!photoPreview.value || !!uploadId.value)

/** 选具体画风：设值 + 退回主屏（chip 上立刻显示新值） */
function pickStyle(id: string) {
  style.value = id
  closeSub()
}
/** 选「Best match」：回到该场景的推荐画风（数组第一项） */
function pickBestMatch() {
  style.value = availableStyles.value[0]?.id || style.value
  closeSub()
}

function pickScenario(sc: ImageScenarioDef) {
  scenario.value = sc
  messageOptions.value = sc.presetMessages ? [...sc.presetMessages] : []
  chosenMessage.value = sc.presetMessages?.[0] || ''
  const list = stylesForScenario(sc, !!uploadId.value || !!photoFile.value)
  if (!list.find(s => s.id === style.value)) style.value = list[0]?.id || 'watercolor'
  // 选完场合自动退回主屏 —— chip 上立刻显示新场合（对齐竞品 pop 回主界面）
  closeSub()
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
    const res = await api.post<{ images: { id: string; imageUrl: string | null }[] }>('/api/image/generate', {
      scenario: scenario.value.id,
      style: style.value,
      name: name.value,
      extra: extra.value,
      uploadId: uid || undefined,
      n: 1,
      aspect_ratio: '3:4',
      promptOptimizer: false,
      // 格式 id 只在服务端映射到受控 prompt 片段（不直接拼客户端字符串）
      formatClause: cardFormat.value,
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
    // 出图了 → 关掉参数弹窗，结果/编辑器留在页面上；滚动过去接着写文字
    closeForm()
    nextTick(() => {
      document.querySelector('.ck-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
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
      genError.value = "You've used your 3 free generations. Upgrade for no-watermark 2K prints."
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
    const res = await api.get<{ images: { id: string; imageUrl: string | null; format?: string | null }[] }>('/api/images')
    const hit = (res.images || []).find(i => i.id === id)
    if (!hit?.imageUrl) return
    // 续编旧卡：格式以旧卡为准（覆盖 URL 的 ?format=），否则邀请函会按贺卡版式编辑
    if (hit.format) cardFormat.value = parseCardFormat(hit.format)
    candidates.value = [{ id: hit.id, url: hit.imageUrl }]
    picked.value = hit.id
    // 旧卡直接进编辑区，不走参数弹窗
  } catch {
    // 没登录 / 找不到 / 没权限 → 正常走「做一张新卡」的流程
  }
}

// 额度：进入页面就读一次（未登录会失败，忽略即可 —— 生成时服务端会要求登录）
onMounted(() => {
  loadUsage()
  // 兼容旧链接 ?step=2：三步向导已经没了，直接当它不存在（参数弹窗自己一站填完）
  // 从「My cards」过来的 → 直接把旧卡打开
  loadFromCard()
})

// 离开页面时：恢复背景滚动 + 把弹窗的说明/回调清掉 —— 别让别的页面误触发这一页的逻辑
onBeforeUnmount(() => {
  document.body.style.overflow = ''
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
/* ---------- 步骤眉标 ---------- */
.ck-eyebrow {
  margin: 0 0 0.6rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ck-coral);
}

/* ---------- Hero 入口按钮 ---------- */
.ck-hero__cta { margin-top: 1.6rem; }
.ck-hero__hint {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0.85rem 0 0;
  font-size: 0.85rem;
  color: var(--ck-ink-2);
}

/* ---------- 参数弹窗（就地，一步到位）----------
   ⚠️ z-index 110：高于页面内容(≤45)和 Cookie 条(100)，低于登录弹窗(120) ——
   未登录点「生成」时登录框仍能浮在上面，参数弹窗保持打开、参数不丢。 */
.ck-formmodal {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1rem;
  overflow-y: auto;
}
.ck-formmodal__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(30, 24, 20, 0.5);
  backdrop-filter: blur(3px);
}
.ck-formmodal__panel {
  position: relative;
  width: min(54rem, 100%);
  /* ⚠️ flex item 默认 min-width:auto —— 手机窄屏下 textarea 等内容
     会把面板撑出视口（输入框/按钮被截断），必须压回容器宽度。 */
  max-width: 100%;
  min-width: 0;
  margin: auto 0;
  background: var(--ck-white);
  border-radius: 1.25rem;
  box-shadow: 0 30px 90px -30px rgba(30, 24, 20, 0.55);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 4rem);
  overflow: hidden;
}
.ck-formmodal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.6rem 2rem 1.2rem;
  border-bottom: 1px solid var(--ck-line);
  flex: 0 0 auto;
}
.ck-formmodal__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ck-coral);
}
.ck-formmodal__title {
  margin: 0;
  font-family: var(--ck-serif);
  font-size: clamp(1.4rem, 3vw, 1.85rem);
  font-weight: 600;
  color: var(--ck-ink);
}
.ck-formmodal__close {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 2.3rem;
  height: 2.3rem;
  border: 1px solid var(--ck-line);
  border-radius: 0.7rem;
  background: transparent;
  color: var(--ck-ink-2);
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.ck-formmodal__close:hover { background: var(--ck-cream); color: var(--ck-coral-deep); }
.ck-formmodal__body {
  padding: 1.6rem 2rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  position: relative; /* 二级子页绝对定位覆盖在主体上 */
}

/* ---------- 主屏表单（一屏填完核心参数） ---------- */
.ck-mainform { display: flex; flex-direction: column; gap: 1.25rem; }
.ck-field { display: flex; flex-direction: column; gap: 0.5rem; }
.ck-field__label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ck-ink);
}
.ck-field__req { color: var(--ck-coral); }
.ck-textarea { min-height: 5.5rem; resize: vertical; line-height: 1.5; font-family: inherit; }

/* 值 chip：内联当前值，点开二级页 */
.ck-valuechip {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.8rem 0.9rem;
  border: 1.5px solid var(--ck-line);
  border-radius: 0.7rem;
  background: var(--ck-cream);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.ck-valuechip:hover { border-color: var(--ck-coral); background: rgba(200, 84, 61, 0.05); }
.ck-valuechip__icon { font-size: 1.15rem; color: var(--ck-coral); line-height: 1; }
.ck-valuechip__text { font-size: 0.9375rem; font-weight: 700; color: var(--ck-ink); }
.ck-valuechip__change {
  margin-left: auto;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ck-coral-deep);
}

/* mini chip：Style / Photo */
.ck-chips { display: flex; flex-wrap: wrap; gap: 0.55rem; }
.ck-minichip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.6rem 0.9rem;
  border: 1.5px solid var(--ck-line);
  border-radius: 999px;
  background: var(--ck-white);
  font-family: inherit;
  font-size: 0.8125rem;
  color: var(--ck-ink-2);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.ck-minichip:hover { border-color: var(--ck-coral); background: rgba(200, 84, 61, 0.05); }
.ck-minichip b { color: var(--ck-ink); font-weight: 700; }

/* More options（次要信息默认收起） */
.ck-moreopt { border-top: 1px solid var(--ck-line); padding-top: 0.9rem; }
.ck-moreopt summary {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--ck-ink-2);
  cursor: pointer;
  list-style: none;
  user-select: none;
}
.ck-moreopt summary::-webkit-details-marker { display: none; }
.ck-moreopt summary::before { content: '▸ '; color: var(--ck-coral); }
.ck-moreopt[open] summary::before { content: '▾ '; }
.ck-moreopt__inner { display: flex; flex-direction: column; gap: 0.5rem; padding-top: 0.9rem; }
.ck-quota--main { margin-top: 0.25rem; }

/* ---------- 二级子页（覆盖在弹窗 body 上，导航栈 push/pop） ----------
   ⚠️ absolute 不占流高度 → 依赖主屏常驻撑起 body 高度；
   自己要带 padding（inset:0 盖住的是 body 的 padding box）和内部滚动。 */
.ck-sub {
  position: absolute;
  inset: 0;
  padding: 1.6rem 2rem;
  background: var(--ck-bg);
  overflow-y: auto;
  overscroll-behavior: contain;
  animation: ck-sub-in 0.2s ease-out;
}
@keyframes ck-sub-in {
  from { opacity: 0; transform: translateX(1rem); }
  to { opacity: 1; transform: translateX(0); }
}
.ck-sub__head {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 0.9rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--ck-line);
}
.ck-sub__head b { font-size: 0.95rem; }
.ck-sub__back {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0;
  border: 0;
  background: none;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--ck-coral-deep);
  cursor: pointer;
}
.ck-sub__back:hover { text-decoration: underline; }
.ck-sub__note { margin: 0.9rem 0 0; font-size: 0.78rem; color: var(--ck-ink-2); }
.ck-sub__done { width: 100%; margin-top: 1rem; }

/* Best match：一等公民（对齐竞品渐变边框 + 对勾） */
.ck-style--best {
  border-color: #7c5cd6;
  box-shadow: 0 0 0 2px rgba(124, 92, 214, 0.14);
}
.ck-style__thumb--best {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #f6d9c9, #e9a994 55%, var(--ck-coral));
  color: #fff;
  font-size: 1.6rem;
}
.ck-style__check {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  display: grid;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 999px;
  background: #7c5cd6;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
}

.ck-formmodal__foot {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  padding: 1.1rem 2rem 1.4rem;
  border-top: 1px solid var(--ck-line);
  background: var(--ck-bg);
}
.ck-formmodal__quota {
  margin: 0;
  margin-right: auto;
  font-size: 0.85rem;
  color: var(--ck-ink-2);
}
.ck-formmodal__make { min-width: 13rem; }
@media (max-width: 640px) {
  .ck-formmodal { padding: 0; }
  .ck-formmodal__panel { max-height: 100vh; border-radius: 0; margin: 0; }
  .ck-formmodal__head, .ck-formmodal__body, .ck-formmodal__foot { padding-left: 1.2rem; padding-right: 1.2rem; }
  .ck-formmodal__quota { width: 100%; }
  .ck-formmodal__make { width: 100%; }
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
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.6rem 1.15rem;
  border: 1px solid var(--ck-line);
  border-radius: 999px;
  background: #faf6ef;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ck-ink-2);
  cursor: pointer;
}
.ck-tab__icon { font-size: 1.05rem; line-height: 1; color: var(--ck-coral); }
.ck-tab--on { background: var(--ck-ink); border-color: var(--ck-ink); color: #fff; }
.ck-tab--on .ck-tab__icon { color: #fff; }

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
.ck-finish-toast { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.75rem; padding: 0.6rem 0.8rem; border-radius: 0.5rem; background: rgba(47, 64, 52, 0.1); font-size: 0.85rem; color: #2f4034; }
/* 引导句：放在小标题下面，说明"接下来能做什么" */
.ck-hint--lead { margin-top: 0.35rem; }
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

/* ---------- 出图张数 ---------- */
/* ---------- 「帮我选一个画风」 ---------- */
.ck-pickrow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  margin-bottom: 1rem;
}
.ck-pickme {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  border: 1.5px dashed var(--ck-coral);
  border-radius: 999px;
  background: rgba(200, 84, 61, 0.05);
  color: var(--ck-coral-deep);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;
}
.ck-pickme:hover { background: rgba(200, 84, 61, 0.12); }
.ck-pickrow__hint {
  flex: 1 1 12rem;
  min-width: 0;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--ck-ink-soft, #8a7d72);
}

.ck-style {
  position: relative; /* 对勾是 absolute，锚在卡片右上角（否则会飞到子页容器上） */
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.7rem 0.7rem 1rem;
  border: 1.5px solid var(--ck-line);
  border-radius: 0.9rem;
  background: #faf6ef;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.14s ease, background 0.14s ease, box-shadow 0.14s ease;
}
.ck-style:hover { border-color: rgba(200, 84, 61, 0.5); background: #fff; }
.ck-style--on {
  border-color: var(--ck-coral);
  background: rgba(200, 84, 61, 0.07);
  box-shadow: 0 0 0 1px var(--ck-coral);
}
.ck-style__thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 0.55rem;
  background: #f3ede3;
}
.ck-style__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.ck-style__glyph { font-size: 2.6rem; line-height: 1; color: var(--ck-coral); }
.ck-style__name { font-size: 1rem; font-weight: 700; color: var(--ck-ink); padding: 0 0.35rem; }
.ck-style__desc { font-size: 0.8125rem; line-height: 1.45; color: var(--ck-ink-2); padding: 0 0.35rem; }

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
/* ⚠️ 上限 16rem：以前是 minmax(11rem, 1fr) → 一张图就拉满整行，
   选完图要滚一整屏才够得到下面的「写字」区。 */
.ck-cands { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 16rem)); gap: 1rem; }
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
