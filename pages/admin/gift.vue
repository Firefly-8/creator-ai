<template>
  <div class="admin-gift">
    <h1 class="admin-page-title">Gift Privileges</h1>
    <p class="admin-page-desc">Grant special privileges to users by email. Supports SVIP, unlimited credits, and moderator roles.</p>

    <div class="gift-form-card">
      <h2 class="gift-form-title">New Privilege</h2>
      <div class="gift-form">
        <div class="gift-field">
          <label class="field-label">Target User Email</label>
          <input v-model="form.email" type="email" class="field" placeholder="user@example.com" required />
        </div>
        <div class="gift-field">
          <label class="field-label">Privilege Type</label>
          <div class="gift-options">
            <button v-for="opt in options" :key="opt.value" type="button" class="gift-option" :class="{ 'is-active': form.privilege === opt.value }" @click="form.privilege = opt.value">
              <span class="gift-option__icon">{{ opt.icon }}</span>
              <span class="gift-option__label">{{ opt.label }}</span>
              <span class="gift-option__desc">{{ opt.desc }}</span>
            </button>
          </div>
        </div>
        <div class="gift-field">
          <label class="field-label">Expires At (optional)</label>
          <input v-model="form.expiresAt" type="date" class="field" />
          <p class="gift-field-hint">Leave empty for permanent</p>
        </div>
        <div v-if="error" class="gift-error">{{ error }}</div>
        <div v-if="success" class="gift-success">{{ success }}</div>
        <button class="btn-primary w-full" :disabled="saving || !form.email" @click="submitGift">
          {{ saving ? 'Processing...' : 'Grant Privilege' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const form = reactive({ email: '', privilege: 'svip', expiresAt: '' })
const options = [
  { value: 'svip', icon: '👑', label: 'SVIP', desc: 'Full access + unlimited' },
  { value: 'unlimited_credits', icon: '♾️', label: 'Unlimited', desc: 'Unlimited generations' },
  { value: 'moderator', icon: '🛡️', label: 'Moderator', desc: 'Content moderation' },
]
const saving = ref(false)
const error = ref('')
const success = ref('')

async function submitGift() {
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const res = await $fetch('/api/admin/gift', {
      method: 'POST',
      body: { targetEmail: form.email.trim(), privilege: form.privilege, expiresAt: form.expiresAt || null },
    })
    success.value = 'Privilege granted successfully! → ' + res.user.email
    form.email = ''
    form.expiresAt = ''
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.admin-page-title { font-family: 'Sora', sans-serif; font-size: 1.75rem; font-weight: 700; color: var(--ink); margin-bottom: 0.5rem; }
.admin-page-desc { color: var(--muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
.gift-form-card { background: var(--surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.5rem; }
.gift-form-title { font-family: 'Sora', sans-serif; font-size: 1.1rem; font-weight: 600; color: var(--ink); margin-bottom: 1.25rem; }
.gift-form { display: flex; flex-direction: column; gap: 1.25rem; }
.gift-field { display: flex; flex-direction: column; gap: 0.4rem; }
.gift-field-hint { font-size: 0.75rem; color: var(--ink-500); }
.gift-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
.gift-option { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0.75rem 0.5rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: transparent; cursor: pointer; transition: all 0.2s; text-align: center; }
.gift-option:hover { border-color: var(--border-strong); }
.gift-option.is-active { border-color: var(--accent); background: rgba(139,124,255,0.1); }
.gift-option__icon { font-size: 1.5rem; }
.gift-option__label { font-size: 0.8rem; font-weight: 600; color: var(--ink); }
.gift-option__desc { font-size: 0.65rem; color: var(--muted); line-height: 1.3; }
.gift-error { padding: 0.5rem 0.75rem; border-radius: var(--radius-md); background: rgba(240,113,120,0.1); color: var(--danger); font-size: 0.85rem; }
.gift-success { padding: 0.5rem 0.75rem; border-radius: var(--radius-md); background: rgba(52,211,153,0.1); color: #34d399; font-size: 0.85rem; }
</style>
