<template>
  <div>
    <h1>Test Page</h1>
    <p>If you see this, SSR is working.</p>
  </div>
</template>

<script setup lang="ts">
// Minimal test - no layout, no special components
definePageMeta({
  layout: false,
})

useHead({
  title: 'Test Page - SSR Working',
  meta: [
    { name: 'description', content: 'SSR test page' }
  ]
})

console.log('[TEST PAGE] setup executed')
</script>
