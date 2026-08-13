<template>
  <div class="py-8">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="font-display text-2xl font-700 text-white">Dashboard</h1>
          <p class="mt-1 text-ink-300">{{  $t('dashboard.subtitle')  }}</p>
        </div>
        <NuxtLink to="/create" class="btn-primary">{{  $t('dashboard.createNew')  }}</NuxtLink>
      </div>

      <!-- Stats -->
      <div class="mb-8 grid gap-4 sm:grid-cols-3">
        <div class="panel p-6">
          <p class="text-sm text-ink-400">{{  $t('dashboard.musicGenerated')  }}</p>
          <p class="mt-1 text-2xl font-700 text-white">{{  stats.music  }}</p>
          <p class="mt-1 text-xs text-ink-500">{{  musicRemaining  }} {{  $t('dashboard.remaining')  }}</p>
        </div>
        <div class="panel p-6">
          <p class="text-sm text-ink-400">{{  $t('dashboard.imagesGenerated')  }}</p>
          <p class="mt-1 text-2xl font-700 text-white">{{  stats.image  }}</p>
          <p class="mt-1 text-xs text-ink-500">{{  imageRemaining  }} {{  $t('dashboard.remaining')  }}</p>
        </div>
        <div class="panel p-6">
          <p class="text-sm text-ink-400">{{  $t('dashboard.currentPlan')  }}</p>
          <p class="mt-1 text-2xl font-700 text-white capitalize">{{  plan  }}</p>
          <NuxtLink to="/pricing" class="mt-1 inline-block text-xs text-accent-soft hover:text-accent">{{  $t('dashboard.upgrade')  }}</NuxtLink>
        </div>
      </div>

      <!-- {{  $t('dashboard.recentCreations')  }} -->
      <div class="panel p-6">
        <h2 class="font-display text-lg font-600 text-white">{{  $t('dashboard.recentCreations')  }}</h2>
        <div v-if="recentItems.length" class="mt-4 space-y-3">
          <div v-for="item in recentItems" :key="item.id" class="flex items-center justify-between rounded-xl bg-white/[0.03] p-4">
            <div class="flex items-center gap-3">
              <div class="grid h-10 w-10 place-items-center rounded-lg bg-accent/20">
                <span :class="item.type === 'music' ? 'i-ph-waveform' : 'i-ph-image'" class="text-accent-soft" />
              </div>
              <div>
                <p class="text-sm font-medium text-white">{{  item.title  }}</p>
                <p class="text-xs text-ink-400">{{  item.type  }} &middot; {{  item.date  }}</p>
              </div>
            </div>
            <span class="rounded-full bg-accent/10 px-2 py-1 text-xs text-accent-soft capitalize">{{  item.status  }}</span>
          </div>
        </div>
        <div v-else class="mt-8 text-center">
          <p class="text-ink-400">{{  $t('dashboard.noCreations')  }}</p>
          <NuxtLink to="/create" class="btn-secondary mt-4 inline-flex">{{  $t('dashboard.firstCreation')  }}</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
definePageMeta({ layout: "default", middleware: ["auth"] })
// TODO: 从 API 获取实际数据
const stats = ref({ music: 0, image: 0 })
const plan = ref('free')
const musicRemaining = ref(10)
const imageRemaining = ref(20)
const refRecent = ref<Array<{ id: string; title: string; type: string; date: string; status: string }>>([])
const recentItems = refRecent

useHead({ title: 'Dashboard — CraftAI' })
</script>
