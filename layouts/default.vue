<template>
  <div class="page-shell studio-shell">
    <aside class="studio-sidebar" :class="{ 'is-open': mobileNavOpen }">
      <div class="studio-sidebar__brand">
        <NuxtLink to="/create" class="group flex items-center gap-2.5" @click="mobileNavOpen = false">
          <img src="/logo.png" alt="Creator" class="h-9 w-9 rounded-[11px] object-contain" />
          <span class="font-display text-[17px] font-700 tracking-tight text-white">Creator</span>
        </NuxtLink>
      </div>

      <nav class="studio-sidebar__nav">
        <div v-for="group in groups" :key="group.label" class="studio-nav-group">
          <p class="studio-nav-group__label">{{ group.label }}</p>
          <NuxtLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="studio-nav-link"
            @click="mobileNavOpen = false"
          >
            <span class="text-[16px]" :class="item.icon" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </div>
      </nav>

      <div class="studio-sidebar__foot">
        <template v-if="!authLoading && !user">
          <NuxtLink to="/login" class="btn-secondary w-full text-sm mb-2">Sign In</NuxtLink>
          <NuxtLink to="/signup" class="btn-primary w-full text-sm">Get Started</NuxtLink>
        </template>
        <template v-else-if="user">
          <div class="flex items-center gap-2 mb-2">
            <div class="h-8 w-8 rounded-full bg-accent/30 flex items-center justify-center text-xs font-bold text-white">
              {{ user.email?.charAt(0).toUpperCase() || 'U' }}
            </div>
            <span class="text-xs text-ink-300 truncate">{{ user.email }}</span>
          </div>
          <button class="btn-secondary w-full text-sm" @click="handleLogout">Sign Out</button>
        </template>
        <p class="text-[11px] leading-relaxed text-ink-500 mt-3">AI Music & Image Studio</p>
      </div>
    </aside>

    <div v-if="mobileNavOpen" class="studio-sidebar-backdrop" @click="mobileNavOpen = false" />

    <div class="studio-main">
      <header class="studio-topbar md:hidden">
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/5"
          aria-label="Menu"
          @click="mobileNavOpen = true"
        >
          <span class="i-ph-list text-white/80" />
        </button>
        <span class="font-display text-[15px] font-650 text-white">{{ pageTitle }}</span>
        <div class="flex items-center gap-2 w-9 justify-end">
          <template v-if="!authLoading && !user">
            <NuxtLink to="/login" class="text-xs text-ink-300 hover:text-white">Sign In</NuxtLink>
          </template>
        </div>
      </header>

      <main class="studio-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const mobileNavOpen = ref(false)
const { user, loading: authLoading, logout } = useAuth()

async function handleLogout() {
  await logout()
  await navigateTo('/login')
}

const groups = [
  {
    label: 'Music',
    items: [
      { to: '/create', label: 'Create', icon: 'i-ph-waveform' },
      { to: '/cover', label: 'Cover', icon: 'i-ph-arrows-clockwise' },
      { to: '/library', label: 'Library', icon: 'i-ph-music-notes' },
    ],
  },
  {
    label: 'Image',
    items: [
      { to: '/image', label: 'Generate', icon: 'i-ph-image' },
    ],
  },
]

const pageTitle = computed(() => {
  const map: Record<string, string> = {
    '/create': 'Create',
    '/cover': 'Cover',
    '/library': 'Library',
    '/image': 'Image',
  }
  if (route.path.startsWith('/song/')) return 'Track'
  return map[route.path] || 'CraftAI'
})

watch(() => route.fullPath, () => {
  mobileNavOpen.value = false
})
</script>
