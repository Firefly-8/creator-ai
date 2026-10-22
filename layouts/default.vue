<template>
  <div class="page-shell studio-shell">
    <EmailVerificationGuard />
    <aside class="studio-sidebar" :class="{ 'is-open': mobileNavOpen }">
      <div class="studio-sidebar__brand">
        <NuxtLink to="/" class="group flex items-center gap-2.5" @click="mobileNavOpen = false">
          <img src="/logo-mark.png" alt="Create Keepsakes" class="h-9 w-9 rounded-[11px] object-contain" />
          <span class="font-display text-[17px] font-700 tracking-tight text-white">Create Keepsakes</span>
        </NuxtLink>
        <NuxtLink to="/cards" class="studio-sidebar__note" @click="mobileNavOpen = false">
          <span class="i-ph-gift" />
          <span>
            <strong>Make a card</strong>
            <em>Back to the card maker</em>
          </span>
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

      <!-- Auth Section — always visible at top on mobile -->
      <div class="studio-sidebar__auth">
        <template v-if="authReady && !user">
          <button class="btn-secondary w-full text-sm mb-2" @click="openLogin">{{ 'Sign in' }}</button>
          <button class="btn-primary w-full text-sm" @click="openSignup">{{ 'Sign up' }}</button>
        </template>
        <template v-else-if="authReady && user">
          <!-- 账号菜单（头像 + 名字，点开有登出）—— 侧栏里所有页面都在导航里了，菜单只放登出 -->
          <UserMenu tone="dark" align="left" :user="user" :links="[]" />
        </template>
      </div>

      <div class="studio-sidebar__foot">
        <!-- Admin Link (only when logged in) -->
        <template v-if="authReady && user && isAdmin">
          <NuxtLink
            to="/admin"
            class="btn-secondary w-full text-sm !inline-flex !items-center !justify-center gap-1.5"
            @click="mobileNavOpen = false"
          >
            <span class="i-ph-shield-star text-[14px]" />
            {{ 'Admin' }}
          </NuxtLink>
        </template>
        <button class="sidebar-feedback-btn" @click="openFeedback()">
          <span class="i ph-chat-circle-text text-[14px]" />
          {{ 'Send feedback' }}
        </button>
        <div class="mt-3">
          <LanguageSwitcher />
        </div>
        <p class="text-[11px] leading-relaxed text-ink-500 mt-2">{{ 'Personalised cards &amp; canvas prints' }}</p>
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
            <button class="text-xs text-ink-300 hover:text-white" @click="openLogin">{{ 'Sign in' }}</button>
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

// ⚠️ 这里**不要**再用 useI18n()。
// 2026-10-20 实测：在 layouts/default.vue 里 `const { t: $t } = useI18n()`
// 拿到的 t 在**客户端**是 undefined（SSR 正常），模板里一调就抛
// "n.t is not a function" → 整个页面 500，而 error.vue 的 h1 硬编码 "404"，
// 看起来像路由 404，实际 statusCode 是 500，极难排查。
// 影响面是所有使用本布局的页面（9 个）。已改为硬编码英文；
// 产品也已确认英语优先、10 语种暂不投入。
// ⚠️ 同理 useHead() 只能在 setup 顶层调用（依赖 inject），
//    写在 onMounted 回调里同样会炸。

const route = useRoute()
const mobileNavOpen = ref(false)
const { user, authReady } = useAuth()
const { isOpen: authModalOpen, initialMode: authModalMode, openLogin, openSignup } = useAuthModal()
const { isOpen: feedbackOpen, openFeedback } = useFeedback()

// 检查管理员权限
const isAdmin = ref(false)
// ⚠️ 监听 **uid** 而不是整个 user 对象：
//    每次 token 刷新 Firebase 都会给出新的 User 对象，
//    监听 user 会导致 → getIdToken → 刷新 → user 变 → 再跑一遍 → 死循环。
watch([() => user.value?.uid, authReady], async () => {
  if (!authReady.value || !user.value) {
    isAdmin.value = false
    return
  }
  try {
    // ⚠️ 同上：不要用 getIdToken(true)（强制刷新 = 每次都走网络 + 触发监听）
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
// 导航顺序 = 业务优先级：贺卡是第一主业，音乐站降级保留（不删，但不再占据主导航）
const groups = computed(() => [
  {
    label: 'Make',
    items: [
      { to: '/cards', label: 'Create a Card', icon: 'i-ph-gift' },
      { to: '/image', label: 'AI Image Studio', icon: 'i-ph-image' },
    ],
  },
  {
    label: 'Music',
    items: [
      { to: '/create', label: 'Create a song', icon: 'i-ph-waveform' },
      { to: '/cover', label: 'Cover art', icon: 'i-ph-arrows-clockwise' },
      { to: '/music-library', label: 'Music library', icon: 'i-ph-music-notes' },
    ],
  },
  {
    // ⚠️ 资产入口：以前这一栏里只有 Gallery / Blog / Tools，
    //    用户生成完根本找不到自己的作品（「也没有地方看资产」）
    label: 'Yours',
    items: [
      { to: '/my-assets', label: 'My creations', icon: 'i-ph-images' },
    ],
  },
  {
    label: 'Discover',
    items: [
      { to: '/gallery', label: 'Gallery', icon: 'i-ph-grid-four' },
      { to: '/blog', label: 'Blog', icon: 'i-ph-newspaper' },
      { to: '/tools', label: 'Tools', icon: 'i-ph-wrench' },
    ],
  },
])

const pageTitle = computed(() => {
  const map: Record<string, string> = {
    '/create': 'Create',
    '/cover': 'Cover',
    '/library': 'Music library',
    '/music-library': 'Music library',
    '/my-assets': 'My creations',
    '/my-cards': 'My creations',
    '/cards': 'Create a Card',
    '/image': 'Image',
  }
  if (route.path.startsWith('/song/')) return 'Track'
  return map[route.path] || 'Create Keepsakes'
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
<style scoped>
/* 「旧 AI 工具站」提示 —— 这套深色工作台是降级保留的老站，
   顶部给一条明确出口，用户不该以为这里还是主站 */
.studio-sidebar__note {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-top: 0.85rem;
  padding: 0.6rem 0.7rem;
  border: 1px solid rgba(139, 124, 255, 0.28);
  border-radius: 0.7rem;
  background: rgba(139, 124, 255, 0.1);
  text-decoration: none;
  transition: background 0.14s ease, border-color 0.14s ease;
}
.studio-sidebar__note:hover {
  background: rgba(139, 124, 255, 0.18);
  border-color: rgba(139, 124, 255, 0.45);
}
.studio-sidebar__note > span:first-child {
  font-size: 1.1rem;
  color: #b6aaff;
  flex: none;
}
.studio-sidebar__note span span,
.studio-sidebar__note strong,
.studio-sidebar__note em {
  display: block;
}
.studio-sidebar__note strong {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #fff;
}
.studio-sidebar__note em {
  font-size: 0.6875rem;
  font-style: normal;
  color: rgba(255, 255, 255, 0.55);
}
</style>
