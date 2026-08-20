<template>
  <div class="fixed inset-0 flex items-center justify-center px-4">
    <div class="text-center">
      <h1 class="font-display text-8xl font-800 text-accent-soft">404</h1>
      <p class="mt-4 text-xl text-white">Page Not Found</p>
      <p class="mt-2 text-ink-300">The page you're looking for doesn't exist or has been moved.</p>
      <div class="mt-8 flex items-center justify-center gap-4">
        <NuxtLink to="/" class="btn-primary !h-12 !px-8">Go Home</NuxtLink>
        <button @click="handleClearError" class="btn-secondary !h-12 !px-8">Try Again</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  error: { type: Object, default: null }
})

useHead({
  title: '404 — Page Not Found | CraftAI',
  meta: [
    { name: 'robots', content: 'noindex' }
  ]
})

const handleClearError = () => {
  clearError({ redirect: '/' })
}
</script>
