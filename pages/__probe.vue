<template>
  <pre style="padding:24px;font:13px/1.6 monospace;white-space:pre-wrap">{{ out }}</pre>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
const out = ref('loading…')
onMounted(() => {
  const nuxt = useNuxtApp() as any
  const i18n = nuxt.$i18n
  out.value = JSON.stringify({
    hasNuxtApp: !!nuxt,
    hasI18n: !!i18n,
    i18nKeys: i18n ? Object.keys(i18n).slice(0, 30) : [],
    tType: typeof i18n?.t,
    locale: i18n?.locale,
    hasComposer: !!i18n?.composer,
    composerTType: typeof i18n?.composer?.t,
    hasSetLocale: typeof i18n?.setLocale,
    legacyPath: !!i18n?._legacy,
  }, null, 2)
})
</script>
