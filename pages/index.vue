<template>
  <div class="home-page">
    <!-- Hero Glow -->
    <div class="home-glow" />

    <!-- Hero Section -->
    <section class="relative overflow-hidden py-20 sm:py-28 lg:py-32">
      <div class="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto">
          <span class="home-badge">{{ $t('hero.badge', 'AI Music & Image Studio') }}</span>
          <h1 class="font-display text-4xl font-800 tracking-tight text-white sm:text-5xl lg:text-6xl mt-4 leading-[1.1]">
            {{ $t('hero.title') }}
            <span class="block text-accent-soft">{{ $t('hero.titleHighlight') }}</span>
          </h1>
          <p class="mx-auto mt-6 text-lg text-ink-300 leading-relaxed sm:text-xl max-w-2xl">
            {{ $t('hero.subtitle') }}
          </p>
          <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <NuxtLink to="/create" class="btn-primary !h-12 !px-8 !text-base">
              {{ $t('hero.cta') }}
            </NuxtLink>
            <NuxtLink to="/pricing" class="btn-secondary !h-12 !px-8 !text-base">
              {{ $t('hero.ctaSecondary') }}
            </NuxtLink>
          </div>
          <p class="mt-5 text-sm text-ink-400">{{ $t('hero.noSignup') }}</p>
        </div>
      </div>
    </section>


    <!-- Social Proof Section -->
    <section class="relative border-t border-white/[0.06] py-12">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-8">
          <p class="text-sm font-medium text-ink-400 uppercase tracking-wider">Trusted by creators worldwide</p>
          <p class="mt-2 text-2xl font-700 text-white font-display">50,000+ songs generated</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="panel p-6 text-center">
            <div class="text-3xl font-800 text-accent-soft font-display">4.8★</div>
            <p class="mt-2 text-sm text-ink-300">Average rating from 1,200+ users</p>
          </div>
          <div class="panel p-6 text-center">
            <div class="text-3xl font-800 text-accent-soft font-display">50K+</div>
            <p class="mt-2 text-sm text-ink-300">Songs and images created</p>
          </div>
          <div class="panel p-6 text-center">
            <div class="text-3xl font-800 text-accent-soft font-display">150+</div>
            <p class="mt-2 text-sm text-ink-300">Countries represented</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section class="relative border-t border-white/[0.06] py-16">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div class="grid gap-6 lg:grid-cols-3">
          <div class="panel p-6">
            <div class="flex items-center gap-1 mb-3">
              <span v-for="i in 5" :key="i" class="i-ph-star-fill text-yellow-400 text-sm" />
            </div>
            <p class="text-[14px] leading-relaxed text-ink-200">"CraftAI saved me hours of work. I needed background music for my YouTube videos and got professional-quality tracks in minutes."</p>
            <div class="mt-4 flex items-center gap-3">
              <div class="h-8 w-8 rounded-full bg-accent/30 flex items-center justify-center text-xs font-bold text-white">S</div>
              <div>
                <p class="text-sm font-medium text-white">Sarah M.</p>
                <p class="text-xs text-ink-400">YouTuber, 50K subscribers</p>
              </div>
            </div>
          </div>
          <div class="panel p-6">
            <div class="flex items-center gap-1 mb-3">
              <span v-for="i in 5" :key="i" class="i-ph-star-fill text-yellow-400 text-sm" />
            </div>
            <p class="text-[14px] leading-relaxed text-ink-200">"The image generator is incredible. I use it for all my social media thumbnails now. The prompt optimizer is a game-changer."</p>
            <div class="mt-4 flex items-center gap-3">
              <div class="h-8 w-8 rounded-full bg-accent/30 flex items-center justify-center text-xs font-bold text-white">J</div>
              <div>
                <p class="text-sm font-medium text-white">James K.</p>
                <p class="text-xs text-ink-400">Social Media Manager</p>
              </div>
            </div>
          </div>
          <div class="panel p-6">
            <div class="flex items-center gap-1 mb-3">
              <span v-for="i in 5" :key="i" class="i-ph-star-fill text-yellow-400 text-sm" />
            </div>
            <p class="text-[14px] leading-relaxed text-ink-200">"As a podcaster, I needed custom intro music. CraftAI delivered exactly what I wanted. The cover feature is brilliant too."</p>
            <div class="mt-4 flex items-center gap-3">
              <div class="h-8 w-8 rounded-full bg-accent/30 flex items-center justify-center text-xs font-bold text-white">M</div>
              <div>
                <p class="text-sm font-medium text-white">Mike R.</p>
                <p class="text-xs text-ink-400">Podcast Host</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="relative border-t border-white/[0.06] py-20 sm:py-28">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto">
          <span class="home-badge">{{ $t('features.badge', 'Features') }}</span>
          <h2 class="font-display text-3xl font-700 text-white sm:text-4xl mt-4">
            {{ $t('features.title') }}
          </h2>
          <p class="mt-4 text-lg text-ink-300">
            {{ $t('features.subtitle') }}
          </p>
        </div>
        <div class="mt-16 grid gap-6 lg:grid-cols-3">
          <div class="panel p-8 transition duration-200 hover:border-white/[0.12] hover:bg-[#14121e]">
            <div class="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15">
              <span class="i-ph-waveform text-2xl text-accent-soft" />
            </div>
            <h3 class="font-display text-xl font-600 text-white">{{ $t('features.music.title') }}</h3>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">{{ $t('features.music.description') }}</p>
            <NuxtLink to="/create" class="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-soft hover:text-accent transition-colors">
              {{ $t('features.music.cta') }} <span class="i-ph-arrow-right text-[13px]" />
            </NuxtLink>
          </div>
          <div class="panel p-8 transition duration-200 hover:border-white/[0.12] hover:bg-[#14121e]">
            <div class="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15">
              <span class="i-ph-image text-2xl text-accent-soft" />
            </div>
            <h3 class="font-display text-xl font-600 text-white">{{ $t('features.image.title') }}</h3>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">{{ $t('features.image.description') }}</p>
            <NuxtLink to="/image" class="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-soft hover:text-accent transition-colors">
              {{ $t('features.image.cta') }} <span class="i-ph-arrow-right text-[13px]" />
            </NuxtLink>
          </div>
          <div class="panel p-8 transition duration-200 hover:border-white/[0.12] hover:bg-[#14121e]">
            <div class="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15">
              <span class="i-ph-magic-wand text-2xl text-accent-soft" />
            </div>
            <h3 class="font-display text-xl font-600 text-white">{{ $t('features.lyrics.title') }}</h3>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">{{ $t('features.lyrics.description') }}</p>
            <NuxtLink to="/create" class="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-soft hover:text-accent transition-colors">
              {{ $t('features.lyrics.cta') }} <span class="i-ph-arrow-right text-[13px]" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="relative border-t border-white/[0.06] py-20 sm:py-28">
      <div class="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <div class="panel p-10 sm:p-14">
          <h2 class="font-display text-3xl font-700 text-white sm:text-4xl">{{ $t('cta.title') }}</h2>
          <p class="mx-auto mt-4 max-w-xl text-lg text-ink-300">{{ $t('cta.subtitle') }}</p>
          <NuxtLink to="/create" class="btn-primary mt-8 inline-flex !h-12 !px-8 !text-base">
            {{ $t('cta.button') }}
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()

useHead({
  title: 'CraftAI — AI Music & Image Studio | Create Music & Images with AI',
  meta: [
    { name: 'description', content: 'Create stunning AI music and images in seconds. CraftAI uses advanced AI models to generate professional-quality music, art, and visuals. Start for free.' },
    { property: 'og:title', content: 'CraftAI — AI Music & Image Studio' },
    { property: 'og:description', content: 'Create stunning AI music and images in seconds. Powered by advanced AI models.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://creator.yozzytools.com' },
    { name: 'twitter:title', content: 'CraftAI — AI Music & Image Studio' },
    { name: 'twitter:description', content: 'Create stunning AI music and images in seconds.' },
  ],
  link: [{ rel: 'canonical', href: 'https://creator.yozzytools.com' }],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'CraftAI',
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Web',
      description: 'Create AI music and images in seconds. Generate songs, artwork, and creative content with AI.',
      offers: [
        { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
        { '@type': 'Offer', name: 'Creator', price: '9.99', priceCurrency: 'USD', eligibleDuration: { '@type': 'Duration', value: 'P1M' } },
        { '@type': 'Offer', name: 'Pro', price: '19.99', priceCurrency: 'USD', eligibleDuration: { '@type': 'Duration', value: 'P1M' } },
      ],
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '1250' }
    })
  }]
})

// 如果是 admin 域名，跳转到后台登录页
if (import.meta.client) {
  const hostname = window.location.hostname
  if (hostname === 'admin.yozzytools.com' || hostname === 'staging.admin.yozzytools.com') {
    navigateTo('/admin')
  }
}
</script>

<style scoped>
.home-page {
  position: relative;
}

.home-glow {
  pointer-events: none;
  position: absolute;
  inset: -10% -10% auto -10%;
  height: 60%;
  background: radial-gradient(ellipse at 50% 0%, rgba(139, 124, 255, 0.12), transparent 60%);
  z-index: 0;
}

.home-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(139, 124, 255, 0.2);
  background: rgba(139, 124, 255, 0.08);
  color: var(--accent-soft);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}
</style>
