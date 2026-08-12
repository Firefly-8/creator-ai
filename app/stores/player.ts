import { defineStore } from 'pinia'
import type { SongPublic } from '~/utils/types'

export const usePlayerStore = defineStore('player', () => {
  const current = ref<SongPublic | null>(null)
  const queue = ref<SongPublic[]>([])
  const playing = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const audioEl = ref<HTMLAudioElement | null>(null)

  function bindAudio(el: HTMLAudioElement | null) {
    audioEl.value = el
  }

  function playSong(song: SongPublic, list?: SongPublic[]) {
    if (!song.audioUrl) return
    if (list) queue.value = list.filter((s) => s.audioUrl)
    current.value = song
    playing.value = true
    nextTick(() => {
      const el = audioEl.value
      if (!el) return
      if (el.src !== song.audioUrl && !el.src.endsWith(song.audioUrl!)) {
        el.src = song.audioUrl!
        el.load()
      }
      el.play().catch(() => {
        playing.value = false
      })
    })
  }

  function toggle() {
    const el = audioEl.value
    if (!el || !current.value) return
    if (el.paused) {
      el.play()
      playing.value = true
    } else {
      el.pause()
      playing.value = false
    }
  }

  function seek(t: number) {
    const el = audioEl.value
    if (!el) return
    el.currentTime = t
    currentTime.value = t
  }

  function next() {
    if (!current.value || !queue.value.length) return
    const idx = queue.value.findIndex((s) => s.id === current.value!.id)
    const nextSong = queue.value[(idx + 1) % queue.value.length]
    if (nextSong) playSong(nextSong)
  }

  function prev() {
    if (!current.value || !queue.value.length) return
    const idx = queue.value.findIndex((s) => s.id === current.value!.id)
    const prevSong = queue.value[(idx - 1 + queue.value.length) % queue.value.length]
    if (prevSong) playSong(prevSong)
  }

  return {
    current,
    queue,
    playing,
    currentTime,
    duration,
    audioEl,
    bindAudio,
    playSong,
    toggle,
    seek,
    next,
    prev,
  }
})
