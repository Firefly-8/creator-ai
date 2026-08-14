<template>
  <div class="admin-dashboard">
    <h1 class="admin-page-title">Dashboard</h1>

    <div class="admin-stats">
      <div class="admin-stat-card">
        <div class="admin-stat-card__icon" style="background: rgba(52,211,153,0.1); color: #34d399;">
          <span class="i-ph-users text-xl" />
        </div>
        <div class="admin-stat-card__value">{{ stats?.totalUsers || 0 }}</div>
        <div class="admin-stat-card__label">Total Users</div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-card__icon" style="background: rgba(139,124,255,0.1); color: var(--accent-soft);">
          <span class="i-ph-chat-circle-text text-xl" />
        </div>
        <div class="admin-stat-card__value">{{ stats?.totalFeedback || 0 }}</div>
        <div class="admin-stat-card__label">Total Feedback</div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-card__icon" style="background: rgba(240,113,120,0.1); color: var(--danger);">
          <span class="i-ph-bell text-xl" />
        </div>
        <div class="admin-stat-card__value">{{ stats?.openFeedback || 0 }}</div>
        <div class="admin-stat-card__label">Open</div>
      </div>
    </div>

    <!-- Recent Users -->
    <div class="admin-section">
      <h2 class="admin-section__title">Recent Users</h2>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in recentUsers" :key="u.id">
              <td class="text-ink-300">{{ u.email }}</td>
              <td class="text-ink-300">{{ u.name || '—' }}</td>
              <td class="text-ink-500 text-sm">{{ formatDate(u.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const stats = ref<any>(null)
const recentUsers = ref<any[]>([])

async function loadData() {
  try {
    const res = await $fetch('/api/admin/stats')
    stats.value = res.stats
    recentUsers.value = res.recentUsers
  } catch {}
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString()
}

onMounted(loadData)
</script>

<style scoped>
.admin-page-title {
  font-family: 'Sora', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 1.5rem;
}

.admin-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.admin-stat-card {
  padding: 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}

.admin-stat-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-md);
  margin-bottom: 0.75rem;
}

.admin-stat-card__value {
  font-family: 'Sora', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--ink);
}

.admin-stat-card__label {
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 0.25rem;
}

.admin-section {
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
}

.admin-section__title {
  font-family: 'Sora', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 1rem;
}

.admin-table-wrap {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
}

.admin-table th {
  text-align: left;
  padding: 0.6rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border-subtle);
}

.admin-table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 0.85rem;
}
</style>
