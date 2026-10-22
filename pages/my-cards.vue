<template>
  <div />
</template>

<script setup lang="ts">
/**
 * /my-cards 已并入 /my-assets（统一的「我的资产」页，图片 + 歌曲）。
 * 老链接（分享出去的、书签的）继续能用，直接跳过去。
 */
definePageMeta({ layout: 'default' })

await navigateTo('/my-assets', { redirectCode: 301 })
</script>
