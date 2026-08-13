<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden py-16 sm:py-24">
      <div class="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent" />
      <div class="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <h1 class="font-display text-4xl font-800 tracking-tight text-white sm:text-5xl lg:text-6xl">
            AI Music Generator
            <span class="block text-accent-soft">Create Songs in Seconds</span>
          </h1>
          <p class="mx-auto mt-6 max-w-2xl text-lg text-ink-300 sm:text-xl">
            Turn text into music with AI. Generate complete songs, instrumentals, and vocals 
            from simple descriptions. No musical experience needed.
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
    <section class="border-t border-white/[0.06] py-20">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 class="text-center font-display text-3xl font-700 text-white sm:text-4xl">How It Works</h2>
        <div class="mt-16 grid gap-8 sm:grid-cols-3">
          <div class="panel p-8 text-center">
            <div class="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent/20">
              <span class="i-ph-note-pencil text-2xl text-accent-soft" />
            </div>
            <h3 class="font-display text-xl font-600 text-white">1. Describe Your Song</h3>
            <p class="mt-2 text-ink-300">Write a prompt describing the genre, mood, and style of music you want.</p>
          </div>
          <div class="panel p-8 text-center">
            <div class="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent/20">
              <span class="i-ph-magic-wand text-2xl text-accent-soft" />
            </div>
            <h3 class="font-display text-xl font-600 text-white">2. AI Generates</h3>
            <p class="mt-2 text-ink-300">Our AI creates a complete song with vocals, instruments, and mixing.</p>
          </div>
          <div class="panel p-8 text-center">
            <div class="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent/20">
              <span class="i-ph-download text-2xl text-accent-soft" />
            </div>
            <h3 class="font-display text-xl font-600 text-white">3. Download & Use</h3>
            <p class="mt-2 text-ink-300">Download your track and use it in videos, podcasts, or social media.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="border-t border-white/[0.06] py-20">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 class="text-center font-display text-3xl font-700 text-white sm:text-4xl">Frequently Asked Questions</h2>
        <div class="mt-12 space-y-6">
          <div class="panel p-6">
            <h3 class="font-display text-lg font-600 text-white">Can I use AI-generated music commercially?</h3>
            <p class="mt-2 text-ink-300">Yes! Paid plans include a commercial license. You can use generated music in videos, podcasts, ads, and client work.</p>
          </div>
          <div class="panel p-6">
            <h3 class="font-display text-lg font-600 text-white">How long does it take to generate a song?</h3>
            <p class="mt-2 text-ink-300">Most songs are generated within 1-3 minutes depending on length and complexity.</p>
          </div>
          <div class="panel p-6">
            <h3 class="font-display text-lg font-600 text-white">What genres can I create?</h3>
            <p class="mt-2 text-ink-300">CraftAI supports pop, rock, hip-hop, electronic, classical, jazz, and many more genres.</p>
          </div>
          <div class="panel p-6">
            <h3 class="font-display text-lg font-600 text-white">Is the free plan really free?</h3>
            <p class="mt-2 text-ink-300">Yes! You get 10 music generations and 20 image generations per month — no credit card required.</p>
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
  link: [{ rel: 'canonical', href: 'https://craftai.ai/ai-music-generator' }],
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
