<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// robots meta 全站生效（staging 自动 noindex）
// ⚠️ 必须在 setup 顶层调用 —— useHead 依赖 inject，只能在同步阶段用
useRobots()
</script>
