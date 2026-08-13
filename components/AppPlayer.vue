<template>
  <div
    class="player-bar fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.06] bg-[#0b0a12]/94 backdrop-blur-2xl"
    style="height: var(--player-h)"
  >
    <audio
      ref="audioRef"
      preload="metadata"
      @timeupdate="onTime"
      @loadedmetadata="onMeta"
      @ended="onEnded"
      @play="player.playing = true"
      @pause="player.playing = false"
    />

    <div class="mx-auto grid h-full max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3 md:gap-4 md:px-6">
      <div class="flex min-w-0 items-center gap-3">
        <div
          class="player-art relative h-12 w-12 shrink-0 overflow-hidden rounded-xl md:h-[3.25rem] md:w-[3.25rem]"
          :class="player.current ? '' : 'cover-orb opacity-40'"
          :style="!player.current?.coverUrl && player.current?.coverColor ? { background: player.current.coverColor } : undefined"
        >
          <img
            v-if="player.current?.coverUrl"
            :src="player.current.coverUrl"
            :alt="player.current.title"
            class="h-full w-full object-cover"
          >
        </div>
        <div class="min-w-0">
          <p class="truncate text-[13.5px] font-semibold text-white">
            {{  player.current?.title || 'Nothing playing'  }}
          </p>
          <p class="truncate text-[11.5px] text-ink-400">
            {{  player.current ? formatDuration(player.current.durationMs) : 'Choose a track to start'  }}
          </p>
        </div>
      </div>

      <div class="flex w-[min(100vw-2rem,28rem)] flex-col items-center gap-0.5 md:w-[32rem]">
        <div class="flex items-center gap-1 md:gap-1.5">
          <button
            class="transport-btn"
            type="button"
            aria-label="Previous"
            :disabled="!player.current"
            @click="player.prev()"
          >
            <span class="i-ph-skip-back-fill text-[17px]" />
          </button>

          <button
            class="transport-play"
            type="button"
            :aria-label="player.playing ? 'Pause' : 'Play'"
            :disabled="!player.current"
            @click="player.toggle()"
          >
            <span
              class="text-[18px]"
              :class="player.playing ? 'i-ph-pause-fill' : 'i-ph-play-fill'"
            />
          </button>

          <button
            class="transport-btn"
            type="button"
            aria-label="Next"
            :disabled="!player.current"
            @click="player.next()"
          >
            <span class="i-ph-skip-forward-fill text-[17px]" />
          </button>
        </div>

        <div class="flex w-full items-center gap-2 px-1">
          <span class="w-10 shrink-0 text-right text-[11px] tabular-nums text-ink-400">
            {{  formatDuration(player.currentTime * 1000)  }}
          </span>
          <input
            class="seek"
            type="range"
            min="0"
            :max="seekMax"
            step="0.05"
            :value="player.currentTime"
            :disabled="!player.current || seekMax <= 0"
            :style="{ '--seek-progress': `${seekPercent}%` }"
            @input="onSeek"
          >
          <span class="w-10 shrink-0 text-[11px] tabular-nums text-ink-400">
            {{  formatDuration(player.duration * 1000)  }}
          </span>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2">
        <button
          class="volume-btn sm:hidden"
          type="button"
          :aria-label="muted || volume === 0 ? 'Unmute' : 'Mute'"
          @click="toggleMute"
        >
          <span class="text-[16px]" :class="volumeIcon" />
        </button>

        <div class="volume-control hidden sm:flex" :class="{ 'is-muted': muted }">
          <button
            class="volume-btn"
            type="button"
            :aria-label="muted || volume === 0 ? 'Unmute' : 'Mute'"
            @click="toggleMute"
          >
            <span
              class="text-[16px]"
              :class="volumeIcon"
            />
          </button>
          <input
            class="volume-seek"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="muted ? 0 : volume"
            :style="{ '--seek-progress': `${(muted ? 0 : volume) * 100}%` }"
            aria-label="Volume"
            @input="onVolume"
          >
        </div>

        <NuxtLink
          v-if="player.current"
          :to="`/song/${player.current.id}`"
          class="details-link"
        >
          Details
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDuration } from '~/utils/types'

const player = usePlayerStore()
const audioRef = ref<HTMLAudioElement | null>(null)
const volume = ref(0.85)
const muted = ref(false)
const lastVolume = ref(0.85)

const seekMax = computed(() => player.duration || 0)
const seekPercent = computed(() => {
  if (!seekMax.value) return 0
  return Math.min(100, Math.max(0, (player.currentTime / seekMax.value) * 100))
})

const volumeIcon = computed(() => {
  if (muted.value || volume.value === 0) return 'i-ph-speaker-slash'
  if (volume.value < 0.35) return 'i-ph-speaker-low'
  return 'i-ph-speaker-high'
})

onMounted(() => {
  player.bindAudio(audioRef.value)
  applyVolume()
})

watch(audioRef, (el) => {
  player.bindAudio(el)
  applyVolume()
})

function applyVolume() {
  if (!audioRef.value) return
  audioRef.value.volume = muted.value ? 0 : volume.value
}

function onTime() {
  if (!audioRef.value) return
  player.currentTime = audioRef.value.currentTime
}

function onMeta() {
  if (!audioRef.value) return
  player.duration = audioRef.value.duration || 0
}

function onEnded() {
  player.next()
}

function onSeek(e: Event) {
  const t = Number((e.target as HTMLInputElement).value)
  player.seek(t)
}

function onVolume(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  volume.value = v
  muted.value = v === 0
  if (v > 0) lastVolume.value = v
  applyVolume()
}

function toggleMute() {
  if (muted.value || volume.value === 0) {
    muted.value = false
    volume.value = lastVolume.value || 0.7
  } else {
    lastVolume.value = volume.value
    muted.value = true
  }
  applyVolume()
}
</script>

<style scoped>
.transport-btn {
  display: grid;
  place-items: center;
  width: 2.35rem;
  height: 2.35rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #c9c3dd;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease;
}

.transport-btn:hover:not(:disabled) {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.transport-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.transport-play {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  margin-inline: 0.15rem;
  border: 0;
  border-radius: 999px;
  background: #fff;
  color: #0a0910;
  cursor: pointer;
  box-shadow: 0 8px 20px -10px rgba(255, 255, 255, 0.45);
  transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.transport-play:hover:not(:disabled) {
  background: #b4a9ff;
  transform: scale(1.04);
  box-shadow: 0 10px 24px -10px rgba(139, 124, 255, 0.55);
}

.transport-play:active:not(:disabled) {
  transform: scale(0.96);
}

.transport-play:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.volume-control {
  align-items: center;
  gap: 0.35rem;
  min-width: 7.5rem;
  padding: 0.2rem 0.45rem 0.2rem 0.2rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.035);
}

.volume-btn {
  display: grid;
  place-items: center;
  width: 1.9rem;
  height: 1.9rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #c9c3dd;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.volume-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.volume-control.is-muted .volume-btn {
  color: #817b99;
}

.volume-seek {
  --seek-progress: 85%;
  -webkit-appearance: none;
  appearance: none;
  width: 4.75rem;
  height: 22px;
  margin: 0;
  background: transparent;
  cursor: pointer;
}

.volume-seek::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    #8b7cff 0%,
    #8b7cff var(--seek-progress),
    rgba(255, 255, 255, 0.14) var(--seek-progress),
    rgba(255, 255, 255, 0.14) 100%
  );
}

.volume-seek::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 10px;
  height: 10px;
  margin-top: -3.5px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(139, 124, 255, 0.25);
}

.volume-seek::-moz-range-track {
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
}

.volume-seek::-moz-range-progress {
  height: 3px;
  border-radius: 999px;
  background: #8b7cff;
}

.volume-seek::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border: none;
  border-radius: 50%;
  background: #fff;
}

.details-link {
  display: inline-flex;
  align-items: center;
  height: 2rem;
  padding: 0 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: #e6e2f4;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.details-link:hover {
  background: rgba(139, 124, 255, 0.12);
  border-color: rgba(139, 124, 255, 0.35);
}
</style>
