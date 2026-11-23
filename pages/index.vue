<template>
  <div class="ck-home">
    <!-- ================= B1 · Hero ================= -->
    <section class="ck-hero">
      <div class="ck-wrap ck-hero__grid">
        <div class="ck-hero__copy">
          <p class="ck-badge">
            <span class="i-ph-gift" /> Personalised cards &amp; canvas prints
          </p>
          <h1 class="ck-h1">
            Made for the people<br />
            <em>you love.</em>
          </h1>
          <p class="ck-lede">
            Their photo. Their favourite things. That joke only you get.
            Turn it into a card they will actually keep — with their name spelled
            right, their face preserved, and a message that sounds like you.
          </p>

          <div class="ck-hero__cta">
            <NuxtLink to="/cards?format=card" class="ck-btn ck-btn--primary">
              Create their card
              <span class="i-ph-arrow-right text-[17px]" />
            </NuxtLink>
            <NuxtLink to="/gallery" class="ck-btn ck-btn--ghost">
              See examples
            </NuxtLink>
            <!-- 已经做过的人：直接回到自己的作品，不用重新找入口 -->
            <NuxtLink v-if="loggedIn" to="/my-assets" class="ck-btn ck-btn--ghost">
              <span class="i-ph-images text-[17px]" />
              My creations
            </NuxtLink>
          </div>

          <!-- 搜索入口（原型 home 页的关键词入口，2026-11-23）：本地过滤，不依赖后端 -->
          <div class="ck-search">
            <label class="ck-search__field">
              <span class="i-ph-magnifying-glass" />
              <input
                v-model="searchQuery"
                type="search"
                placeholder="Try: birthday card for mum, unicorn, thank you…"
                autocomplete="off"
                @focus="searchFocused = true"
                @keydown.esc="searchFocused = false"
              />
            </label>
            <div v-if="searchFocused && searchQuery.trim()" class="ck-search__results">
              <NuxtLink
                v-for="r in searchResults"
                :key="r.key"
                :to="r.to"
                class="ck-search__result"
                @click="searchFocused = false; searchQuery = ''"
              >
                <span class="i-ph-magnifying-glass" />
                <span>{{ r.label }}</span>
                <span class="ck-search__kind">{{ r.kind }}</span>
              </NuxtLink>
              <p v-if="!searchResults.length" class="ck-search__none">
                No match — try a person (mum, dad) or an occasion (birthday, thank you).
              </p>
            </div>
          </div>

          <ul class="ck-hero__facts">
            <li><span class="i-ph-check-circle" /> Download &amp; print it yourself, or send it online</li>
            <li><span class="i-ph-check-circle" /> Flat invite or folded card — ready for a printer</li>
            <li><span class="i-ph-check-circle" /> No design skills needed</li>
            <li><span class="i-ph-check-circle" /> Photos deleted in 30 days</li>
          </ul>
        </div>

        <!-- 真实成品卡示例（不是占位图） -->
        <div class="ck-hero__art">
          <div class="ck-card ck-card--hero">
            <img src="https://assets.yozzytools.com/showcase/hero-birthday.webp" alt="A finished birthday card with the words Happy Birthday, Margaret" />
            <div class="ck-card__caption">
              <p class="ck-card__kicker">Their inside joke</p>
              <p class="ck-card__line">“Margaret still does the crossword in pen.”</p>
            </div>
          </div>
          <div class="ck-card ck-card--peek" aria-hidden="true">
            <img src="https://assets.yozzytools.com/showcase/scene-christmas.webp" alt="" />
          </div>
        </div>
      </div>
    </section>

    <!-- ================= B2 · 三步 ================= -->
    <section class="ck-band ck-band--cream">
      <div class="ck-wrap">
        <h2 class="ck-h2">Three little steps. A much more personal card.</h2>
        <p class="ck-sub">You bring the details. We do the design, the words and the printing size.</p>

        <ol class="ck-steps">
          <li v-for="(s, i) in steps" :key="s.title" class="ck-step">
            <span class="ck-step__num">{{ i + 1 }}</span>
            <h3 class="ck-step__title">{{ s.title }}</h3>
            <p class="ck-step__text">{{ s.text }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- ================= B2b · 两种格式（竞品从入口就分 Invite / Card） ================= -->
    <section class="ck-band ck-band--cream">
      <div class="ck-wrap">
        <h2 class="ck-h2">An invitation, or a card to keep?</h2>
        <p class="ck-sub">
          Pick the format at the start. It decides what you fill in and how the finished card prints.
        </p>
        <div class="ck-why">
          <NuxtLink v-for="f in formats" :key="f.title" :to="f.to" class="ck-why__item ck-why__item--link">
            <span class="ck-why__icon" :class="`i-${f.icon}`" />
            <h3 class="ck-why__title">{{ f.title }}</h3>
            <p class="ck-why__text">{{ f.text }}</p>
            <span class="ck-why__go">{{ f.cta }} <span class="i-ph-arrow-right" /></span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ================= B3 · 按人分类 ================= -->
    <section class="ck-band ck-band--white">
      <div class="ck-wrap">
        <h2 class="ck-h2">Start with someone you love.</h2>
        <p class="ck-sub">
          Not sure where to begin? Pick who it is for — we will take care of the rest.
        </p>
        <HomeAudience />
      </div>
    </section>

    <!-- ================= B4 · 季节性 ================= -->
    <section class="ck-band ck-band--forest">
      <div class="ck-wrap ck-season">
        <div class="ck-season__copy">
          <p class="ck-badge ck-badge--light">
            <span class="i-ph-tree" /> The biggest season of the year
          </p>
          <h2 class="ck-h2 ck-h2--light">A little less generic this Christmas.</h2>
          <p class="ck-lede ck-lede--light">
            Their pets in festive jumpers. A family joke. A card that is
            properly theirs — and not the same one in every shop window.
          </p>
          <NuxtLink to="/cards?scenario=christmas&format=card" class="ck-btn ck-btn--cream">
            Make a Christmas card
          </NuxtLink>
        </div>
        <div class="ck-season__art">
          <img src="https://assets.yozzytools.com/showcase/scene-christmas.webp" alt="A watercolour Christmas card with a decorated tree" />
        </div>
      </div>
    </section>

    <!-- ================= B5 · 为什么选我们 ================= -->
    <section class="ck-band ck-band--white">
      <div class="ck-wrap">
        <h2 class="ck-h2">Why people come to us instead of a template shop.</h2>
        <div class="ck-why">
          <div v-for="w in whys" :key="w.title" class="ck-why__item">
            <span class="ck-why__icon" :class="`i-${w.icon}`" />
            <h3 class="ck-why__title">{{ w.title }}</h3>
            <p class="ck-why__text">{{ w.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= 成品展示 ================= -->
    <section class="ck-band ck-band--cream">
      <div class="ck-wrap">
        <h2 class="ck-h2">Every one of them is made from scratch.</h2>
        <p class="ck-sub">Pick the occasion, pick the look, add the details. Nothing is copied from a shelf.</p>
        <div class="ck-gallery">
          <figure v-for="g in gallery" :key="g.image" class="ck-gallery__item">
            <img :src="g.image" :alt="g.alt" loading="lazy" decoding="async" />
            <figcaption>{{ g.caption }}</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- ================= B7 · FAQ ================= -->
    <section class="ck-band ck-band--white">
      <div class="ck-wrap ck-faq-wrap">
        <h2 class="ck-h2">The useful bits.</h2>
        <div class="ck-faq">
          <FaqAccordion :items="faqs" />
        </div>
      </div>
    </section>

    <!-- ================= B8 · 底部 CTA ================= -->
    <section class="ck-band ck-band--ink">
      <div class="ck-wrap ck-cta">
        <h2 class="ck-h2 ck-h2--light">They will know who made it.</h2>
        <p class="ck-lede ck-lede--light">
          Make the first one for free. Only pay when it is right.
        </p>
        <NuxtLink to="/cards?format=card" class="ck-btn ck-btn--primary ck-btn--lg">
          Create their card
          <span class="i-ph-arrow-right text-[18px]" />
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import HomeAudience from '~/components/home/HomeAudience.vue'
import { PLANS } from '~/utils/pricing'
import { IMAGE_SCENARIOS } from '~/utils/imageScenarios'
import { AUDIENCES, audienceUrl } from '~/utils/audiences'

definePageMeta({ layout: 'marketing' })

// 登录用户才显示「我的作品」入口（未登录时给的是 Log in / Start free）
const { user, authReady } = useAuth()
const loggedIn = computed(() => authReady.value && !!user.value)

// ── 首页搜索（原型 home 的关键词入口，2026-11-23）────────────
// 本地过滤场景 + 人群，不查后端：受众/场景数据都是静态的，够用且零延迟。
interface SearchHit {
  key: string
  label: string
  kind: string
  to: string
  haystack: string
}
const searchIndex = ref<SearchHit[]>([
  ...IMAGE_SCENARIOS.map(s => ({
    key: `scene-${s.id}`,
    label: s.label,
    kind: 'Occasion',
    to: `/cards?scenario=${encodeURIComponent(s.id)}&format=card`,
    haystack: `${s.label} ${s.id} ${(s as any).keywords || ''}`.toLowerCase(),
  })),
  ...AUDIENCES.map(a => ({
    key: `who-${a.slug}`,
    label: `Card for ${a.short}`,
    kind: 'Who it is for',
    to: audienceUrl(a.slug),
    haystack: `${a.short} ${a.h1} ${a.slug}`.toLowerCase(),
  })),
])
const searchQuery = ref('')
const searchFocused = ref(false)
const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  // 多词 AND：命中每个词才算（"birthday mum" 要两个都沾边）
  const words = q.split(/\s+/)
  return searchIndex.value
    .filter(hit => words.every(w => hit.haystack.includes(w)))
    .slice(0, 6)
})

useHead({
  title: 'Create Keepsakes — Personalised cards & canvas prints for the people you love',
  // ⚠️ 只能有一个 meta 键 —— 对象字面量里重复 key 后者会覆盖前者，
  //    之前分开写两个 meta 数组把 description 弄丢了
  meta: [
    {
      name: 'description',
      content:
        'Their photo, their favourite things, that joke only you get. Turn it into a card they will actually keep — name spelled right, ready to print.',
    },
    { property: 'og:title', content: 'Create Keepsakes — cards for the people you love' },
    { property: 'og:description', content: 'Their photo, their favourite things, that joke only you get. A card they will actually keep.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://create.yozzytools.com/' },
    { property: 'og:image', content: 'https://assets.yozzytools.com/og-image.jpg' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:image', content: 'https://assets.yozzytools.com/og-image.jpg' },
  ],
  link: [
    // 字体自托管在 R2，不引 Google Fonts（GDPR：外链会把用户 IP 传给 Google）
    { rel: 'preload', as: 'font', type: 'font/ttf', href: 'https://assets.yozzytools.com/fonts/PlayfairDisplay-SemiBold.ttf', crossorigin: 'anonymous' },
    { rel: 'preload', as: 'font', type: 'font/ttf', href: 'https://assets.yozzytools.com/fonts/Lora-Regular.ttf', crossorigin: 'anonymous' },
    { rel: 'canonical', href: 'https://create.yozzytools.com/' },
  ],
})

const steps = [
  {
    title: 'Tell us about them',
    text: 'Add a photo, their favourite things and the details only you know. Or start from a ready-made idea.',
  },
  {
    title: 'Make it theirs',
    text: 'Choose a style, write the message, or let us write it for you. Drag the words into place.',
  },
  {
    title: 'Make their day',
    text: 'Download it, share it, or print it on real card stock at 5 × 7 inches.',
  },
]

// 双格式入口（2026-11-23：竞品从入口就分 Invite / Card）
// 每张卡直接带 ?format= 进弹窗，不靠 cards.vue 的默认值兜底 ——
// 从 Invitation 卡进来就必须是邀请函字段，从 Greeting card 卡进来就是贺卡字段。
const formats = [
  {
    icon: 'ph-calendar-heart',
    title: 'Invitation — one flat card',
    text: 'For a party or a get-together. The date and place are printed on the front. Print on one side of card stock and cut to size.',
    to: '/cards?format=invite',
    cta: 'Make an invitation',
  },
  {
    icon: 'ph-envelope-open',
    title: 'Greeting card — folded, with a cover',
    text: 'For a birthday, a thank you, or just because. The picture and your words go inside; the cover is left clean. Print and fold down the middle.',
    to: '/cards?format=card',
    cta: 'Make a card',
  },
]

const whys = [
  {
    icon: 'ph-check-square',
    title: 'Names and numbers, spelled right',
    text: '“Happy 70th Birthday, Margaret” comes out exactly as you typed it. No invented names, no wrong ages, no odd spelling.',
  },
  {
    icon: 'ph-users',
    title: 'Their face, not a stranger’s',
    text: 'The card starts from your photo. They are recognisably themselves — not a generic model with a different name.',
  },
  {
    icon: 'ph-printer',
    title: 'Ready to print',
    text: 'A 3:4 portrait at print resolution lays out cleanly as a 5 × 7 card. Also available as a 16 × 20 canvas for the wall.',
  },
  {
    icon: 'ph-lock-key',
    title: 'Private by default',
    text: 'Your photos stay in your account. Never published, never used to train anything, and deleted within 30 days.',
  },
]

const gallery = [
  {
    image: 'https://assets.yozzytools.com/showcase/person-grandma.webp',
    alt: 'A milestone birthday card in oil painting style',
    caption: 'Milestone birthdays — for the big one',
  },
  {
    image: 'https://assets.yozzytools.com/showcase/scene-wallart.webp?v=2',
    alt: 'An impressionist village street print with the words "Home" and a family message below',
    caption: 'Wall art — the place you still miss',
  },
  {
    image: 'https://assets.yozzytools.com/showcase/person-pet.webp',
    alt: 'A hand painted portrait of a golden retriever',
    caption: 'Pets — the one who is really in charge',
  },
  {
    image: 'https://assets.yozzytools.com/showcase/scene-thankyou-parent.webp',
    alt: 'A quiet get well soon card in oil pastel',
    caption: 'Get well soon — said gently',
  },
]

const faqs = [
  {
    q: 'What does a card cost?',
    a: `Cards start at $${PLANS.single.price.toFixed(2)} each. A monthly plan of $${PLANS.creator.price.toFixed(2)} includes ${PLANS.creator.cards} credits, and a one-off pack of $${PLANS.lifetime.price.toFixed(2)} gives you ${PLANS.lifetime.cards} that never expire. You can see the cost before you pay anything.`,
  },
  {
    q: 'Do I need any design skills?',
    a: 'None at all. You choose an occasion, choose a style, and add a photo and a few words. We handle the layout, the lettering and the finishing.',
  },
  {
    q: 'Will the name and the age be spelled correctly?',
    a: 'Yes. The text is typeset by us rather than painted by the image model, so every name, number and date comes out exactly as you typed it.',
  },
  {
    q: 'Can I change it if I do not like it?',
    a: 'Yes. Regenerate as many times as you like, and the text stays editable right up to the moment you download.',
  },
  {
    q: 'Can I print it?',
    a: 'That is what it is built for. Download a print-resolution file and take it to any print shop, or print it yourself on card stock.',
  },
  {
    q: 'What happens to my photos?',
    a: 'They stay private to your account, are never published and never used to train anything, and are deleted within 30 days.',
  },
  {
    q: 'Is it really free to try?',
    a: 'Yes. You can generate and preview cards for free. You only pay when you want the high-resolution, unwatermarked file.',
  },
]
</script>

<style scoped>
/* ------------------------------------------------------------------
   Create Keepsakes 首页 —— 浅色暖调
   和站内深色工作台刻意区分：营销页给「送礼的人」看，要明亮、温暖、可信。
   只在 .ck-home 作用域内覆盖变量，不动全局设计系统。
   ------------------------------------------------------------------ */
.ck-home {
  --ck-bg: #fbf7f1;
  --ck-cream: #f5ede1;
  --ck-white: #fffdfa;
  --ck-ink: #2a2420;
  --ck-ink-2: #6b5f55;
  --ck-line: rgba(58, 46, 38, 0.12);
  --ck-coral: #c8543d;
  --ck-coral-deep: #a53f2c;
  --ck-forest: #2f4034;
  --ck-gold: #c9a227;
  --ck-serif: 'Playfair Display', Georgia, 'Times New Roman', serif;

  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: 'Manrope', system-ui, sans-serif;
}

.ck-wrap {
  max-width: 74rem;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.ck-band {
  padding: 5.5rem 0;
}
.ck-band--white { background: var(--ck-white); }
.ck-band--cream { background: var(--ck-cream); }
.ck-band--forest { background: var(--ck-forest); }
.ck-band--ink { background: #241f1b; }

.ck-h1 {
  font-family: var(--ck-serif);
  font-size: clamp(2.6rem, 6vw, 4.25rem);
  font-weight: 600;
  line-height: 1.06;
  letter-spacing: -0.015em;
  color: var(--ck-ink);
}
.ck-h1 em {
  font-style: italic;
  color: var(--ck-coral);
}

.ck-h2 {
  font-family: var(--ck-serif);
  font-size: clamp(1.85rem, 3.6vw, 2.65rem);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--ck-ink);
  max-width: 22ch;
}
.ck-h2--light { color: #fdf9f2; }

.ck-sub {
  margin-top: 0.9rem;
  font-size: 1.0625rem;
  line-height: 1.6;
  color: var(--ck-ink-2);
  max-width: 46ch;
}

.ck-lede {
  margin-top: 1.4rem;
  font-size: 1.125rem;
  line-height: 1.65;
  color: var(--ck-ink-2);
  max-width: 46ch;
}
.ck-lede--light { color: rgba(253, 249, 242, 0.78); }

.ck-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  background: rgba(200, 84, 61, 0.1);
  color: var(--ck-coral-deep);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.ck-badge--light {
  background: rgba(253, 249, 242, 0.14);
  color: #fdf9f2;
}

/* ---------- 按钮 ---------- */
.ck-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1.6rem;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
  transition: transform 0.14s ease, background 0.14s ease, box-shadow 0.14s ease;
}
.ck-btn:hover { transform: translateY(-1px); }
.ck-btn--primary {
  background: var(--ck-coral);
  color: #fff;
  box-shadow: 0 12px 26px -12px rgba(200, 84, 61, 0.75);
}
.ck-btn--primary:hover { background: var(--ck-coral-deep); }
.ck-btn--ghost {
  border: 1.5px solid var(--ck-line);
  color: var(--ck-ink);
  background: transparent;
}
.ck-btn--ghost:hover { border-color: var(--ck-coral); color: var(--ck-coral-deep); }
.ck-btn--cream {
  background: #fdf9f2;
  color: var(--ck-forest);
}
.ck-btn--lg { padding: 1rem 2rem; font-size: 1.0625rem; }

/* ---------- Hero ---------- */
.ck-hero {
  position: relative;
  padding: 5rem 0 5.5rem;
  background:
    radial-gradient(120% 90% at 88% 8%, rgba(201, 162, 39, 0.16) 0%, transparent 58%),
    radial-gradient(90% 70% at 4% 92%, rgba(200, 84, 61, 0.1) 0%, transparent 55%),
    var(--ck-bg);
}

.ck-hero__grid {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 3.5rem;
  align-items: center;
}
@media (max-width: 900px) {
  .ck-hero__grid { grid-template-columns: 1fr; gap: 2.75rem; }
}

.ck-hero__cta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 2rem;
}

/* 首页搜索入口（原型 home 关键词入口，2026-11-23） */
.ck-search { position: relative; margin-top: 1.5rem; max-width: 28rem; }
.ck-search__field {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1rem;
  border: 1.5px solid var(--ck-line);
  border-radius: 999px;
  background: var(--ck-white);
  color: var(--ck-ink-2);
}
.ck-search__field:focus-within { border-color: var(--ck-coral); }
.ck-search__field input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 0.9375rem;
  color: var(--ck-ink);
}
.ck-search__field input::placeholder { color: #a08f81; }
.ck-search__results {
  position: absolute;
  z-index: 20;
  top: calc(100% + 0.4rem);
  left: 0;
  right: 0;
  overflow: hidden;
  border: 1px solid var(--ck-line);
  border-radius: 0.9rem;
  background: var(--ck-white);
  box-shadow: 0 20px 40px -20px rgba(42, 36, 32, 0.35);
}
.ck-search__result {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1rem;
  font-size: 0.9rem;
  color: var(--ck-ink);
  text-decoration: none;
}
.ck-search__result:hover, .ck-search__result:focus { background: var(--ck-cream); }
.ck-search__result .i-ph-magnifying-glass { color: var(--ck-coral); }
.ck-search__kind { margin-left: auto; font-size: 0.75rem; color: #a08f81; }
.ck-search__none { margin: 0; padding: 0.9rem 1rem; font-size: 0.85rem; color: var(--ck-ink-2); }

.ck-hero__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.35rem;
  margin-top: 1.75rem;
  padding: 0;
  list-style: none;
  font-size: 0.875rem;
  color: var(--ck-ink-2);
}
.ck-hero__facts li { display: inline-flex; align-items: center; gap: 0.4rem; }
.ck-hero__facts span { color: var(--ck-coral); font-size: 1rem; }

/* 成品卡 */
.ck-hero__art { position: relative; }
.ck-card {
  border-radius: 1.25rem;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 30px 60px -30px rgba(58, 46, 38, 0.5);
}
.ck-card--hero { transform: rotate(-2deg); }
.ck-card--hero img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
}
.ck-card__caption {
  padding: 0.95rem 1.15rem 1.1rem;
  border-top: 1px solid var(--ck-line);
}
.ck-card__kicker {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ck-coral);
}
.ck-card__line {
  margin-top: 0.3rem;
  font-family: var(--ck-serif);
  font-size: 1.05rem;
  font-style: italic;
  color: var(--ck-ink);
}
.ck-card--peek {
  position: absolute;
  right: -1.5rem;
  bottom: -1.75rem;
  width: 46%;
  transform: rotate(5deg);
  box-shadow: 0 22px 44px -24px rgba(58, 46, 38, 0.55);
}
.ck-card--peek img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
}
@media (max-width: 900px) {
  .ck-card--peek { display: none; }
}

/* ---------- 三步 ---------- */
.ck-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-top: 3rem;
  padding: 0;
  list-style: none;
}
@media (max-width: 820px) { .ck-steps { grid-template-columns: 1fr; } }

.ck-step {
  position: relative;
  padding: 1.75rem 1.5rem 1.6rem;
  border: 1px solid var(--ck-line);
  border-radius: 1.1rem;
  background: var(--ck-white);
}
.ck-step__num {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  background: var(--ck-coral);
  color: #fff;
  font-weight: 700;
  font-size: 0.9375rem;
}
.ck-step__title {
  margin-top: 1rem;
  font-family: var(--ck-serif);
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--ck-ink);
}
.ck-step__text {
  margin-top: 0.5rem;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--ck-ink-2);
}

/* ---------- 季节 ---------- */
.ck-season {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 3.5rem;
  align-items: center;
}
@media (max-width: 900px) { .ck-season { grid-template-columns: 1fr; } }
.ck-season__art img {
  display: block;
  width: 100%;
  border-radius: 1.25rem;
  box-shadow: 0 30px 60px -30px rgba(0, 0, 0, 0.6);
  transform: rotate(1.5deg);
}
.ck-season .ck-btn { margin-top: 1.75rem; }

/* ---------- 为什么 ---------- */
.ck-why {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 1.5rem;
  margin-top: 3rem;
}
.ck-why__item {
  padding: 1.6rem 1.4rem;
  border-radius: 1.1rem;
  background: var(--ck-cream);
}
/* 双格式卡可点击：整张卡就是入口（对齐竞品从入口分 Invite / Card） */
.ck-why__item--link {
  display: block;
  color: inherit;
  text-decoration: none;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}
.ck-why__item--link:hover {
  box-shadow: 0 6px 20px rgba(60, 40, 25, 0.1);
  transform: translateY(-2px);
}
.ck-why__go {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.9rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--ck-coral-deep);
}
.ck-why__icon {
  display: inline-grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  background: rgba(200, 84, 61, 0.12);
  color: var(--ck-coral-deep);
  font-size: 1.3rem;
}
.ck-why__title {
  margin-top: 0.9rem;
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--ck-ink);
}
.ck-why__text {
  margin-top: 0.45rem;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--ck-ink-2);
}

/* ---------- 成品展示 ---------- */
.ck-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  gap: 1.25rem;
  margin-top: 2.75rem;
}
.ck-gallery__item { margin: 0; }
.ck-gallery__item img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 1rem;
  box-shadow: 0 18px 40px -24px rgba(58, 46, 38, 0.55);
}
.ck-gallery__item figcaption {
  margin-top: 0.7rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ck-ink-2);
  text-align: center;
}

/* ---------- FAQ ---------- */
.ck-faq-wrap { max-width: 52rem; }
.ck-faq { margin-top: 2.25rem; }

/* ---------- 底部 CTA ---------- */
.ck-cta { text-align: center; }
.ck-cta .ck-h2 { max-width: none; margin: 0 auto; }
.ck-cta .ck-lede { margin: 0.9rem auto 2rem; }
</style>
