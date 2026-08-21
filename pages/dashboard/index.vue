<template>
  <div class="py-8">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="font-display text-2xl font-700 text-white">Dashboard</h1>
          <p class="mt-1 text-ink-300">{{ $t('dashboard.subtitle') }}</p>
        </div>
        <NuxtLink to="/create" class="btn-primary">{{ $t('dashboard.createNew') }}</NuxtLink>
      </div>

      <!-- Stats -->
      <div class="mb-8 grid gap-4 sm:grid-cols-3">
        <div class="panel p-6">
          <p class="text-sm text-ink-400">{{ $t('dashboard.musicGenerated') }}</p>
          <p class="mt-1 text-2xl font-700 text-white">{{ stats.music }}</p>
          <p class="mt-1 text-xs text-ink-500">{{ musicRemaining }} {{ $t('dashboard.remaining') }}</p>
        </div>
        <div class="panel p-6">
          <p class="text-sm text-ink-400">{{ $t('dashboard.imagesGenerated') }}</p>
          <p class="mt-1 text-2xl font-700 text-white">{{ stats.image }}</p>
          <p class="mt-1 text-xs text-ink-500">{{ imageRemaining }} {{ $t('dashboard.remaining') }}</p>
        </div>
        <div class="panel p-6">
          <p class="text-sm text-ink-400">{{ $t('dashboard.currentPlan') }}</p>
          <p class="mt-1 text-2xl font-700 text-white capitalize">{{ plan }}</p>
          <NuxtLink to="/pricing" class="mt-1 inline-block text-xs text-accent-soft hover:text-accent">{{ $t('dashboard.upgrade') }}</NuxtLink>
        </div>
      </div>

      <!-- Daily Free Claim -->
      <div class="mb-8 panel p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-display text-lg font-600 text-white">Daily Free Generation</h2>
            <p class="mt-1 text-sm text-ink-400">Come back every day for free generations</p>
          </div>
          <div class="flex items-center gap-3">
            <div v-if="dailyStreak > 0" class="text-center">
              <p class="text-2xl font-700 text-accent-soft">{{ dailyStreak }}</p>
              <p class="text-[11px] text-ink-400">day streak</p>
            </div>
            <button
              class="btn-primary !h-9 !px-4 text-sm"
              :disabled="dailyMusicClaimed"
              @click="claimDaily('music')"
            >
              <span v-if="dailyMusicClaimed">Claimed ✓</span>
              <span v-else>+1 Free Music</span>
            </button>
            <button
              class="btn-secondary !h-9 !px-4 text-sm"
              :disabled="dailyImageClaimed"
              @click="claimDaily('image')"
            >
              <span v-if="dailyImageClaimed">Claimed ✓</span>
              <span v-else>+1 Free Image</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Recent Creations -->
      <div class="panel p-6">
        <h2 class="font-display text-lg font-600 text-white">{{ $t('dashboard.recentCreations') }}</h2>
        <div v-if="recentItems.length" class="mt-4 space-y-3">
          <div v-for="item in recentItems" :key="item.id" class="flex items-center justify-between rounded-xl bg-white/[0.03] p-4">
            <div class="flex items-center gap-3">
              <div class="grid h-10 w-10 place-items-center rounded-lg bg-accent/20">
                <span :class="item.type === 'music' ? 'i-ph-waveform' : 'i-ph-image'" class="text-accent-soft" />
              </div>
              <div>
                <p class="text-sm font-medium text-white">{{ item.title }}</p>
                <p class="text-xs text-ink-400">{{ item.type }} &middot; {{ item.date }}</p>
              </div>
            </div>
            <span class="rounded-full bg-accent/10 px-2 py-1 text-xs text-accent-soft capitalize">{{ item.status }}</span>
          </div>
        </div>
        <div v-else class="mt-8 text-center">
          <p class="text-ink-400">{{ $t('dashboard.noCreations') }}</p>
          <NuxtLink to="/create" class="btn-secondary mt-4 inline-flex">{{ $t('dashboard.firstCreation') }}</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
definePageMeta({ layout: 'default', middleware: ['auth'] })

const { get } = useApi()

const stats = ref({ music: 0, image: 0 })
const plan = ref('free')
const musicRemaining = ref('∞')
const imageRemaining = ref('∞')
const recentItems = ref<Array<{ id: string; title: string; type: string; date: string; status: string }>>([])

// 加载用户数据
async function loadDashboard() {
  try {
    const data = await get('/api/auth/me')
    stats.value.music = data.stats?.songs || 0
    stats.value.image = data.stats?.images || 0
    plan.value = data.subscription?.plan || 'free'
    
    // 免费模式无限额度
    const quotas = data.quotas?.free
    if (quotas) {
      musicRemaining.value = quotas.music - stats.value.music > 0 ? String(quotas.music - stats.value.music) : '0'
      imageRemaining.value = quotas.image - stats.value.image > 0 ? String(quotas.image - stats.value.image) : '0'
    }
  } catch (err) {
    console.error('[Dashboard] Failed to load:', err)
  }
}

// 加载最近作品
async function loadRecent() {
  try {
    const data = await get('/api/songs')
    const songs = data.songs || []
    recentItems.value = songs.slice(0, 5).map((s: any) => ({
      id: s.id,
      title: s.title,
      type: 'music',
      date: new Date(s.createdAt).toLocaleDateString(),
      status: s.status,
    }))
  } catch (err) {
    console.error('[Dashboard] Failed to load recent:', err)
  }
}

async function loadDailyFree() {
  try {
    const data = await $fetch('/api/user/daily-free')
    dailyMusicClaimed.value = data.music?.claimed || false
    dailyImageClaimed.value = data.image?.claimed || false
    dailyStreak.value = data.streakDays || 0
  } catch {
    // ignore
  }
}

async function claimDaily(type: 'music' | 'image') {
  try {
    const data = await $fetch<{ streakDays: number }>('/api/user/daily-free', {
      method: 'POST',
      body: { type },
    })
    if (type === 'music') dailyMusicClaimed.value = true
    else dailyImageClaimed.value = true
    dailyStreak.value = data.streakDays || dailyStreak.value
  } catch (err: any) {
    if (err?.statusCode !== 409) {
      console.error('[Daily Free] Claim failed:', err)
    }
  }
}

onMounted(() => {
  loadDashboard()
  loadRecent()
  loadDailyFree()
})

useHead({ title: 'Dashboard — CraftAI' })
</script>
