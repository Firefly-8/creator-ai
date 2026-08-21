<template>
  <div class="home-page">
    <!-- Glow -->
    <div class="home-glow" />

    <!-- Hero -->
    <section class="relative overflow-hidden py-20 sm:py-28 lg:py-32">
      <div class="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto">
          <span class="home-badge">AI Image Generator</span>
          <h1 class="font-display text-4xl font-800 tracking-tight text-white sm:text-5xl lg:text-6xl mt-4 leading-[1.1]">
            Stunning Images,
            <span class="block text-accent-soft">Generated in Seconds</span>
          </h1>
          <p class="mx-auto mt-6 text-lg text-ink-300 leading-relaxed sm:text-xl max-w-2xl">
            Create stunning, unique images with AI. Just describe what you want and our advanced AI models will generate it in seconds.
          </p>
          <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <NuxtLink to="/image" class="btn-primary !h-12 !px-8 !text-base">
              Start Generating Images
            </NuxtLink>
            <NuxtLink to="/pricing" class="btn-secondary !h-12 !px-8 !text-base">
              View Plans
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="relative border-t border-white/[0.06] py-20 sm:py-28">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto">
          <span class="home-badge">Features</span>
          <h2 class="font-display text-3xl font-700 text-white sm:text-4xl mt-4">
            Why Choose CraftAI Images
          </h2>
        </div>
        <div class="mt-16 grid gap-6 lg:grid-cols-3">
          <div class="panel p-8 text-center transition duration-200 hover:border-white/[0.12]">
            <div class="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15">
              <span class="i-ph-lightning text-2xl text-accent-soft" />
            </div>
            <h3 class="font-display text-lg font-600 text-white">Lightning Fast</h3>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">Generate high-quality images in under 10 seconds.</p>
          </div>
          <div class="panel p-8 text-center transition duration-200 hover:border-white/[0.12]">
            <div class="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15">
              <span class="i-ph-palette text-2xl text-accent-soft" />
            </div>
            <h3 class="font-display text-lg font-600 text-white">Any Style</h3>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">From photorealistic to anime, pixel art to oil painting.</p>
          </div>
          <div class="panel p-8 text-center transition duration-200 hover:border-white/[0.12]">
            <div class="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15">
              <span class="i-ph-crown text-2xl text-accent-soft" />
            </div>
            <h3 class="font-display text-lg font-600 text-white">Commercial Ready</h3>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">Use your generated images for any commercial project.</p>
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
            <h3 class="font-display text-lg font-600 text-white">How does the AI image generator work?</h3>
            <p class="mt-2 text-[14.5px] leading-relaxed text-ink-300">Simply describe the image you want in natural language. Our AI models interpret your prompt and generate a unique image matching your description.</p>
          </div>
          <div class="panel p-6 transition duration-200 hover:border-white/[0.12]">
            <h3 class="font-display text-lg font-600 text-white">Can I use the images commercially?</h3>
            <p class="mt-2 text-[14.5px] leading-relaxed text-ink-300">Yes! All images generated with a paid plan come with a commercial license. You can use them for marketing, products, social media, and more.</p>
          </div>
          <div class="panel p-6 transition duration-200 hover:border-white/[0.12]">
            <h3 class="font-display text-lg font-600 text-white">What image formats are supported?</h3>
            <p class="mt-2 text-[14.5px] leading-relaxed text-ink-300">You can download your images in PNG or JPG format at up to 2048x2048 resolution.</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'AI Image Generator — Create Stunning Images with AI | CraftAI',
  meta: [
    { name: 'description', content: 'Create stunning, unique images with AI. Just describe what you want and our advanced AI models will generate it in seconds. Try free.' },
    { property: 'og:title', content: 'AI Image Generator — Create Stunning Images with AI' },
    { property: 'og:description', content: 'Create stunning, unique images with AI in seconds. Try CraftAI free.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:title', content: 'AI Image Generator — Create Stunning Images with AI' },
    { name: 'twitter:description', content: 'Create stunning, unique images with AI in seconds.' },
  ],
  link: [{ rel: 'canonical', href: 'https://creator.yozzytools.com/ai-image-generator' }],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'CraftAI Image Generator',
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '1250' }
    })
  }]
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
