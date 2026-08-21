<template>
  <div class="content-page">
    <div class="content-glow" />

    <section class="relative py-20 sm:py-28">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto">
          <span class="content-badge">Gallery</span>
          <h1 class="font-display text-4xl font-800 tracking-tight text-white sm:text-5xl mt-4">
            Community Creations
          </h1>
          <p class="mx-auto mt-4 max-w-xl text-lg text-ink-300">
            Explore amazing creations from our community. Get inspired and create your own.
          </p>
        </div>

        <!-- Filter -->
        <div class="mt-10 flex justify-center gap-2">
          <button
            v-for="f in filters"
            :key="f.id"
            class="h-9 rounded-full px-4 text-sm font-medium transition-colors"
            :class="filter === f.id
              ? 'bg-accent text-white'
              : 'bg-white/5 text-ink-300 hover:bg-white/10'"
            @click="filter = f.id"
          >
            {{ f.label }}
          </button>
        </div>

        <!-- Loading -->
        <div v-if="pending" class="mt-12 flex justify-center">
          <div class="animate-pulse text-ink-400">Loading gallery...</div>
        </div>

        <!-- Gallery Grid -->
        <div v-else class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="item in items"
            :key="item.id"
            class="gallery-item panel overflow-hidden group cursor-pointer"
            @click="openItem(item)"
          >
            <!-- Image -->
            <div v-if="item.type === 'image'" class="aspect-square overflow-hidden">
              <img
                v-if="item.imageUrl"
                :src="item.imageUrl"
                :alt="item.title"
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <!-- Music Cover -->
            <div v-else class="aspect-square overflow-hidden relative">
              <img
                v-if="item.coverUrl"
                :src="item.coverUrl"
                :alt="item.title"
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div
                v-else
                class="h-full w-full"
                :style="{ background: item.coverColor }"
              />
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="grid h-12 w-12 place-items-center rounded-full bg-black/40 backdrop-blur-sm">
                  <span class="i-ph-music-notes text-xl text-white" />
                </div>
              </div>
            </div>
            <!-- Info -->
            <div class="p-4">
              <h3 class="text-sm font-medium text-white truncate">{{ item.title }}</h3>
              <p class="mt-1 text-xs text-ink-400 truncate">{{ item.prompt }}</p>
              <div class="mt-2 flex items-center gap-2">
                <span class="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent-soft capitalize">
                  {{ item.type }}
                </span>
                <span class="text-[11px] text-ink-500">{{ formatDate(item.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-if="!pending && items.length === 0" class="mt-12 text-center">
          <p class="text-ink-400">No public creations yet. Be the first to share!</p>
          <NuxtLink to="/create" class="btn-primary mt-4 inline-flex">Create & Share</NuxtLink>
        </div>

        <!-- Load More -->
        <div v-if="pagination.hasMore && !pending" class="mt-10 flex justify-center">
          <button class="btn-secondary !h-10 !px-6" :disabled="loadingMore" @click="loadMore">
            {{ loadingMore ? 'Loading...' : 'Load More' }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const filter = ref<'all' | 'music' | 'image'>('all')
const page = ref(1)
const loadingMore = ref(false)

const filters = [
  { id: 'all' as const, label: 'All' },
  { id: 'music' as const, label: 'Music' },
  { id: 'image' as const, label: 'Images' },
]

const { data, pending, refresh } = await useFetch('/api/gallery', {
  query: { page: 1, limit: 12, type: 'all' },
  key: 'gallery-all-1',
})

const items = computed(() => data.value?.items || [])
const pagination = computed(() => data.value?.pagination || { hasMore: false })

async function loadMore() {
  loadingMore.value = true
  page.value++
  try {
    const newData = await $fetch('/api/gallery', {
      query: { page: page.value, limit: 12, type: filter.value },
    })
    if (newData.items) {
      items.value.push(...newData.items)
    }
  } catch {
    page.value--
  } finally {
    loadingMore.value = false
  }
}

function openItem(item: any) {
  if (item.type === 'music') {
    navigateTo(`/song/${item.id}`)
  } else {
    navigateTo(`/image?remix=${item.id}`)
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

watch(filter, () => {
  page.value = 1
  refresh()
})

useHead({
  title: 'Gallery — Community Creations | CraftAI',
  meta: [
    { name: 'description', content: 'Explore amazing AI-generated music and images from the CraftAI community. Get inspired and create your own.' },
    { property: 'og:title', content: 'Community Creations Gallery | CraftAI' },
    { property: 'og:description', content: 'Explore amazing AI-generated music and images from the CraftAI community.' },
    { property: 'og:type', content: 'website' },
  ],
  link: [{ rel: 'canonical', href: 'https://creator.yozzytools.com/gallery' }],
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
