<template>
  <div class="admin-feedback">
    <h1 class="admin-page-title">Feedback</h1>

    <!-- Filters -->
    <div class="admin-filters">
      <select v-model="filterSource" class="field !w-auto" @change="loadFeedback">
        <option value="">All Sources</option>
        <option value="creator">Creator AI</option>
        <option value="pdf">PDF Tools</option>
      </select>
      <select v-model="filterStatus" class="field !w-auto" @change="loadFeedback">
        <option value="">All Status</option>
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
      </select>
    </div>

    <div v-if="loading" class="admin-loading">
      <div class="ld-dual-ring" />
    </div>

    <div v-else-if="!items.length" class="admin-empty">
      <span class="i-ph-inbox text-3xl text-ink-500" />
      <p>No feedback yet</p>
    </div>

    <div v-else class="feedback-list">
      <div
        v-for="item in items"
        :key="item.id"
        class="feedback-item"
        :class="{ 'is-expanded': expandedId === item.id }"
        @click="toggleExpand(item.id)"
      >
        <div class="feedback-item__header">
          <div class="feedback-item__meta">
            <span class="feedback-source" :class="'is-' + item.source">{{ item.source }}</span>
            <span class="feedback-type">{{ item.type }}</span>
            <span class="feedback-status" :class="'is-' + item.status">{{ item.status }}</span>
          </div>
          <span class="feedback-date text-ink-500 text-sm">{{ formatDate(item.created_at) }}</span>
        </div>
        <div class="feedback-item__user text-ink-300">{{ item.user_email }}</div>
        <div v-if="item.title" class="feedback-item__title font-medium text-ink">{{ item.title }}</div>
        <div class="feedback-item__message text-ink-300">{{ item.message }}</div>

        <!-- Reply Section -->
        <div v-if="expandedId === item.id" class="feedback-item__reply" @click.stop>
          <textarea v-model="replyText" class="field feedback-reply-input" placeholder="Write a reply..." rows="3" />
          <div class="feedback-reply-actions">
            <select v-model="replyStatus" class="field !w-auto !h-9">
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <button class="btn-primary btn-sm" :disabled="replySaving" @click="saveReply(item.id)">
              {{ replySaving ? '...' : 'Save Reply' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const items = ref<any[]>([])
const loading = ref(true)
const filterSource = ref('')
const filterStatus = ref('')
const expandedId = ref<string | null>(null)
const replyText = ref('')
const replyStatus = ref('open')
const replySaving = ref(false)

async function loadFeedback() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filterSource.value) params.set('source', filterSource.value)
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res = await $fetch('/api/admin/feedback?' + params)
    items.value = res.items || []
  } catch {}
  loading.value = false
}

function toggleExpand(id: string) {
  if (expandedId.value === id) {
    expandedId.value = null
  } else {
    expandedId.value = id
    const item = items.value.find(i => i.id === id)
    replyText.value = item?.admin_reply || ''
    replyStatus.value = item?.status || 'open'
  }
}

async function saveReply(id: string) {
  replySaving.value = true
  try {
    await $fetch('/api/admin/feedback/' + id, {
      method: 'PATCH',
      body: { status: replyStatus.value, adminReply: replyText.value },
    })
    const item = items.value.find(i => i.id === id)
    if (item) {
      item.status = replyStatus.value
      item.admin_reply = replyText.value
    }
    expandedId.value = null
  } catch {}
  replySaving.value = false
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString()
}

onMounted(loadFeedback)
</script>

<style scoped>
.admin-page-title {
  font-family: 'Sora', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 1.5rem;
}

.admin-filters {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.admin-loading { display: flex; justify-content: center; padding: 3rem; }
.admin-empty { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 3rem; color: var(--muted); }

.feedback-list { display: flex; flex-direction: column; gap: 0.75rem; }

.feedback-item {
  padding: 1rem;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: border-color 0.2s;
}
.feedback-item:hover { border-color: var(--border-strong); }
.feedback-item.is-expanded { border-color: var(--accent); cursor: default; }

.feedback-item__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
.feedback-item__meta { display: flex; align-items: center; gap: 0.5rem; }

.feedback-source {
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background: var(--fill-soft);
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}
.feedback-source.is-creator { background: rgba(139,124,255,0.1); color: var(--accent-soft); }
.feedback-source.is-pdf { background: rgba(52,211,153,0.1); color: #34d399; }

.feedback-type { font-size: 0.75rem; color: var(--muted); text-transform: capitalize; }

.feedback-status {
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background: var(--fill-soft);
  font-size: 0.7rem;
  font-weight: 600;
}
.feedback-status.is-open { background: rgba(240,113,120,0.1); color: var(--danger); }
.feedback-status.is-resolved { background: rgba(52,211,153,0.1); color: #34d399; }

.feedback-item__user { font-size: 0.8rem; margin-bottom: 0.25rem; }
.feedback-item__title { margin-bottom: 0.25rem; }
.feedback-item__message { font-size: 0.85rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.feedback-item.is-expanded .feedback-item__message { -webkit-line-clamp: unset; }

.feedback-item__reply { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); }
.feedback-reply-input { margin-bottom: 0.75rem; }
.feedback-reply-actions { display: flex; align-items: center; gap: 0.75rem; }

.btn-sm {
  height: 2.25rem;
  padding: 0 1rem;
  border: none;
  border-radius: var(--radius-pill);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
</style>
