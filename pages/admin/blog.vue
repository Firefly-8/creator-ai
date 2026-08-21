<template>
  <div class="admin-blog">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-display text-xl font-700 text-white">Blog Management</h1>
      <button class="btn-primary !h-9 !px-4 text-sm" @click="showEditor = true">
        <span class="i-ph-plus text-[14px]" /> New Article
      </button>
    </div>

    <!-- 文章列表 -->
    <div class="space-y-3">
      <div
        v-for="post in posts"
        :key="post.id"
        class="flex items-center justify-between rounded-xl bg-white/[0.03] p-4"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-medium text-white truncate">{{ post.title }}</h3>
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              :class="{
                'bg-success/15 text-success': post.status === 'published',
                'bg-warning/15 text-warning': post.status === 'draft',
                'bg-ink-400/15 text-ink-400': post.status === 'archived',
              }"
            >
              {{ post.status }}
            </span>
          </div>
          <p class="mt-1 text-xs text-ink-400 truncate">{{ post.excerpt }}</p>
          <p class="mt-1 text-[11px] text-ink-500">
            {{ post.slug }} · {{ post.viewCount }} views · {{ formatDate(post.createdAt) }}
          </p>
        </div>
        <div class="flex items-center gap-2 ml-4">
          <button
            class="text-xs text-ink-300 hover:text-accent-soft"
            @click="editPost(post)"
          >
            Edit
          </button>
          <button
            v-if="post.status === 'draft'"
            class="text-xs text-success hover:text-success/80"
            @click="publishPost(post.id)"
          >
            Publish
          </button>
        </div>
      </div>
    </div>

    <div v-if="!loading && posts.length === 0" class="text-center py-12">
      <p class="text-ink-400">No articles yet. Create your first one!</p>
    </div>

    <!-- 编辑器弹窗 -->
    <div v-if="showEditor" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
      <div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#12101a] border border-white/10 p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="font-display text-lg font-700 text-white">
            {{ editingPost ? 'Edit Article' : 'New Article' }}
          </h2>
          <button class="text-ink-400 hover:text-white" @click="showEditor = false">
            <span class="i-ph-x text-lg" />
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="field-label">Slug</label>
            <input v-model="form.slug" class="field mt-1" placeholder="article-slug" />
          </div>
          <div>
            <label class="field-label">Title</label>
            <input v-model="form.title" class="field mt-1" placeholder="Article title" />
          </div>
          <div>
            <label class="field-label">Excerpt</label>
            <textarea v-model="form.excerpt" class="field mt-1 min-h-16" placeholder="Brief description..." />
          </div>
          <div>
            <label class="field-label">Content (Markdown)</label>
            <textarea v-model="form.content" class="field mt-1 min-h-48 font-mono text-sm" placeholder="# Title..." />
          </div>
          <div>
            <label class="field-label">Tags (comma separated)</label>
            <input v-model="form.tagsInput" class="field mt-1" placeholder="tag1, tag2, tag3" />
          </div>
          <div>
            <label class="field-label">Status</label>
            <select v-model="form.status" class="field mt-1">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button class="btn-secondary !h-9 !px-4 text-sm" @click="showEditor = false">Cancel</button>
          <button class="btn-primary !h-9 !px-4 text-sm" :disabled="saving" @click="savePost">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const posts = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const showEditor = ref(false)
const editingPost = ref<any>(null)

const form = reactive({
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  tagsInput: '',
  status: 'draft',
})

async function loadPosts() {
  loading.value = true
  try {
    const data = await $fetch('/api/admin/blog', {
      headers: { Cookie: document.cookie },
    })
    posts.value = data.posts || []
  } catch (err) {
    console.error('[Admin Blog] Failed:', err)
  } finally {
    loading.value = false
  }
}

function editPost(post: any) {
  editingPost.value = post
  form.slug = post.slug
  form.title = post.title
  form.excerpt = post.excerpt
  form.content = ''
  form.tagsInput = post.tags.join(', ')
  form.status = post.status
  showEditor.value = true
}

async function savePost() {
  saving.value = true
  try {
    const tags = form.tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    const body = {
      slug: form.slug,
      title: form.title,
      excerpt: form.excerpt,
      content: form.content,
      tags,
      status: form.status,
    }

    if (editingPost.value) {
      await $fetch(`/api/admin/blog/${editingPost.value.id}`, {
        method: 'PATCH',
        body,
        headers: { Cookie: document.cookie },
      })
    } else {
      await $fetch('/api/admin/blog', {
        method: 'POST',
        body,
        headers: { Cookie: document.cookie },
      })
    }

    showEditor.value = false
    editingPost.value = null
    resetForm()
    await loadPosts()
  } catch (err: any) {
    alert(err?.data?.statusMessage || 'Save failed')
  } finally {
    saving.value = false
  }
}

async function publishPost(id: string) {
  try {
    await $fetch(`/api/admin/blog/${id}`, {
      method: 'PATCH',
      body: { status: 'published' },
      headers: { Cookie: document.cookie },
    })
    await loadPosts()
  } catch (err: any) {
    alert(err?.data?.statusMessage || 'Publish failed')
  }
}

function resetForm() {
  form.slug = ''
  form.title = ''
  form.excerpt = ''
  form.content = ''
  form.tagsInput = ''
  form.status = 'draft'
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString()
  } catch {
    return dateStr
  }
}

onMounted(() => {
  loadPosts()
})
</script>
