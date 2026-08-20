<template>
  <div class="py-16 sm:py-24">
    <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <div class="text-center">
        <h1 class="font-display text-4xl font-800 text-white sm:text-5xl">
          AI Image Generator
        </h1>
        <p class="mt-4 text-lg text-ink-300 max-w-2xl mx-auto">
          Create stunning, unique images with AI. Just describe what you want and our advanced AI models will generate it in seconds.
        </p>
        <NuxtLink to="/image" class="btn-primary mt-8 inline-flex !h-12 !px-8 !text-base">
          Start Generating Images
        </NuxtLink>
      </div>

      <div class="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div class="panel p-6">
          <div class="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent/20">
            <span class="i-ph-lightning text-2xl text-accent-soft" />
          </div>
          <h3 class="font-display text-lg font-600 text-white">Lightning Fast</h3>
          <p class="mt-2 text-sm text-ink-300">Generate high-quality images in under 10 seconds.</p>
        </div>
        <div class="panel p-6">
          <div class="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent/20">
            <span class="i-ph-palette text-2xl text-accent-soft" />
          </div>
          <h3 class="font-display text-lg font-600 text-white">Any Style</h3>
          <p class="mt-2 text-sm text-ink-300">From photorealistic to anime, pixel art to oil painting.</p>
        </div>
        <div class="panel p-6">
          <div class="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent/20">
            <span class="i-ph-crown text-2xl text-accent-soft" />
          </div>
          <h3 class="font-display text-lg font-600 text-white">Commercial Ready</h3>
          <p class="mt-2 text-sm text-ink-300">Use your generated images for any commercial project.</p>
        </div>
      </div>

      <div class="mt-16 panel p-8">
        <h2 class="font-display text-2xl font-700 text-white">Frequently Asked Questions</h2>
        <div class="mt-8 space-y-6">
          <div>
            <h3 class="text-white font-medium">How does the AI image generator work?</h3>
            <p class="mt-2 text-ink-300 text-sm">Simply describe the image you want in natural language. Our AI models interpret your prompt and generate a unique image matching your description.</p>
          </div>
          <div>
            <h3 class="text-white font-medium">Can I use the images commercially?</h3>
            <p class="mt-2 text-ink-300 text-sm">Yes! All images generated with a paid plan come with a commercial license. You can use them for marketing, products, social media, and more.</p>
          </div>
          <div>
            <h3 class="text-white font-medium">What image formats are supported?</h3>
            <p class="mt-2 text-ink-300 text-sm">You can download your images in PNG or JPG format at up to 2048x2048 resolution.</p>
          </div>
        </div>
      </div>

      <div class="mt-12 text-center">
        <NuxtLink to="/pricing" class="btn-secondary inline-flex !h-12 !px-8">
          View Pricing Plans
        </NuxtLink>
      </div>
    </div>
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
