<template>
  <div v-if="pending" class="space-y-4">
    <div class="flex gap-4">
      <div class="h-24 w-24 animate-pulse rounded-2xl bg-white/[0.05]" />
      <div class="flex-1 space-y-3 pt-2">
        <div class="h-7 w-1/2 animate-pulse rounded bg-white/[0.06]" />
        <div class="h-4 w-1/3 animate-pulse rounded bg-white/[0.04]" />
      </div>
    </div>
  </div>
  <div v-else-if="!song" class="panel p-10 text-center text-ink-300">Track not found.</div>
  <div v-else class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex gap-4">
        <div
          class="player-art relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl"
          :style="song.coverUrl ? undefined : { background: song.coverColor }"
        >
          <img
            v-if="song.coverUrl"
            :src="song.coverUrl"
            :alt="song.title"
            class="h-full w-full object-cover"
          >
        </div>
        <div class="min-w-0 pt-0.5">
          <p class="text-[11.5px] uppercase tracking-wide text-ink-400">{{  song.type  }} · {{  song.model  }}</p>
          <h1 class="font-display text-3xl font-700 text-white md:text-4xl">{{  song.title  }}</h1>
          <p class="mt-1.5 text-[14px] text-ink-300">
            {{  formatDuration(song.durationMs)  }}
            <span class="mx-1.5 text-ink-600">·</span>
            <span
              class="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase"
              :class="statusClass(song.status)"
            >{{  statusLabel(song.status)  }}</span>
          </p>
          <p v-if="song.errorMessage" class="mt-2 text-sm text-danger">{{  song.errorMessage  }}</p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <UiButton :disabled="song.status !== 'ready'" @click="play">
          <span class="i-ph-play-fill text-[15px]" />
          Play
        </UiButton>
        <a
          v-if="song.downloadUrl"
          class="btn-secondary"
          :href="song.downloadUrl"
        >
          <span class="i-ph-download-simple text-[15px]" />
          Download
        </a>
        <UiButton variant="secondary" @click="showEditor = !showEditor">
          <span class="i-ph-scissors text-[15px]" />
          {{  showEditor ? 'Hide editor' : 'Edit'  }}
        </UiButton>
        <UiButton variant="ghost" class="!text-danger hover:!bg-danger/10" @click="remove">
          Delete
        </UiButton>
      </div>
    </header>

    <section class="grid gap-4 lg:grid-cols-2">
      <div class="panel p-5">
        <h2 class="font-display text-[16px] font-600 text-white">Prompt</h2>
        <p class="mt-2.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-300">{{  song.prompt || '—'  }}</p>
      </div>
      <div class="panel p-5">
        <h2 class="font-display text-[16px] font-600 text-white">Lyrics</h2>
        <pre class="mt-2.5 whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-ink-300">{{  song.lyrics || '—'  }}</pre>
      </div>
    </section>

    <ClientOnly>
      <AudioEditor
        v-if="showEditor && song.audioUrl"
        :song-id="song.id"
        :audio-url="song.audioUrl"
        @saved="onSaved"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { formatDuration, type SongPublic } from '~/utils/types'

const AudioEditor = defineAsyncComponent(() => import('~/components/AudioEditor.vue'))

definePageMeta({ layout: 'default' })

const route = useRoute()
const id = computed(() => String(route.params.id))
const showEditor = ref(false)

const { data, pending, refresh } = await useFetch<{ song: SongPublic }>(() => `/api/songs/${id.value}`, {
  watch: [id],
})

const song = computed(() => data.value?.song || null)
const player = usePlayerStore()

function play() {
  if (song.value) player.playSong(song.value)
}

async function remove() {
  if (!confirm('Delete this track?')) return
  await $fetch(`/api/songs/${id.value}`, { method: 'DELETE' })
  navigateTo('/library')
}

function onSaved() {
  refresh()
}

function statusLabel(status: string) {
  if (status === 'generating') return '制作中'
  if (status === 'ready') return 'Ready'
  if (status === 'failed') return 'Failed'
  return status
}

function statusClass(status: string) {
  if (status === 'ready') return 'bg-emerald-500/20 text-emerald-300'
  if (status === 'generating') return 'bg-accent-mute text-accent-soft'
  if (status === 'failed') return 'bg-danger/15 text-danger'
  return 'bg-white/10 text-ink-200'
}
</script>
