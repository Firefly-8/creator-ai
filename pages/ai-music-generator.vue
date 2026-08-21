<template>
  <div class="home-page">
    <!-- Glow -->
    <div class="home-glow" />

    <!-- Hero -->
    <section class="relative overflow-hidden py-20 sm:py-28 lg:py-32">
      <div class="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto">
          <span class="home-badge">AI Music Generator</span>
          <h1 class="font-display text-4xl font-800 tracking-tight text-white sm:text-5xl lg:text-6xl mt-4 leading-[1.1]">
            Create Songs
            <span class="block text-accent-soft">in Seconds</span>
          </h1>
          <p class="mx-auto mt-6 text-lg text-ink-300 leading-relaxed sm:text-xl max-w-2xl">
            Turn text into music with AI. Generate complete songs, instrumentals, and vocals from simple descriptions. No musical experience needed.
          </p>
          <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <NuxtLink to="/create" class="btn-primary !h-12 !px-8 !text-base">
              Generate Music Free
            </NuxtLink>
            <NuxtLink to="/pricing" class="btn-secondary !h-12 !px-8 !text-base">
              View Plans
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="relative border-t border-white/[0.06] py-20 sm:py-28">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto">
          <span class="home-badge">How It Works</span>
          <h2 class="font-display text-3xl font-700 text-white sm:text-4xl mt-4">
            Three Simple Steps
          </h2>
        </div>
        <div class="mt-16 grid gap-6 lg:grid-cols-3">
          <div class="panel p-8 text-center transition duration-200 hover:border-white/[0.12]">
            <div class="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15">
              <span class="i-ph-note-pencil text-2xl text-accent-soft" />
            </div>
            <h3 class="font-display text-xl font-600 text-white">1. Describe Your Song</h3>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">Write a prompt describing the genre, mood, and style of music you want.</p>
          </div>
          <div class="panel p-8 text-center transition duration-200 hover:border-white/[0.12]">
            <div class="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15">
              <span class="i-ph-magic-wand text-2xl text-accent-soft" />
            </div>
            <h3 class="font-display text-xl font-600 text-white">2. AI Generates</h3>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">Our AI creates a complete song with vocals, instruments, and mixing.</p>
          </div>
          <div class="panel p-8 text-center transition duration-200 hover:border-white/[0.12]">
            <div class="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15">
              <span class="i-ph-download-simple text-2xl text-accent-soft" />
            </div>
            <h3 class="font-display text-xl font-600 text-white">3. Download & Use</h3>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">Download your track and use it in videos, podcasts, or social media.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="relative border-t border-white/[0.06] py-20 sm:py-28">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <span class="home-badge">FAQ</span>
          <h2 class="font-display text-3xl font-700 text-white sm:text-4xl mt-4">Frequently Asked Questions</h2>
        </div>
        <div class="mt-12 space-y-4">
          <div class="panel p-6 transition duration-200 hover:border-white/[0.12]">
            <h3 class="font-display text-lg font-600 text-white">Can I use AI-generated music commercially?</h3>
            <p class="mt-2 text-[14.5px] leading-relaxed text-ink-300">Yes! Paid plans include a commercial license. You can use generated music in videos, podcasts, ads, and client work.</p>
          </div>
          <div class="panel p-6 transition duration-200 hover:border-white/[0.12]">
            <h3 class="font-display text-lg font-600 text-white">How long does it take to generate a song?</h3>
            <p class="mt-2 text-[14.5px] leading-relaxed text-ink-300">Most songs are generated within 1-3 minutes depending on length and complexity.</p>
          </div>
          <div class="panel p-6 transition duration-200 hover:border-white/[0.12]">
            <h3 class="font-display text-lg font-600 text-white">What genres can I create?</h3>
            <p class="mt-2 text-[14.5px] leading-relaxed text-ink-300">CraftAI supports pop, rock, hip-hop, electronic, classical, jazz, and many more genres.</p>
          </div>
          <div class="panel p-6 transition duration-200 hover:border-white/[0.12]">
            <h3 class="font-display text-lg font-600 text-white">Is the free plan really free?</h3>
            <p class="mt-2 text-[14.5px] leading-relaxed text-ink-300">Yes! You get 10 music generations and 20 image generations per month — no credit card required.</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'AI Music Generator — Create Songs with AI | CraftAI',
  meta: [
    { name: 'description', content: 'Generate AI music from text descriptions. Create complete songs, instrumentals, and vocals in seconds. Free to start, commercial license available.' },
    { property: 'og:title', content: 'AI Music Generator — Create Songs with AI' },
    { property: 'og:description', content: 'Turn text into music with AI. Generate complete songs from simple descriptions.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'keywords', content: 'AI music generator, AI song generator, text to music, AI composer, music generation AI' },
  ],
  link: [{ rel: 'canonical', href: 'https://creator.yozzytools.com/ai-music-generator' }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'CraftAI AI Music Generator',
        applicationCategory: 'Multimedia',
        description: 'Generate AI music from text descriptions. Create complete songs, instrumentals, and vocals in seconds.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      }),
    },
  ],
})
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
