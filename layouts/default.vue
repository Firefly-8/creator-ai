<template>
  <div class="page-shell studio-shell">
    <EmailVerificationGuard />
    <!--
      ============ 顶部导航 ============
      ⚠️ 2026-10-28：原来是**左侧固定侧边栏**（232px），现在改成顶栏。
         原因：产品聚焦做贺卡了，侧边栏那种「工具站工作台」的布局
         跟营销站（顶栏）割裂，而且侧边栏吃掉了 232px 宽度。
         顶栏版式跟 marketing 一致（logo + 几个入口 + 登录/账号）。
    -->
    <header class="studio-top">
      <div class="studio-top__inner">
        <NuxtLink to="/" class="studio-top__brand">
          <img src="/logo-mark.png" alt="Create Keepsakes" class="studio-top__logo" />
          <span class="studio-top__name">Create Keepsakes</span>
        </NuxtLink>

        <nav class="studio-top__nav">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="studio-top__link"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="studio-top__actions">
          <template v-if="authReady && !user">
            <button class="btn-secondary !px-3 !py-1.5 text-xs studio-top__signin" @click="openLogin">Sign in</button>
            <button class="btn-primary !px-3 !py-1.5 text-xs studio-top__signup" @click="openSignup">Sign up</button>
          </template>
          <UserMenu
            v-else-if="authReady && user"
            tone="dark"
            align="right"
            :user="user"
            :links="accountLinks"
          />
          <button
            class="studio-top__icon"
            title="Send feedback"
            aria-label="Send feedback"
            @click="openFeedback()"
          >
            <span class="i-ph-chat-circle-text" />
          </button>
          <LanguageSwitcher />
        </div>

        <button
          class="studio-top__burger"
          :aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
          @click="mobileOpen = !mobileOpen"
        >
          <span :class="mobileOpen ? 'i-ph-x' : 'i-ph-list'" />
        </button>
      </div>

      <div v-if="mobileOpen" class="studio-top__mobile">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="studio-top__mobile-link"
          @click="mobileOpen = false"
        >
          {{ item.label }}
        </NuxtLink>
        <NuxtLink to="/my-assets" class="studio-top__mobile-link" @click="mobileOpen = false">
          My creations
        </NuxtLink>
        <template v-if="authReady && !user">
          <button class="btn-secondary w-full text-sm mt-2" @click="openLogin(); mobileOpen = false">Sign in</button>
          <button class="btn-primary w-full text-sm" @click="openSignup(); mobileOpen = false">Sign up</button>
        </template>
        <!-- 窄屏顶栏塞不下语言切换 → 挪到这里 -->
        <div class="mt-2"><LanguageSwitcher /></div>
      </div>
    </header>

    <main class="studio-content">
      <slot />
    </main>

    <AppPlayer />
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
const mobileOpen = ref(false)
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

/**
 * 顶栏导航项。
 * ⚠️ 原来是侧边栏的**分组**结构（Make / Music / Yours / Discover 四组），
 *    侧边栏删掉后顶栏放不下那么多分组 —— 压成一行，顺序 = 业务优先级：
 *    贺卡第一，音乐/图片是保留的边角能力，不占主位。
 */
const navItems = [
  { to: '/cards', label: 'Create a card' },
  { to: '/image', label: 'Images' },
  { to: '/create', label: 'Music' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/blog', label: 'Blog' },
  // ⚠️ /tools 是 SEO 聚合页（AI 图片/音乐/封面工具）。
  //    侧边栏删掉后它变成**零入站链接的孤儿页** → 补回顶栏。
  { to: '/tools', label: 'Tools' },
]

/**
 * 账号菜单里的站内链接。
 * ⚠️ 顶栏没有「My creations」（窄屏放不下），账号菜单是「我在哪都能找到自己的东西」
 *    的最后一道保险。
 */
const accountLinks = computed(() => {
  const links: { to: string; label: string; icon?: string }[] = [
    { to: '/my-assets', label: 'My creations', icon: 'i-ph-images' },
  ]
  // ⚠️ 以前 Admin 入口在侧边栏底部 —— 侧边栏删了以后会**丢掉**这个入口，
  //    所以挪到账号菜单里（本来就该在账号菜单，不该占主导航）。
  if (isAdmin.value) links.push({ to: '/admin', label: 'Admin', icon: 'i-ph-shield-star' })
  return links
})


watch(() => route.fullPath, () => {
  mobileOpen.value = false
})
</script>

<style scoped>
/* ---------- 顶栏 ---------- */
.studio-top {
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(10, 9, 16, 0.9);
  backdrop-filter: blur(14px);
}
.studio-top__inner {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  min-height: 56px;
  padding: 0 1rem;
}
.studio-top__brand {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  flex: none;
}
.studio-top__logo {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.5rem;
  object-fit: contain;
}
.studio-top__name {
  font-family: var(--font-display, Georgia, serif);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #fff;
  white-space: nowrap;
}
.studio-top__nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.studio-top__link {
  padding: 0.4rem 0.7rem;
  border-radius: 0.6rem;
  color: #a39db8;
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;
}
.studio-top__link:hover { background: rgba(255, 255, 255, 0.05); color: #fff; }
.studio-top__link.router-link-active { background: rgba(139, 124, 255, 0.16); color: #fff; }
.studio-top__actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: none;
}
.studio-top__icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 0.55rem;
  background: transparent;
  color: #a39db8;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.studio-top__icon:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }
.studio-top__burger {
  display: none;
  place-items: center;
  /* ⚠️ flex 容器里默认 flex-shrink:1 —— 窄屏时按钮会被压成 16×6px，
     点都点不准。必须 flex:none。 */
  flex: none;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 0.6rem;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 1.1rem;
  cursor: pointer;
}
.studio-top__mobile {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.6rem 1rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.studio-top__mobile-link {
  padding: 0.6rem 0.4rem;
  border-radius: 0.6rem;
  color: #d7d3e6;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
}
.studio-top__mobile-link:hover { background: rgba(255, 255, 255, 0.05); color: #fff; }

/* LanguageSwitcher 自带 width:100%（原来是放在侧边栏底部的），
   放进顶栏会撑爆整行 → 这里收窄成按钮大小 */
.studio-top__actions :deep(.lang-switcher) { width: auto; flex: none; }
.studio-top__actions :deep(.lang-switcher__btn) {
  width: auto;
  padding: 0.4rem 0.6rem;
  font-size: 0.75rem;
}

@media (max-width: 900px) {
  .studio-top__nav { display: none; }
  .studio-top__burger { display: grid; }
  /* 窄屏顶栏塞不下语言切换，挪到汉堡菜单里 */
  .studio-top__actions :deep(.lang-switcher) { display: none; }
}

@media (max-width: 560px) {
  /* 更窄：品牌只留 logo，登录只留「Sign in」（Sign up 在汉堡菜单里） */
  .studio-top__name { display: none; }
  .studio-top__signup { display: none; }
}
</style>
