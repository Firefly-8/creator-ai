<template>
  <div class="py-16 sm:py-24">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="text-center">
        <h1 class="font-display text-4xl font-800 text-white sm:text-5xl">Simple, Transparent Pricing</h1>
        <p class="mt-4 text-lg text-ink-300">Start free. Upgrade when you need more.</p>
      </div>
      <div class="mt-16 grid gap-8 lg:grid-cols-3">
        <div class="panel p-8">
          <h2 class="font-display text-xl font-600 text-white">Free</h2>
          <div class="mt-4 flex items-baseline gap-1"><span class="text-4xl font-800 text-white">$0</span><span class="text-ink-400">/month</span></div>
          <ul class="mt-6 space-y-3 text-sm text-ink-200">
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> 10 music generations/month</li>
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> 20 image generations/month</li>
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> Basic quality output</li>
          </ul>
          <NuxtLink to="/create" class="btn-secondary mt-8 block w-full">Get Started</NuxtLink>
        </div>
        <div class="panel p-8 ring-2 ring-accent/50">
          <div class="flex items-center justify-between">
            <h2 class="font-display text-xl font-600 text-white">Creator</h2>
            <span class="rounded-full bg-accent/20 px-3 py-1 text-xs text-accent-soft">Popular</span>
          </div>
          <div class="mt-4 flex items-baseline gap-1"><span class="text-4xl font-800 text-white">$9.99</span><span class="text-ink-400">/month</span></div>
          <ul class="mt-6 space-y-3 text-sm text-ink-200">
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> 100 music generations/month</li>
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> 200 image generations/month</li>
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> HD quality, no watermark</li>
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> Commercial license</li>
          </ul>
          <NuxtLink to="/signup" class="btn-primary mt-8 block w-full">Subscribe Now</NuxtLink>
        </div>
        <div class="panel p-8">
          <h2 class="font-display text-xl font-600 text-white">Pro</h2>
          <div class="mt-4 flex items-baseline gap-1"><span class="text-4xl font-800 text-white">$19.99</span><span class="text-ink-400">/month</span></div>
          <ul class="mt-6 space-y-3 text-sm text-ink-200">
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> 300 music generations/month</li>
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> 500 image generations/month</li>
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> HD quality, no watermark</li>
            <li class="flex gap-2"><span class="i-ph-check-circle-fill mt-0.5 text-accent-soft" /> API access</li>
          </ul>
          <NuxtLink to="/signup" class="btn-secondary mt-8 block w-full">Subscribe Now</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
useHead({ title: 'Pricing — CraftAI', meta: [{ name: 'description', content: 'Simple pricing for CraftAI. Start free, upgrade to Creator for $9.99/month.' }], link: [{ rel: 'canonical', href: 'https://craftai.ai/pricing' }] })
</script>
