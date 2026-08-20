<template>
  <div class="py-16 sm:py-24">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="text-center">
        <h1 class="font-display text-4xl font-800 text-white sm:text-5xl">{{ $t('pricing.title') }}</h1>
        <p class="mt-4 text-lg text-ink-300">{{ $t('pricing.subtitle') }}</p>
      </div>

      <!-- Billing Toggle -->
      <div class="mt-12 flex items-center justify-center gap-4">
        <span :class="!annual ? 'text-white' : 'text-ink-400'" class="text-sm font-medium">Monthly</span>
        <button @click="annual = !annual" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" :class="annual ? 'bg-accent' : 'bg-white/10'">
          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" :class="annual ? 'translate-x-6' : 'translate-x-1'" />
        </button>
        <span :class="annual ? 'text-white' : 'text-ink-400'" class="text-sm font-medium">Annual <span class="text-accent-soft text-xs">Save 20%</span></span>
      </div>

      <div class="mt-10 grid gap-8 lg:grid-cols-3 items-stretch">
        <!-- Free Plan -->
        <div class="panel p-8 flex flex-col">
          <h2 class="font-display text-xl font-600 text-white">{{ $t('pricing.free') }}</h2>
          <div class="mt-4 flex items-baseline gap-1">
            <span class="text-4xl font-800 text-white">$0</span>
            <span class="text-ink-400">/month</span>
          </div>
          <ul class="mt-6 space-y-3 text-sm text-ink-200 flex-1">
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> 10 music generations/month</li>
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> 20 image generations/month</li>
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> Basic quality output</li>
          </ul>
          <NuxtLink to="/create" class="btn-secondary mt-8 block w-full">Get Started</NuxtLink>
        </div>

        <!-- Creator Plan -->
        <div class="panel p-8 ring-2 ring-accent/50 flex flex-col">
          <div class="flex items-center justify-between">
            <h2 class="font-display text-xl font-600 text-white">Creator</h2>
            <span class="rounded-full bg-accent/20 px-3 py-1 text-xs text-accent-soft">Most Popular</span>
          </div>
          <div class="mt-4 flex items-baseline gap-1">
            <span class="text-4xl font-800 text-white">{{ annual ? '$7.99' : '$9.99' }}</span>
            <span class="text-ink-400">/month</span>
          </div>
          <p v-if="annual" class="mt-1 text-sm text-accent-soft">$95.88 billed annually</p>
          <ul class="mt-6 space-y-3 text-sm text-ink-200 flex-1">
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> 100 music generations/month</li>
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> 200 image generations/month</li>
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> HD quality, no watermark</li>
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> Commercial license</li>
          </ul>
          <NuxtLink to="/signup" class="btn-primary mt-8 block w-full">Subscribe</NuxtLink>
        </div>

        <!-- Pro Plan -->
        <div class="panel p-8 flex flex-col">
          <h2 class="font-display text-xl font-600 text-white">Pro</h2>
          <div class="mt-4 flex items-baseline gap-1">
            <span class="text-4xl font-800 text-white">{{ annual ? '$15.99' : '$19.99' }}</span>
            <span class="text-ink-400">/month</span>
          </div>
          <p v-if="annual" class="mt-1 text-sm text-accent-soft">$191.88 billed annually</p>
          <ul class="mt-6 space-y-3 text-sm text-ink-200 flex-1">
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> 300 music generations/month</li>
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> 500 image generations/month</li>
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> HD quality, no watermark</li>
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> API access</li>
          </ul>
          <NuxtLink to="/signup" class="btn-secondary mt-8 block w-full">Subscribe</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const annual = ref(false)

useHead({
  title: 'Pricing — CraftAI',
  meta: [{ name: 'description', content: 'Simple pricing for CraftAI. Start free, upgrade to Creator for $9.99/month or save 20% with annual billing.' }],
  link: [{ rel: 'canonical', href: 'https://craftai.ai/pricing' }],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Can I try CraftAI for free?', acceptedAnswer: { '@type': 'Answer', text: 'Yes! Our Free plan gives you 10 music and 20 image generations per month.' } },
        { '@type': 'Question', name: 'Can I switch plans later?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, you can upgrade or downgrade at any time.' } },
        { '@type': 'Question', name: 'Is there a discount for annual billing?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, annual billing saves you 20% compared to monthly.' } },
      ]
    })
  }]
})
</script>
