<template>
  <div v-if="aud" class="ck-lp">
    <!-- ============ Hero ============ -->
    <section class="ck-lp__hero">
      <div class="ck-lp__hero-text">
        <p class="ck-lp__eyebrow">Personalised cards &amp; canvas prints</p>
        <h1 class="ck-lp__h1">{{ aud.h1 }}</h1>
        <p class="ck-lp__tagline">{{ aud.tagline }}</p>

        <ul class="ck-lp__points">
          <li v-for="p in aud.points" :key="p.title">
            <strong>{{ p.title }}</strong>
            <span>{{ p.text }}</span>
          </li>
        </ul>

        <div class="ck-lp__cta-row">
          <NuxtLink :to="primaryHref" class="ck-lp__btn ck-lp__btn--primary">
            {{ aud.cta }}
          </NuxtLink>
          <a href="#how" class="ck-lp__btn ck-lp__btn--ghost">How it works</a>
        </div>
        <p class="ck-lp__note">Free to make and download. No design skills needed.</p>
      </div>

      <div class="ck-lp__hero-art">
        <img :src="assetUrl(aud.hero)" :alt="aud.h1" loading="eager" width="640" height="800">
      </div>
    </section>

    <!-- ============ 相关场景 ============ -->
    <section class="ck-lp__section">
      <h2 class="ck-lp__h2">Cards people make for {{ aud.short }}</h2>
      <p class="ck-lp__lead">Pick the occasion. We will make the picture, you add the words.</p>

      <div class="ck-lp__scen-grid">
        <NuxtLink
          v-for="s in aud.scenarios"
          :key="s.id"
          :to="`/cards?scenario=${s.id}&for=${aud.slug}`"
          class="ck-lp__scen"
        >
          <span class="ck-lp__scen-ico">{{ scenarioIcon(s.id) }}</span>
          <h3>{{ scenarioLabel(s.id) }}</h3>
          <p>{{ s.blurb }}</p>
          <span class="ck-lp__scen-go">Make this →</span>
        </NuxtLink>
      </div>
    </section>

    <!-- ============ 成品展示 ============ -->
    <section class="ck-lp__section">
      <h2 class="ck-lp__h2">What it looks like when it is done</h2>
      <div class="ck-lp__gal">
        <img
          v-for="(g, i) in aud.gallery"
          :key="g"
          :src="assetUrl(g)"
          :alt="`${aud.h1} example ${i + 1}`"
          loading="lazy"
          width="480" height="600"
        >
      </div>
    </section>

    <!-- ============ 三步 ============ -->
    <section id="how" class="ck-lp__section ck-lp__how">
      <h2 class="ck-lp__h2">How it works</h2>
      <ol class="ck-lp__steps">
        <li>
          <span class="ck-lp__step-n">1</span>
          <h3>Add their photo</h3>
          <p>One clear picture. On a phone is fine.</p>
        </li>
        <li>
          <span class="ck-lp__step-n">2</span>
          <h3>Choose a style, write your words</h3>
          <p>Pick a look that suits them. Type the message, or start from a draft and edit it.</p>
        </li>
        <li>
          <span class="ck-lp__step-n">3</span>
          <h3>Download and print</h3>
          <p>300 DPI, real card sizes, ready for a printer or a print shop.</p>
        </li>
      </ol>
    </section>

    <!-- ============ FAQ ============ -->
    <section class="ck-lp__section ck-lp__faq-wrap">
      <h2 class="ck-lp__h2">Questions about {{ aud.short.toLowerCase() }} cards</h2>
      <div class="ck-lp__faq">
        <FaqAccordion :items="aud.faqs" />
      </div>
    </section>

    <!-- ============ 其他对象（站内互链） ============ -->
    <section class="ck-lp__others">
      <p class="ck-lp__others-label">Making a card for someone else?</p>
      <div class="ck-lp__others-row">
        <NuxtLink
          v-for="o in others"
          :key="o.slug"
          :to="`/for/${o.slug}`"
          class="ck-lp__others-link"
        >For {{ o.short }}</NuxtLink>
      </div>
    </section>

    <!-- ============ 底部 CTA ============ -->
    <section class="ck-lp__cta">
      <h2>{{ aud.cta }}</h2>
      <p>It takes a few minutes and you do not need to be able to draw.</p>
      <NuxtLink :to="primaryHref" class="ck-lp__btn ck-lp__btn--primary ck-lp__btn--lg">
        {{ aud.cta }}
      </NuxtLink>
    </section>
  </div>
</template>

<script setup lang="ts">
import { assetUrl } from '~/utils/assets'
import { AUDIENCES, getAudience, type AudienceDef } from '~/utils/audiences'
import { getScenario } from '~/utils/imageScenarios'

definePageMeta({ layout: 'marketing' })

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const aud = computed<AudienceDef | undefined>(() => getAudience(slug.value))

// 不存在的 slug → 真 404（别让搜索引擎抓到一个空壳页）
if (!getAudience(String(route.params.slug || ''))) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

// 第一个场景作为主 CTA
const primaryHref = computed(() => {
  const s = aud.value?.scenarios[0]
  return s ? `/cards?scenario=${s.id}&for=${aud.value!.slug}` : '/cards'
})

// 站内互链：其他 7 个受众
const others = computed(() => AUDIENCES.filter(a => a.slug !== slug.value))

function scenarioLabel(id: string): string {
  return getScenario(id)?.label || id
}

function scenarioIcon(id: string): string {
  const g = getScenario(id)?.group
  const map: Record<string, string> = {
    birthday: '🎂',
    family: '👪',
    kindness: '💛',
    holiday: '🎄',
    wallart: '🖼️',
    memory: '🕯️',
  }
  return map[g || ''] || '✨'
}

useHead(() => {
  const a = aud.value
  const title = a ? `${a.h1} — Create Keepsakes` : 'Create Keepsakes'
  const desc = a?.tagline || 'Personalised cards and canvas prints for the people you love.'
  return {
    title,
    meta: [
      { name: 'description', content: desc },
      { property: 'og:title', content: title },
      { property: 'og:description', content: desc },
      { property: 'og:image', content: assetUrl(a?.hero || 'showcase/hero-birthday.webp') },
      { property: 'og:type', content: 'website' },
    ],
    link: [{ rel: 'canonical', href: `https://create.yozzytools.com/for/${slug.value}` }],
  }
})

useSeoMeta({
  ogSiteName: 'Create Keepsakes',
  twitterCard: 'summary_large_image',
})

// 结构化数据：FAQPage + BreadcrumbList
useHead(() => {
  const a = aud.value
  if (!a) return {}
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: a.faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const crumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://create.yozzytools.com/' },
      { '@type': 'ListItem', position: 2, name: `For ${a.short}`, item: `https://create.yozzytools.com/for/${a.slug}` },
    ],
  }
  return {
    script: [
      { type: 'application/ld+json', innerHTML: JSON.stringify(faqLd) },
      { type: 'application/ld+json', innerHTML: JSON.stringify(crumbLd) },
    ],
  }
})
</script>

<style scoped>
.ck-lp {
  --lp-bg: #fbf7f1;
  --lp-ink: #2a2420;
  --lp-ink-2: #6b5f55;
  --lp-line: rgba(58, 46, 38, 0.12);
  --lp-coral: #c8543d;
  --lp-coral-deep: #a53f2c;
  --lp-serif: 'Playfair Display', Georgia, serif;

  background: var(--lp-bg);
  color: var(--lp-ink);
  font-family: 'Manrope', system-ui, sans-serif;
  padding-bottom: 4rem;
}

/* ---------- Hero ---------- */
.ck-lp__hero {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 3rem;
  align-items: center;
  max-width: 1180px;
  margin: 0 auto;
  padding: 3.5rem 1.5rem 3rem;
}
.ck-lp__eyebrow {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--lp-coral);
  margin: 0 0 0.85rem;
}
.ck-lp__h1 {
  font-family: var(--lp-serif);
  font-size: clamp(2.1rem, 4.6vw, 3.35rem);
  line-height: 1.12;
  font-weight: 700;
  margin: 0 0 1rem;
  letter-spacing: -0.015em;
}
.ck-lp__tagline {
  font-size: 1.12rem;
  line-height: 1.65;
  color: var(--lp-ink-2);
  margin: 0 0 1.6rem;
  max-width: 34rem;
}
.ck-lp__points {
  list-style: none;
  margin: 0 0 1.9rem;
  padding: 0;
  display: grid;
  gap: 0.7rem;
}
.ck-lp__points li {
  display: grid;
  gap: 0.15rem;
  padding-left: 1.35rem;
  position: relative;
}
.ck-lp__points li::before {
  content: '✓';
  position: absolute;
  left: 0;
  top: 0.05rem;
  color: var(--lp-coral);
  font-weight: 800;
}
.ck-lp__points strong { font-size: 0.98rem; }
.ck-lp__points span { font-size: 0.93rem; color: var(--lp-ink-2); line-height: 1.55; }

.ck-lp__cta-row { display: flex; gap: 0.7rem; flex-wrap: wrap; align-items: center; }
.ck-lp__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem 1.6rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 1rem;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.ck-lp__btn--primary {
  background: var(--lp-coral);
  color: #fff;
  box-shadow: 0 6px 20px rgba(200, 84, 61, 0.28);
}
.ck-lp__btn--primary:hover {
  background: var(--lp-coral-deep);
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(200, 84, 61, 0.34);
}
.ck-lp__btn--ghost {
  background: transparent;
  color: var(--lp-ink);
  border: 1.5px solid var(--lp-line);
}
.ck-lp__btn--ghost:hover { border-color: var(--lp-ink-2); }
.ck-lp__btn--lg { font-size: 1.1rem; padding: 1rem 2.2rem; }
.ck-lp__note { font-size: 0.82rem; color: var(--lp-ink-2); margin: 0.9rem 0 0; }

.ck-lp__hero-art { display: flex; justify-content: center; }
.ck-lp__hero-art img {
  width: 100%;
  max-width: 460px;
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(58, 46, 38, 0.18);
}

/* ---------- 通用 section ---------- */
.ck-lp__section {
  max-width: 1180px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
}
.ck-lp__h2 {
  font-family: var(--lp-serif);
  font-size: clamp(1.55rem, 3vw, 2.15rem);
  font-weight: 700;
  margin: 0 0 0.6rem;
  line-height: 1.2;
}
.ck-lp__lead {
  font-size: 1.02rem;
  color: var(--lp-ink-2);
  margin: 0 0 1.8rem;
}

/* ---------- 场景卡 ---------- */
.ck-lp__scen-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}
.ck-lp__scen {
  display: block;
  background: #fff;
  border: 1px solid var(--lp-line);
  border-radius: 16px;
  padding: 1.4rem 1.3rem 1.2rem;
  text-decoration: none;
  color: inherit;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}
.ck-lp__scen:hover {
  transform: translateY(-3px);
  border-color: rgba(200, 84, 61, 0.4);
  box-shadow: 0 12px 30px rgba(58, 46, 38, 0.1);
}
.ck-lp__scen-ico { font-size: 1.8rem; line-height: 1; display: block; margin-bottom: 0.7rem; }
.ck-lp__scen h3 {
  font-size: 1.06rem;
  font-weight: 700;
  margin: 0 0 0.35rem;
}
.ck-lp__scen p {
  font-size: 0.9rem;
  color: var(--lp-ink-2);
  line-height: 1.55;
  margin: 0 0 0.8rem;
}
.ck-lp__scen-go {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--lp-coral);
}

/* ---------- 画廊 ---------- */
.ck-lp__gal {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1rem;
}
.ck-lp__gal img {
  width: 100%;
  border-radius: 14px;
  border: 1px solid var(--lp-line);
  background: #fff;
}

/* ---------- 步骤 ---------- */
.ck-lp__steps {
  list-style: none;
  padding: 0;
  margin: 1.6rem 0 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.2rem;
}
.ck-lp__steps li {
  background: #fff;
  border: 1px solid var(--lp-line);
  border-radius: 16px;
  padding: 1.5rem 1.35rem;
}
.ck-lp__step-n {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: var(--lp-coral);
  color: #fff;
  font-weight: 800;
  font-size: 0.95rem;
  margin-bottom: 0.8rem;
}
.ck-lp__steps h3 { font-size: 1.05rem; margin: 0 0 0.4rem; }
.ck-lp__steps p { font-size: 0.92rem; color: var(--lp-ink-2); line-height: 1.55; margin: 0; }

/* ---------- FAQ ---------- */
.ck-lp__faq { max-width: 780px; }

/* ---------- 其他对象 ---------- */
.ck-lp__others {
  max-width: 1180px;
  margin: 0 auto;
  padding: 1rem 1.5rem 2rem;
  border-top: 1px solid var(--lp-line);
}
.ck-lp__others-label {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--lp-ink-2);
  margin: 0 0 0.8rem;
}
.ck-lp__others-row { display: flex; flex-wrap: wrap; gap: 0.55rem; }
.ck-lp__others-link {
  font-size: 0.92rem;
  font-weight: 600;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--lp-line);
  color: var(--lp-ink);
  text-decoration: none;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.ck-lp__others-link:hover { border-color: var(--lp-coral); color: var(--lp-coral); }

/* ---------- 底部 CTA ---------- */
.ck-lp__cta {
  max-width: 760px;
  margin: 2rem auto 0;
  padding: 3rem 1.5rem;
  text-align: center;
}
.ck-lp__cta h2 {
  font-family: var(--lp-serif);
  font-size: clamp(1.7rem, 3.4vw, 2.4rem);
  margin: 0 0 0.5rem;
}
.ck-lp__cta p { color: var(--lp-ink-2); margin: 0 0 1.5rem; }

@media (max-width: 900px) {
  .ck-lp__hero { grid-template-columns: 1fr; gap: 2rem; padding-top: 2.2rem; }
  .ck-lp__hero-art { order: -1; }
  .ck-lp__hero-art img { max-width: 320px; }
}
</style>
