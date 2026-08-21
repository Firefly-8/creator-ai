<template>
  <div class="content-page">
    <div class="content-glow" />

    <section class="relative py-20 sm:py-28">
      <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <span class="content-badge">Blog</span>
          <h1 class="font-display text-4xl font-800 tracking-tight text-white sm:text-5xl mt-4">
            CraftAI Blog
          </h1>
          <p class="mx-auto mt-4 max-w-xl text-lg text-ink-300">
            Tips, tutorials, and updates on AI music and image generation.
          </p>
        </div>

        <!-- 加载状态 -->
        <div v-if="pending" class="mt-14 flex justify-center">
          <div class="animate-pulse text-ink-400">Loading articles...</div>
        </div>

        <!-- 文章列表 -->
        <div v-else class="mt-14 space-y-5">
          <article
            v-for="post in posts"
            :key="post.id"
            class="panel p-7 transition duration-200 hover:border-white/[0.12]"
          >
            <NuxtLink :to="`/blog/${post.slug}`" class="block">
              <div class="flex flex-wrap items-center gap-2 mb-3">
                <span
                  v-for="tag in post.tags.slice(0, 3)"
                  :key="tag"
                  class="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-soft"
                >
                  {{ tag }}
                </span>
              </div>
              <h2 class="font-display text-xl font-600 text-white hover:text-accent-soft transition-colors">
                {{ post.title }}
              </h2>
              <p class="mt-2.5 text-[14px] leading-relaxed text-ink-300">
                {{ post.excerpt }}
              </p>
              <div class="mt-4 flex items-center gap-3 text-sm text-ink-400">
                <span>{{ post.authorName }}</span>
                <span class="text-ink-600">·</span>
                <span>{{ formatDate(post.publishedAt) }}</span>
                <span class="text-ink-600">·</span>
                <span>{{ post.readingMinutes }} min read</span>
              </div>
            </NuxtLink>
          </article>
        </div>

        <!-- 空状态 -->
        <div v-if="!pending && posts.length === 0" class="mt-14 text-center">
          <p class="text-ink-400">No articles yet. Check back soon!</p>
        </div>

        <!-- 分页 -->
        <div v-if="pagination.totalPages > 1" class="mt-10 flex justify-center gap-2">
          <button
            v-for="p in pagination.totalPages"
            :key="p"
            class="h-9 w-9 rounded-lg text-sm font-medium transition-colors"
            :class="p === pagination.page
              ? 'bg-accent text-white'
              : 'bg-white/5 text-ink-300 hover:bg-white/10'"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const page = ref(1)
const limit = 10

const { data, pending } = await useFetch('/api/blog', {
  query: { page, limit },
  key: `blog-list-${page.value}`,
})

const posts = computed(() => data.value?.posts || [])
const pagination = computed(() => data.value?.pagination || { page: 1, totalPages: 0, total: 0 })

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function goToPage(p: number) {
  page.value = p
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

useHead({
  title: 'Blog — CraftAI AI Music & Image Tips',
  meta: [
    { name: 'description', content: 'Learn about AI music generation, image prompt engineering, and content marketing tips. Tutorials and guides from the CraftAI team.' },
    { property: 'og:title', content: 'CraftAI Blog' },
    { property: 'og:description', content: 'AI music, image generation tips, and tutorials.' },
    { property: 'og:type', content: 'blog' },
  ],
  link: [{ rel: 'canonical', href: 'https://creator.yozzytools.com/blog' }],
})
</script>

<style scoped>
.content-page {
  position: relative;
}

.content-glow {
  pointer-events: none;
  position: absolute;
  inset: -5% -10% auto -10%;
  height: 40%;
  background: radial-gradient(ellipse at 50% 0%, rgba(139, 124, 255, 0.1), transparent 60%);
  z-index: 0;
}

.content-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(139, 124, 255, 0.2);
  background: rgba(139, 124, 255, 0.08);
  color: var(--accent-soft);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}
</style>
