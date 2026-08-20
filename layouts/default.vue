<template>
  <div class="page-shell studio-shell">
    <EmailVerificationGuard />
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
        <template v-if="authReady && !user">
          <button class="btn-secondary w-full text-sm mb-2" @click="openLogin">{{ $t('nav.login') }}</button>
          <button class="btn-primary w-full text-sm" @click="openSignup">{{ $t('nav.signup') }}</button>
        </template>
        <template v-else-if="authReady && user">
          <div class="flex items-center gap-2 mb-2">
            <div class="h-8 w-8 rounded-full bg-accent/30 flex items-center justify-center text-xs font-bold text-white">
              {{ user.email?.charAt(0).toUpperCase() || 'U' }}
            </div>
            <span class="text-xs text-ink-300 truncate">{{ user.email }}</span>
          </div>
          <button class="btn-secondary w-full text-sm" @click="handleLogout">{{ $t('nav.logout') }}</button>
          <!-- Admin Link -->
          <NuxtLink
            v-if="isAdmin"
            to="/admin"
            class="btn-secondary w-full text-sm mt-2 !inline-flex !items-center !justify-center gap-1.5"
            @click="mobileNavOpen = false"
          >
            <span class="i-ph-shield-star text-[14px]" />
            {{ $t('nav.admin', 'Admin') }}
          </NuxtLink>
        </template>
        <button class="sidebar-feedback-btn" @click="openFeedback()">
          <span class="i ph-chat-circle-text text-[14px]" />
          {{ $t('feedback.title', 'Send Feedback') }}
        </button>
        <div class="mt-3">
          <LanguageSwitcher />
        </div>
        <p class="text-[11px] leading-relaxed text-ink-500 mt-2">{{ $t('nav.tagline') }}</p>
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
          <template v-if="authReady && !user">
            <button class="text-xs text-ink-300 hover:text-white" @click="openLogin">{{ $t('nav.login') }}</button>
          </template>
        </div>
      </header>

      <main class="studio-content">
        <slot />
      </main>
    </div>
  </div>
  <AuthModal v-model="authModalOpen" :initial-mode="authModalMode" />
  <FeedbackModal v-model="feedbackOpen" source="creator" />
  <CookieConsent />
  <LocaleSuggestion />
</template>

<script setup lang="ts">
import CookieConsent from '~/components/ui/CookieConsent.vue'
import LanguageSwitcher from '~/components/ui/LanguageSwitcher.vue'
import LocaleSuggestion from '~/components/ui/LocaleSuggestion.vue'

const { t: $t } = useI18n()
const route = useRoute()
const mobileNavOpen = ref(false)
const { user, authReady, logout } = useAuth()
const { isOpen: authModalOpen, initialMode: authModalMode, openLogin, openSignup } = useAuthModal()
const { isOpen: feedbackOpen, openFeedback } = useFeedback()
useRobots()

async function handleLogout() {
  await logout()
  await navigateTo('/')
}

// 检查管理员权限
const isAdmin = ref(false)
watch([user, authReady], async () => {
  if (!authReady.value || !user.value) {
    isAdmin.value = false
    return
  }
  try {
    const token = await user.value.getIdToken()
    const res = await $fetch<{ role: string }>('/api/user/role', {
      headers: { Authorization: `Bearer ${token}` },
    })
    isAdmin.value = res.role === 'admin'
  } catch {
    isAdmin.value = false
  }
}, { immediate: true })

// 使用 computed 确保 i18n 切换时导航标签同步更新
const groups = computed(() => [
  {
    label: $t('nav.musicGroup'),
    items: [
      { to: '/create', label: $t('nav.create'), icon: 'i-ph-waveform' },
      { to: '/cover', label: $t('nav.cover'), icon: 'i-ph-arrows-clockwise' },
      { to: '/library', label: $t('nav.library'), icon: 'i-ph-music-notes' },
    ],
  },
  {
    label: $t('nav.imageGroup'),
    items: [
      { to: '/image', label: $t('nav.image'), icon: 'i-ph-image' },
    ],
  },
])

const pageTitle = computed(() => {
  const map: Record<string, string> = {
    '/create': 'Create',
    '/cover': 'Cover',
    '/library': 'Library',
    '/image': $t('nav.imageGroup'),
  }
  if (route.path.startsWith('/song/')) return 'Track'
  return map[route.path] || 'CraftAI'
})

watch(() => route.fullPath, () => {
  mobileNavOpen.value = false
})
</script>

<style scoped>
.sidebar-feedback-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.5rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--muted);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}
.sidebar-feedback-btn:hover {
  border-color: var(--border-strong);
  color: var(--ink);
  background: var(--fill-soft);
}
</style>
