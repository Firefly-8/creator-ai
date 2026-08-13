<template>
  <div class="song-rail">
    <div v-if="pending" class="space-y-2.5">
      <div v-for="n in 5" :key="n" class="h-[4.5rem] animate-pulse rounded-2xl bg-white/[0.04]" />
    </div>

    <div v-else-if="!songs.length" class="px-2 py-10 text-center">
      <div class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent-mute text-accent-soft">
        <span class="i-ph-music-notes text-[22px]" />
      </div>
      <p class="text-[13.5px] text-ink-300">{{  emptyTitle  }}</p>
      <p class="mt-1 text-[12px] text-ink-500">{{  emptyHint  }}</p>
    </div>

    <div v-else class="space-y-2">
      <article
        v-for="song in songs"
        :key="song.id"
        class="song-rail__item"
        :class="{ 'is-active': activeId === song.id }"
      >
        <button
          class="song-rail__cover"
          type="button"
          :disabled="song.status !== 'ready'"
          :aria-label="`Play ${song.title}`"
          @click="play(song)"
        >
          <img
            v-if="song.coverUrl"
            :src="song.coverUrl"
            :alt="song.title"
            class="h-full w-full object-cover"
          >
          <div
            v-else
            class="h-full w-full"
            :style="{ background: song.coverColor }"
          />
          <span
            v-if="song.status === 'ready'"
            class="song-rail__play"
          >
            <span class="i-ph-play-fill text-[12px]" />
          </span>
        </button>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <NuxtLink
              :to="`/song/${song.id}`"
              class="truncate text-[13.5px] font-650 text-white hover:text-accent-soft"
            >
              {{  song.title  }}
            </NuxtLink>
            <span
              class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              :class="statusClass(song.status)"
            >
              {{  statusLabel(song.status)  }}
            </span>
          </div>
          <p class="mt-0.5 truncate text-[11.5px] text-ink-400">
            {{  song.type  }} · {{  formatDuration(song.durationMs)  }}
          </p>
          <p class="mt-1 line-clamp-1 text-[11.5px] text-ink-500">
            {{  song.prompt || 'No prompt'  }}
          </p>
        </div>

        <UiMoreMenu
          class="song-rail__more"
          :items="menuItems(song)"
          :disabled="busyId === song.id"
          @select="(id) => onMenu(id, song)"
        />
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDuration, type SongPublic } from '~/utils/types'
import type { MoreMenuItem } from '~/components/ui/UiMoreMenu.vue'

const props = withDefaults(
  defineProps<{
    songs: SongPublic[]
    pending?: boolean
    activeId?: string | null
    busyId?: string | null
    /** When false, hide "调整参数" (e.g. wrong studio page) */
    allowRemix?: boolean
    emptyTitle?: string
    emptyHint?: string
  }>(),
  {
    pending: false,
    activeId: null,
    busyId: null,
    allowRemix: true,
    emptyTitle: '暂无作品',
    emptyHint: '生成后会显示在这里',
  },
)

const emit = defineEmits<{
  remix: [song: SongPublic]
  regenerate: [song: SongPublic]
  download: [song: SongPublic]
  delete: [song: SongPublic]
  open: [song: SongPublic]
}>()

const player = usePlayerStore()

function play(song: SongPublic) {
  player.playSong(song, props.songs)
}

function isTerminal(song: SongPublic) {
  return song.status === 'ready' || song.status === 'failed'
}

function menuItems(song: SongPublic): MoreMenuItem[] {
  const ready = song.status === 'ready'
  const items: MoreMenuItem[] = []

  if (props.allowRemix && isTerminal(song)) {
    items.push({
      id: 'remix',
      label: '调整参数',
      icon: 'i-ph-pencil-simple',
    })
  }
  if (isTerminal(song)) {
    items.push({
      id: 'regenerate',
      label: '重新生成',
      icon: 'i-ph-arrows-clockwise',
      disabled: props.busyId === song.id,
    })
  }
  items.push({
    id: 'download',
    label: '下载',
    icon: 'i-ph-download-simple',
    disabled: !ready || !song.downloadUrl,
  })
  items.push({
    id: 'open',
    label: '查看详情',
    icon: 'i-ph-eye',
  })
  items.push({
    id: 'delete',
    label: '删除',
    icon: 'i-ph-trash',
    danger: true,
    dividerBefore: true,
    disabled: song.status === 'generating',
  })
  return items
}

function onMenu(id: string, song: SongPublic) {
  if (id === 'remix') emit('remix', song)
  else if (id === 'regenerate') emit('regenerate', song)
  else if (id === 'download') emit('download', song)
  else if (id === 'delete') emit('delete', song)
  else if (id === 'open') emit('open', song)
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

<style scoped>
.song-rail__item {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.65rem;
  border-radius: 1rem;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.02);
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.song-rail__item:hover,
.song-rail__item.is-active {
  border-color: rgba(139, 124, 255, 0.28);
  background: rgba(139, 124, 255, 0.08);
}

.song-rail__cover {
  position: relative;
  overflow: hidden;
  width: 3.25rem;
  height: 3.25rem;
  flex-shrink: 0;
  border: 0;
  border-radius: 0.75rem;
  padding: 0;
  cursor: pointer;
  background: #100e18;
}

.song-rail__cover:disabled {
  cursor: default;
  opacity: 0.75;
}

.song-rail__play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(10, 9, 16, 0.45);
  color: #fff;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.song-rail__cover:not(:disabled):hover .song-rail__play {
  opacity: 1;
}
</style>
