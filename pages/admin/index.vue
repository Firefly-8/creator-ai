<template>
  <div class="admin-login-page">
    <div class="admin-login-card">
      <!-- Logo -->
      <div class="admin-login-brand">
        <img src="/logo.png" alt="Admin" class="admin-login-logo" />
        <h1 class="admin-login-title">Admin Panel</h1>
        <p class="admin-login-subtitle">yozzytools.com</p>
      </div>

      <!-- Login Form -->
      <form class="admin-login-form" @submit.prevent="handleLogin">
        <div class="admin-field">
          <label class="field-label">Username</label>
          <input
            v-model="form.username"
            type="text"
            class="field"
            placeholder="Enter username"
            autocomplete="username"
            required
          />
        </div>
        <div class="admin-field">
          <label class="field-label">Password</label>
          <input
            v-model="form.password"
            type="password"
            class="field"
            placeholder="Enter password"
            autocomplete="current-password"
            required
          />
        </div>

        <div v-if="error" class="admin-error">{{ error }}</div>

        <button type="submit" class="btn-primary w-full" :disabled="loading">
          <span v-if="loading">Signing in...</span>
          <span v-else>Sign In</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

// Redirect if already logged in
if (import.meta.client) {
  const token = document.cookie.includes('admin_session=')
  if (token) navigateTo('/admin/dashboard')
}

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/auth/login', {
      method: 'POST',
      body: { username: form.username, password: form.password },
    })
    navigateTo('/admin/dashboard')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.admin-login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg, #0a0910);
  padding: 1rem;
}

.admin-login-card {
  width: 100%;
  max-width: 400px;
  padding: 2.5rem;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}

.admin-login-brand {
  text-align: center;
  margin-bottom: 2rem;
}

.admin-login-logo {
  width: 3rem;
  height: 3rem;
  border-radius: var(--radius-sm);
  margin-bottom: 0.75rem;
}

.admin-login-title {
  font-family: 'Sora', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ink);
}

.admin-login-subtitle {
  font-size: 0.85rem;
  color: var(--muted);
  margin-top: 0.25rem;
}

.admin-login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.admin-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.admin-error {
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-md);
  background: rgba(240, 113, 120, 0.1);
  color: var(--danger, #f07178);
  font-size: 0.85rem;
}
</style>
