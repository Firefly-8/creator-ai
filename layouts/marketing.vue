<template>
  <div class="mk-shell">
    <!-- 顶部导航 -->
    <header class="mk-top">
      <div class="mk-top__inner">
        <NuxtLink to="/" class="mk-brand">
          <img src="/logo-mark.png" alt="Create Keepsakes" class="mk-brand__logo" />
          <span class="mk-brand__name">Create Keepsakes</span>
        </NuxtLink>

        <nav class="mk-nav">
          <NuxtLink to="/cards" class="mk-nav__link">Create a card</NuxtLink>
          <NuxtLink to="/gallery" class="mk-nav__link">Gallery</NuxtLink>
          <NuxtLink to="/pricing" class="mk-nav__link">Pricing</NuxtLink>
          <NuxtLink to="/blog" class="mk-nav__link">Blog</NuxtLink>
        </nav>

        <div class="mk-top__actions">
          <template v-if="authReady && !user">
            <button class="mk-btn mk-btn--ghost" @click="openLogin">Log in</button>
            <button class="mk-btn mk-btn--primary" @click="openSignup">Start free</button>
          </template>
          <UserMenu v-else-if="authReady && user" :user="user" :links="menuLinks" />
        </div>

        <button class="mk-burger" aria-label="Menu" @click="mobileOpen = !mobileOpen">
          <span :class="mobileOpen ? 'i-ph-x' : 'i-ph-list'" />
        </button>
      </div>

      <div v-if="mobileOpen" class="mk-mobile">
        <NuxtLink to="/cards" class="mk-mobile__link" @click="mobileOpen = false">Create a card</NuxtLink>
        <NuxtLink to="/gallery" class="mk-mobile__link" @click="mobileOpen = false">Gallery</NuxtLink>
        <NuxtLink to="/pricing" class="mk-mobile__link" @click="mobileOpen = false">Pricing</NuxtLink>
        <NuxtLink to="/blog" class="mk-mobile__link" @click="mobileOpen = false">Blog</NuxtLink>
        <NuxtLink to="/my-cards" class="mk-mobile__link" @click="mobileOpen = false">My cards</NuxtLink>
        <template v-if="authReady && !user">
          <button class="mk-btn mk-btn--ghost w-full" @click="openLogin(); mobileOpen = false">Log in</button>
          <button class="mk-btn mk-btn--primary w-full" @click="openSignup(); mobileOpen = false">Start free</button>
        </template>
        <!-- 登录后：移动端也给出账号 + 登出入口（原来这里什么都没有，登不出去） -->
        <UserMenu v-else-if="authReady && user" align="left" class="mt-2" :user="user" :links="[]" />
      </div>
    </header>

    <main class="mk-main">
      <slot />
    </main>

    <footer class="mk-foot">
      <div class="mk-foot__inner">
        <div class="mk-foot__brand">
          <img src="/logo-mark.png" alt="Create Keepsakes" class="mk-brand__logo" />
          <p class="mk-foot__tag">
            Personalised cards and canvas prints for the people you love.
          </p>
        </div>
        <nav class="mk-foot__links">
          <div>
            <p class="mk-foot__label">Make</p>
            <NuxtLink to="/cards">Create a card</NuxtLink>
            <NuxtLink to="/my-cards">My cards</NuxtLink>
            <NuxtLink to="/gallery">Gallery</NuxtLink>
          </div>
          <div>
            <p class="mk-foot__label">Who is it for</p>
            <NuxtLink v-for="a in audiences" :key="a.slug" :to="`/for/${a.slug}`">
              For {{ a.short }}
            </NuxtLink>
          </div>
          <div>
            <p class="mk-foot__label">Company</p>
            <NuxtLink to="/about">About</NuxtLink>
            <NuxtLink to="/contact">Contact</NuxtLink>
            <button type="button" class="mk-foot__feedback" @click="feedbackOpen = true">Give feedback</button>
          </div>
          <div>
            <p class="mk-foot__label">Legal</p>
            <NuxtLink to="/privacy">Privacy</NuxtLink>
            <NuxtLink to="/terms">Terms</NuxtLink>
            <NuxtLink to="/refund-policy">Refunds</NuxtLink>
          </div>
        </nav>
      </div>
      <p class="mk-foot__copy">
        © {{ new Date().getFullYear() }} Create Keepsakes. All rights reserved.
      </p>
    </footer>

    <AuthModal v-model="authModalOpen" :initial-mode="authModalMode" />
    <FeedbackModal v-model="feedbackOpen" source="creator" />
    <CookieConsent />
  </div>
</template>

<script setup lang="ts">
import CookieConsent from '~/components/ui/CookieConsent.vue'
import FeedbackModal from '~/components/ui/FeedbackModal.vue'
import { AUDIENCES } from '~/utils/audiences'

const { user, authReady } = useAuth()
const { isOpen: authModalOpen, initialMode: authModalMode, openLogin, openSignup } = useAuthModal()
const mobileOpen = ref(false)
const feedbackOpen = ref(false)
const audiences = AUDIENCES

/** 账号菜单里的站内链接 */
const menuLinks = [
  { to: '/my-cards', label: 'My cards', icon: 'i-ph-images' },
]
</script>

<style scoped>
.mk-shell {
  --mk-bg: #fbf7f1;
  --mk-ink: #2a2420;
  --mk-ink-2: #6b5f55;
  --mk-line: rgba(58, 46, 38, 0.12);
  --mk-coral: #c8543d;
  --mk-coral-deep: #a53f2c;
  --mk-serif: 'Playfair Display', Georgia, serif;

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--mk-bg);
  color: var(--mk-ink);
  font-family: 'Manrope', system-ui, sans-serif;
}

/* ---------- 顶栏 ---------- */
.mk-top {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(251, 247, 241, 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--mk-line);
}
.mk-top__inner {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  max-width: 74rem;
  margin: 0 auto;
  padding: 0.75rem 1.5rem;
}

.mk-brand { display: inline-flex; align-items: center; gap: 0.55rem; text-decoration: none; }
.mk-brand__logo { width: 2rem; height: 2rem; border-radius: 0.5rem; object-fit: contain; }
.mk-brand__name {
  font-family: var(--mk-serif);
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--mk-ink);
}

.mk-nav { display: flex; gap: 1.5rem; margin-left: auto; }
.mk-nav__link {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--mk-ink-2);
  text-decoration: none;
}
.mk-nav__link:hover { color: var(--mk-coral-deep); }

.mk-top__actions { display: flex; align-items: center; gap: 0.5rem; }

.mk-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 1.05rem;
  border: 1.5px solid transparent;
  border-radius: 999px;
  font-size: 0.9375rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.14s ease, border-color 0.14s ease;
}
.mk-btn--primary { background: var(--mk-coral); color: #fff; }
.mk-btn--primary:hover { background: var(--mk-coral-deep); }
.mk-btn--ghost { border-color: var(--mk-line); color: var(--mk-ink); background: transparent; }
.mk-btn--ghost:hover { border-color: var(--mk-coral); color: var(--mk-coral-deep); }

.mk-burger {
  display: none;
  margin-left: auto;
  width: 2.4rem;
  height: 2.4rem;
  border: 1px solid var(--mk-line);
  border-radius: 0.6rem;
  background: #fff;
  font-size: 1.2rem;
  color: var(--mk-ink);
  cursor: pointer;
}

.mk-mobile {
  display: none;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem 1.5rem 1.25rem;
  border-top: 1px solid var(--mk-line);
  background: var(--mk-bg);
}
.mk-mobile__link {
  padding: 0.6rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--mk-ink);
  text-decoration: none;
  border-bottom: 1px solid var(--mk-line);
}

@media (max-width: 860px) {
  .mk-nav, .mk-top__actions { display: none; }
  .mk-burger { display: grid; place-items: center; }
  .mk-mobile { display: flex; }
}

.mk-main { flex: 1; }

/* ---------- 页脚 ---------- */
.mk-foot {
  margin-top: 4rem;
  padding: 3rem 1.5rem 2rem;
  border-top: 1px solid var(--mk-line);
  background: #f4ece1;
}
.mk-foot__inner {
  display: flex;
  flex-wrap: wrap;
  gap: 2.5rem;
  justify-content: space-between;
  max-width: 74rem;
  margin: 0 auto;
}
.mk-foot__brand { max-width: 20rem; }
.mk-foot__tag { margin-top: 0.75rem; font-size: 0.875rem; line-height: 1.55; color: var(--mk-ink-2); }
.mk-foot__links { display: flex; gap: 3rem; }
.mk-foot__links > div { display: flex; flex-direction: column; gap: 0.4rem; }
.mk-foot__label {
  margin: 0 0 0.35rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #a08f81;
}
.mk-foot__links a {
  font-size: 0.9375rem;
  color: var(--mk-ink-2);
  text-decoration: none;
}
.mk-foot__links a:hover { color: var(--mk-coral-deep); }
.mk-foot__feedback {
  display: block;
  margin-top: 8px;
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: left;
  opacity: 0.72;
  transition: opacity 0.15s ease;
}
.mk-foot__feedback:hover { opacity: 1; }

.mk-foot__copy {
  max-width: 74rem;
  margin: 2rem auto 0;
  padding-top: 1.25rem;
  border-top: 1px solid var(--mk-line);
  font-size: 0.8125rem;
  color: #a08f81;
}
</style>
