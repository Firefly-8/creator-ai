<template>
  <div class="content-page">
    <div class="content-glow" />

    <section class="relative py-20 sm:py-28">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto">
          <span class="content-badge">AI Tools</span>
          <h1 class="font-display text-4xl font-800 tracking-tight text-white sm:text-5xl mt-4">
            Free AI Creation Tools
          </h1>
          <p class="mx-auto mt-4 max-w-xl text-lg text-ink-300">
            Generate music, images, lyrics, and more with AI. All tools are free to start — no credit card required.
          </p>
        </div>

        <!-- Tools Grid -->
        <div class="mt-16 grid gap-6 lg:grid-cols-2">
          <NuxtLink to="/create" class="panel p-8 transition duration-200 hover:border-white/[0.12] hover:bg-[#14121e] group">
            <div class="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15">
              <span class="i-ph-waveform text-2xl text-accent-soft" />
            </div>
            <h2 class="font-display text-xl font-600 text-white group-hover:text-accent-soft transition-colors">AI Music Generator</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">Create complete songs from text descriptions. Choose from genres, moods, and styles. Generate vocals, instrumentals, and full tracks in minutes.</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span class="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-soft">Text to Music</span>
              <span class="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-soft">Custom Lyrics</span>
              <span class="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-soft">Instrumental</span>
            </div>
          </NuxtLink>

          <NuxtLink to="/image" class="panel p-8 transition duration-200 hover:border-white/[0.12] hover:bg-[#14121e] group">
            <div class="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15">
              <span class="i-ph-image text-2xl text-accent-soft" />
            </div>
            <h2 class="font-display text-xl font-600 text-white group-hover:text-accent-soft transition-colors">AI Image Generator</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">Generate stunning artwork from text descriptions. From photorealistic to anime, pixel art to oil painting — any style you can imagine.</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span class="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-soft">Text to Image</span>
              <span class="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-soft">Image to Image</span>
              <span class="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-soft">Prompt Optimizer</span>
            </div>
          </NuxtLink>

          <NuxtLink to="/cover" class="panel p-8 transition duration-200 hover:border-white/[0.12] hover:bg-[#14121e] group">
            <div class="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15">
              <span class="i-ph-arrows-clockwise text-2xl text-accent-soft" />
            </div>
            <h2 class="font-display text-xl font-600 text-white group-hover:text-accent-soft transition-colors">AI Cover Generator</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">Upload a reference track and create a cover version. Extract lyrics, change the style, and generate a new version of any song.</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span class="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-soft">Cover Songs</span>
              <span class="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-soft">Lyrics Extract</span>
              <span class="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-soft">Style Transfer</span>
            </div>
          </NuxtLink>

          <NuxtLink to="/create" class="panel p-8 transition duration-200 hover:border-white/[0.12] hover:bg-[#14121e] group">
            <div class="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15">
              <span class="i-ph-note-pencil text-2xl text-accent-soft" />
            </div>
            <h2 class="font-display text-xl font-600 text-white group-hover:text-accent-soft transition-colors">AI Lyrics Writer</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">Generate song lyrics in any style. Edit and refine until it is perfect. From pop to rap, ballads to rock — AI writes lyrics for you.</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span class="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-soft">Write Lyrics</span>
              <span class="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-soft">Edit Lyrics</span>
              <span class="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-soft">Any Genre</span>
            </div>
          </NuxtLink>
        </div>

        <!-- CTA -->
        <div class="mt-16 text-center">
          <div class="panel p-10 sm:p-14 inline-block">
            <h2 class="font-display text-2xl font-700 text-white sm:text-3xl">Ready to Create?</h2>
            <p class="mx-auto mt-3 max-w-md text-ink-300">Start for free. No credit card required. Generate your first creation in seconds.</p>
            <NuxtLink to="/create" class="btn-primary mt-6 inline-flex !h-11 !px-7">
              Start Creating Free
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Free AI Creation Tools — Music, Image, Lyrics Generator | CraftAI',
  meta: [
    { name: 'description', content: 'Free AI tools for music generation, image creation, cover songs, and lyrics writing. Start creating with AI — no credit card required.' },
    { property: 'og:title', content: 'Free AI Creation Tools | CraftAI' },
    { property: 'og:description', content: 'Generate music, images, lyrics, and more with AI. All tools free to start.' },
    { property: 'og:type', content: 'website' },
    { name: 'keywords', content: 'AI music generator, AI image generator, AI lyrics writer, AI cover generator, free AI tools, text to music, text to image' },
  ],
  link: [{ rel: 'canonical', href: 'https://creator.yozzytools.com/tools' }],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'AI Creation Tools',
      description: 'Free AI tools for music, image, lyrics, and cover generation.',
      url: 'https://creator.yozzytools.com/tools',
      hasPart: [
        { '@type': 'WebApplication', name: 'AI Music Generator', url: 'https://creator.yozzytools.com/create' },
        { '@type': 'WebApplication', name: 'AI Image Generator', url: 'https://creator.yozzytools.com/image' },
        { '@type': 'WebApplication', name: 'AI Cover Generator', url: 'https://creator.yozzytools.com/cover' },
        { '@type': 'WebApplication', name: 'AI Lyrics Writer', url: 'https://creator.yozzytools.com/create' },
      ],
    }),
  }],
})
</script>

<style scoped>
.content-page {
  position: relative;
}

.content-glow {
  pointer-events: none;
  position: absolute;
  inset: -5% -10% auto -10%;
  height: 40%;
  background: radial-gradient(ellipse at 50% 0%, rgba(139, 124, 255, 0.1), transparent 60%);
  z-index: 0;
}

.content-badge {
  display: inline-flex;
  align-items: center;
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
