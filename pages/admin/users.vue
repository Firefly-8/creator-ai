<template>
  <div class="admin-users">
    <h1 class="admin-page-title">Users</h1>

    <div class="admin-search">
      <span class="i-ph-magnifying-glass text-ink-400" />
      <input v-model="search" type="text" class="field !pl-10" placeholder="Search by email or name..." @input="debouncedSearch" />
    </div>

    <div v-if="loading" class="admin-loading"><div class="ld-dual-ring" /></div>

    <div v-else class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Email</th><th>Name</th><th>Plan</th><th>Joined</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in items" :key="u.id">
            <td class="text-ink-300">{{ u.email }}</td>
            <td class="text-ink-300">{{ u.name || '—' }}</td>
            <td><span class="admin-plan" :class="'is-' + (u.plan || 'free')">{{ u.plan || 'free' }}</span></td>
            <td class="text-ink-500 text-sm">{{ formatDate(u.created_at) }}</td>
            <td>
              <button class="btn-secondary btn-sm" @click="openGift(u)">
                <span class="i-ph-gift text-[12px]" /> Gift
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Gift Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="giftTarget" class="gift-overlay" @click.self="giftTarget = null">
          <div class="gift-backdrop" @click="giftTarget = null" />
          <div class="gift-card">
            <h3 class="gift-title">Gift Privilege</h3>
            <p class="gift-target">{{ giftTarget.email }}</p>
            <div class="gift-options">
              <button v-for="opt in giftOptions" :key="opt.value" class="gift-option" :class="{ 'is-active': giftForm.privilege === opt.value }" @click="giftForm.privilege = opt.value">
                <span class="gift-option__icon">{{ opt.icon }}</span>
                <span class="gift-option__label">{{ opt.label }}</span>
                <span class="gift-option__desc">{{ opt.desc }}</span>
              </button>
            </div>
            <div class="gift-field">
              <label class="field-label">Expires At (optional)</label>
              <input v-model="giftForm.expiresAt" type="date" class="field" />
            </div>
            <div v-if="giftError" class="gift-error">{{ giftError }}</div>
            <div class="gift-actions">
              <button class="btn-secondary flex-1" @click="giftTarget = null">Cancel</button>
              <button class="btn-primary flex-1" :disabled="giftSaving" @click="submitGift">{{ giftSaving ? '...' : 'Gift' }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const items = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const giftTarget = ref<any>(null)
const giftForm = reactive({ privilege: 'svip', expiresAt: '' })
const giftSaving = ref(false)
const giftError = ref('')

const giftOptions = [
  { value: 'svip', icon: '👑', label: 'SVIP', desc: 'Full access + unlimited' },
  { value: 'unlimited_credits', icon: '♾️', label: 'Unlimited', desc: 'Unlimited generations' },
  { value: 'moderator', icon: '🛡️', label: 'Moderator', desc: 'Content moderation' },
]

let searchTimer: ReturnType<typeof setTimeout> | null = null
function debouncedSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(loadUsers, 300)
}

async function loadUsers() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (search.value) params.set('search', search.value)
    const res = await $fetch('/api/admin/users?' + params)
    items.value = res.items || []
  } catch {}
  loading.value = false
}

function openGift(user: any) {
  giftTarget.value = user
  giftForm.privilege = 'svip'
  giftForm.expiresAt = ''
  giftError.value = ''
}

async function submitGift() {
  if (!giftTarget.value) return
  giftSaving.value = true
  giftError.value = ''
  try {
    await $fetch('/api/admin/gift', {
      method: 'POST',
      body: { targetEmail: giftTarget.value.email, privilege: giftForm.privilege, expiresAt: giftForm.expiresAt || null },
    })
    giftTarget.value = null
    await loadUsers()
  } catch (e: any) {
    giftError.value = e?.data?.statusMessage || e?.message || 'Failed'
  } finally {
    giftSaving.value = false
  }
}

function formatDate(d: string) { return new Date(d).toLocaleDateString() }

onMounted(loadUsers)
</script>

<style scoped>
.admin-page-title { font-family: 'Sora', sans-serif; font-size: 1.75rem; font-weight: 700; color: var(--ink); margin-bottom: 1.5rem; }
.admin-search { position: relative; margin-bottom: 1.5rem; }
.admin-search .i-ph-magnifying-glass { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); }
.admin-loading { display: flex; justify-content: center; padding: 3rem; }
.admin-table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); }
.admin-table { width: 100%; border-collapse: collapse; }
.admin-table th { text-align: left; padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-subtle); }
.admin-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-subtle); font-size: 0.85rem; }
.admin-plan { padding: 0.15rem 0.5rem; border-radius: 999px; background: var(--fill-soft); font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
.admin-plan.is-svip { background: rgba(251,191,36,0.1); color: #fbbf24; }
.admin-plan.is-pro { background: rgba(139,124,255,0.1); color: var(--accent-soft); }
.btn-sm { height: 2rem; padding: 0 0.75rem; display: inline-flex; align-items: center; gap: 0.3rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-pill); background: transparent; color: var(--muted); font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-sm:hover { border-color: var(--border-strong); color: var(--ink); background: var(--fill-soft); }

.gift-overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.gift-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); }
.gift-card { position: relative; width: 100%; max-width: 420px; background: var(--surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem; }
.gift-title { font-family: 'Sora', sans-serif; font-size: 1.25rem; font-weight: 700; color: var(--ink); margin-bottom: 0.5rem; }
.gift-target { color: var(--muted); font-size: 0.85rem; margin-bottom: 1.25rem; }
.gift-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 1.25rem; }
.gift-option { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0.75rem 0.5rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: transparent; cursor: pointer; transition: all 0.2s; text-align: center; }
.gift-option:hover { border-color: var(--border-strong); }
.gift-option.is-active { border-color: var(--accent); background: rgba(139,124,255,0.1); }
.gift-option__icon { font-size: 1.5rem; }
.gift-option__label { font-size: 0.8rem; font-weight: 600; color: var(--ink); }
.gift-option__desc { font-size: 0.65rem; color: var(--muted); line-height: 1.3; }
.gift-field { margin-bottom: 1rem; }
.gift-error { padding: 0.5rem 0.75rem; margin-bottom: 1rem; border-radius: var(--radius-md); background: rgba(240,113,120,0.1); color: var(--danger); font-size: 0.8rem; }
.gift-actions { display: flex; gap: 0.75rem; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
