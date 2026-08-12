<template>
  <StudioWorkspace single>
    <template #header>
      <div>
        <h1 class="font-display text-2xl font-700 text-white md:text-3xl">Library</h1>
        <p class="mt-1 text-[13.5px] text-ink-300">全部生成曲目与翻唱作品。</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UiSegmented
          v-model="filter"
          size="sm"
          :options="filters.map((f) => ({ value: f.id, label: f.label }))"
        />
        <UiRefreshButton :loading="pending" @click="refresh" />
      </div>
    </template>

    <template #results-header>
      <div>
        <h2 class="font-display text-[16px] font-650 text-white">Tracks</h2>
        <p class="text-[12px] text-ink-400">{{ filtered.length }} items</p>
      </div>
      <div class="flex items-center gap-2">
        <p v-if="actionError" class="max-w-[14rem] truncate text-[12px] text-danger">{{ actionError }}</p>
        <NuxtLink to="/create" class="btn-secondary !h-8 !px-3 text-[12px]">Create</NuxtLink>
      </div>
    </template>

    <template #results>
      <SongResultRail
        :songs="filtered"
        :pending="pending"
        :busy-id="busyId"
        empty-title="曲库还是空的"
        empty-hint="去 Create 生成第一首歌"
        @remix="remixSong"
        @regenerate="regenerate"
        @download="downloadSong"
        @delete="removeSong"
        @open="openSong"
      />
    </template>
  </StudioWorkspace>
</template>

<script setup lang="ts">
import type { SongPublic } from '~/utils/types'

definePageMeta({ layout: 'default' })

const filter = ref<'all' | 'ready' | 'generating' | 'failed'>('all')
const filters = [
  { id: 'all' as const, label: 'All' },
  { id: 'ready' as const, label: 'Ready' },
  { id: 'generating' as const, label: '制作中' },
  { id: 'failed' as const, label: 'Failed' },
]

const busyId = ref<string | null>(null)
const actionError = ref('')

const { data, pending, refresh } = await useFetch<{ songs: SongPublic[] }>('/api/songs', {
  key: 'library-songs',
})

const filtered = computed(() => {
  const list = data.value?.songs || []
  if (filter.value === 'all') return list
  return list.filter((s) => s.status === filter.value)
})

function remixSong(song: SongPublic) {
  const path = song.type === 'cover' ? '/cover' : '/create'
  navigateTo(`${path}?remix=${song.id}`)
}

async function regenerate(song: SongPublic) {
  busyId.value = song.id
  actionError.value = ''
  try {
    await $fetch(`/api/songs/${song.id}/regenerate`, { method: 'POST' })
    await refresh()
  } catch (e: any) {
    actionError.value = e?.data?.statusMessage || e?.message || '重新生成失败'
  } finally {
    busyId.value = null
  }
}

function downloadSong(song: SongPublic) {
  if (!song.downloadUrl) return
  const a = document.createElement('a')
  a.href = song.downloadUrl
  a.download = `${song.title || 'track'}.mp3`
  a.rel = 'noopener'
  a.click()
}

function openSong(song: SongPublic) {
  navigateTo(`/song/${song.id}`)
}

async function removeSong(song: SongPublic) {
  if (!confirm(`删除「${song.title}」？此操作不可恢复。`)) return
  busyId.value = song.id
  actionError.value = ''
  try {
    await $fetch(`/api/songs/${song.id}`, { method: 'DELETE' })
    await refresh()
  } catch (e: any) {
    actionError.value = e?.data?.statusMessage || e?.message || '删除失败'
  } finally {
    busyId.value = null
  }
}
</script>
