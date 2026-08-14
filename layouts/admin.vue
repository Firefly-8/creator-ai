<template>
  <div class="admin-root">
    <!-- Admin Sidebar (only show if logged in) -->
    <aside v-if="isLoggedIn" class="admin-sidebar">
      <div class="admin-sidebar__brand">
        <img src="/logo.png" alt="Admin" class="h-8 w-8 rounded-[10px] object-contain" />
        <span class="font-display text-[15px] font-700 text-white">Admin</span>
      </div>
      <nav class="admin-nav">
        <NuxtLink to="/admin/dashboard" class="admin-nav__link" exact-active-class="is-active">
          <span class="i-ph-chart-bar text-[16px]" />
          Dashboard
        </NuxtLink>
        <NuxtLink to="/admin/feedback" class="admin-nav__link" active-class="is-active">
          <span class="i-ph-chat-circle-text text-[16px]" />
          Feedback
          <span v-if="openCount" class="admin-nav__badge">{{ openCount }}</span>
        </NuxtLink>
        <NuxtLink to="/admin/users" class="admin-nav__link" active-class="is-active">
          <span class="i-ph-users text-[16px]" />
          Users
        </NuxtLink>
        <NuxtLink to="/admin/gift" class="admin-nav__link" active-class="is-active">
          <span class="i-ph-gift text-[16px]" />
          Gift
        </NuxtLink>
      </nav>
      <div class="admin-sidebar__foot">
        <button class="admin-logout-btn" @click="handleLogout">
          <span class="i-ph-sign-out text-[14px]" />
          Sign Out
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="admin-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const isLoggedIn = ref(false)
const openCount = ref(0)

async function checkAuth() {
  if (!import.meta.client) return
  try {
    await $fetch('/api/admin/auth/me')
    isLoggedIn.value = true
    loadStats()
  } catch {
    isLoggedIn.value = false
    // If not on login page, redirect
    if (useRoute().path !== '/admin') {
      navigateTo('/admin')
    }
  }
}

async function loadStats() {
  try {
    const res = await $fetch('/api/admin/stats')
    openCount.value = res.stats?.openFeedback || 0
  } catch {}
}

async function handleLogout() {
  await $fetch('/api/admin/auth/logout', { method: 'POST' })
  navigateTo('/admin')
}

onMounted(checkAuth)
</script>

<style scoped>
.admin-root {
  display: flex;
  min-height: 100vh;
  background: var(--bg, #0a0910);
}

.admin-sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-subtle);
  background: var(--surface);
  padding: 1rem;
}

.admin-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 2rem;
}

.admin-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.admin-nav__link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-md);
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}

.admin-nav__link:hover {
  background: var(--fill-soft);
  color: var(--ink);
}

.admin-nav__link.is-active {
  background: rgba(139, 124, 255, 0.1);
  color: var(--accent-soft);
}

.admin-nav__badge {
  margin-left: auto;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: var(--danger, #f07178);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
}

.admin-sidebar__foot {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--border-subtle);
}

.admin-logout-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.5rem;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.admin-logout-btn:hover {
  background: var(--fill-soft);
  color: var(--ink);
}

.admin-main {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}
</style>
