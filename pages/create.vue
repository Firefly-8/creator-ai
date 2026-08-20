<template>
  <StudioWorkspace>
    <template #header>
      <div>
        <h1 class="font-display text-2xl font-700 text-white md:text-3xl">Create</h1>
        <p class="mt-1 text-[13.5px] text-ink-300">Describe the style, write lyrics, and generate a complete song.</p>
      </div>
    </template>

    <template #ops>
      <div class="space-y-4">
        <div v-if="remixFrom" class="ui-ops-banner">
          <div>
            <p class="ui-ops-banner__title">{{ $t('create.remixedFrom', { title: remixFrom }) }}</p>
            <p class="ui-ops-banner__hint">{{ $t('create.remixHint') }}</p>
          </div>
          <UiIconButton
            icon="i-ph-x"
            variant="ghost"
            size="sm"
            aria-label="Clear"
            @click="clearRemix"
          />
        </div>
        <UiSegmented v-model="mode" :options="modes" equal />
        <PresetMarquee :active-id="activePresetId" @select="applyPreset" />

        <label class="block space-y-2">
          <span class="field-label">Title</span>
          <input v-model="title" class="field" placeholder="Optional title" >
        </label>

        <label class="block space-y-2">
          <span class="field-label">Style prompt</span>
          <textarea
            v-model="prompt"
            class="field min-h-24"
            placeholder="e.g. melancholic indie pop, soft piano with distant electric guitar reverb, intimate vocals, around 72 BPM…"
          />
        </label>

        <div v-if="mode !== 'instrumental'" class="space-y-2.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="field-label">
              Lyrics
              <span v-if="mode === 'simple'" class="font-normal text-ink-400"> · optional</span>
            </span>
            <UiButton
              variant="secondary"
              size="sm"
              :loading="lyricsLoading"
              :disabled="lyricsLoading || isGenerating"
              @click="genLyrics"
            >
              <span class="i-ph-magic-wand text-[14px]" />
{{ lyricsLoading ? $t('create.lyricsGenerating') : $t('create.generateLyrics') }}
            </UiButton>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="tag in LYRIC_TAGS"
              :key="tag"
              type="button"
              class="chip"
              :disabled="lyricsLoading || isGenerating"
              @click="insertTag(tag)"
            >
              {{ tag }}
            </button>
          </div>
          <textarea
            ref="lyricsEl"
            v-model="lyrics"
            class="field lyric-editor !min-h-44"
            :disabled="lyricsLoading"
            :placeholder="lyricsLoading ? $t('create.lyricsWait') : '[Verse]\nYour lines here…\n\n[Chorus]\n…'"
          />
        </div>

        <div class="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
          <UiButton
            variant="generate"
            :loading="lyricsLoading || submitting || isGenerating"
            :disabled="lyricsLoading || isGenerating"
            @click="submit"
          >
            <span class="i-ph-waveform text-[16px]" />
            {{ lyricsLoading ? $t('create.lyricsGenerating') : (isGenerating ? 'Generating\u2026' : 'Generate song') }}

          </UiButton>
          <span v-if="errorText" class="status-pill !border-danger/30 !text-danger">{{ errorText }}</span>
          <span v-else-if="lyricsLoading" class="status-pill">
            <span class="i-ph-circle-fill text-[8px] text-accent-soft animate-pulse" />
            Generating lyrics…
          </span>
          <span v-else-if="statusText && !isGenerating" class="status-pill">
            <span class="i-ph-circle-fill text-[8px] text-accent-soft" />
            {{ statusText }}
          </span>
        </div>
      </div>
    </template>

    <template #results-header>
      <div>
        <h2 class="font-display text-[16px] font-650 text-white">Results</h2>
        <p class="text-[12px] text-ink-400">{{ $t('create.resultsHint') }}</p>
      </div>
      <UiRefreshButton :loading="songsPending" @click="refreshSongs" />
    </template>

    <template #results>
      <div class="space-y-3">
        <GenerationStage
          v-if="isGenerating"
          :title="activeSong?.title || title || 'Composing your track'"
          :status="job?.progress || statusText || 'Generating…'"
          :phase="job?.status || 'generating'"
        />
        <SongResultRail
          :songs="songs"
          :pending="songsPending"
          :active-id="activeSong?.id"
          :busy-id="busyId"
          empty-title="{{ $t('create.noSongs') }}"
          empty-hint="{{ $t('create.noSongsHint') }}"
          @remix="loadFromSong"
          @regenerate="regenerate"
          @download="downloadSong"
          @delete="removeSong"
          @open="openSong"
        />
      </div>
    </template>
  </StudioWorkspace>
</template>

<script setup lang="ts">
const { t } = useI18n()
import { LYRIC_TAGS, type SongPublic } from '~/utils/types'
import { SONG_PRESETS, type SongPreset } from '~/utils/presets'

definePageMeta({ layout: "default", middleware: ["auth"] })

const mode = ref<'custom' | 'simple' | 'instrumental'>('custom')
const modes = [
  { value: 'custom' as const, label: 'Custom', icon: 'i-ph-pencil-simple' },
  { value: 'simple' as const, label: 'Simple', icon: 'i-ph-sparkle' },
  { value: 'instrumental' as const, label: 'Instrumental', icon: 'i-ph-piano-keys' },
]

const title = ref('')
const prompt = ref('')
const lyrics = ref('')
const lyricsHint = ref('')
const activePresetId = ref<string | null>(null)
const lyricsEl = ref<HTMLTextAreaElement | null>(null)
const lyricsLoading = ref(false)
const submitting = ref(false)
const busyId = ref<string | null>(null)
const remixFrom = ref<string | null>(null)
const errorText = ref('')
const statusText = ref('')
const activeSong = ref<SongPublic | null>(null)
const jobId = ref<string | null>(null)
const { job } = useJobStream(jobId)
const route = useRoute()
const router = useRouter()
let presetRequestId = 0

const { data: songsData, pending: songsPending, refresh: refreshSongs } = await useFetch<{ songs: SongPublic[] }>('/api/songs', {
  key: 'library-songs',
})
const songs = computed(() => songsData.value?.songs || [])

const isGenerating = computed(() => {
  if (submitting.value) return true
  const s = job.value?.status
  return s === 'queued' || s === 'generating' || s === 'downloading'
})

watch(job, async (j) => {
  if (!j) return
  statusText.value = j.progress
  if (j.songId && activeSong.value?.id !== j.songId) {
    try {
      const res = await $fetch<{ song: SongPublic }>(`/api/songs/${j.songId}`)
      activeSong.value = res.song
      refreshSongs().catch(() => {})
    } catch {
      // ignore transient miss
    }
  }
  if (j.status === 'error') {
    errorText.value = j.errorMessage || 'Generation failed'
    activeSong.value = null
    refreshSongs().catch(() => {})
  }
  if (j.status === 'done') {
    statusText.value = 'Ready'
    await refreshSongs().catch(() => {})
    const id = j.songId || activeSong.value?.id
    if (id) navigateTo(`/song/${id}`)
  }
})

function applyPreset(preset: SongPreset) {
  activePresetId.value = preset.id
  prompt.value = preset.prompt
  if (preset.title) title.value = preset.title
  lyricsHint.value = preset.lyricsHint || ''
  errorText.value = ''

  if (preset.mode === 'instrumental') {
    mode.value = 'instrumental'
    lyrics.value = ''
    statusText.value = `Preset applied: ${preset.label}`
    return
  }

  mode.value = 'custom'
  lyrics.value = ''
  statusText.value = `Preset applied: ${preset.label}, generating lyrics…`
  void preparePresetLyrics(preset)
}

async function preparePresetLyrics(preset: SongPreset) {
  const reqId = ++presetRequestId
  lyricsLoading.value = true
  try {
    const res = await $fetch<{ title: string; styleTags: string; lyrics: string }>('/api/lyrics', {
      method: 'POST',
      body: {
        mode: 'write_full_song',
        prompt: preset.lyricsHint || preset.prompt,
        title: preset.title || title.value || undefined,
      },
    })
    if (reqId !== presetRequestId) return
    if (res.title) title.value = res.title
    lyrics.value = res.lyrics
    mode.value = 'custom'
    statusText.value = `Preset ready: ${preset.label}, lyrics generated, ready to Generate`
  } catch (e: any) {
    if (reqId !== presetRequestId) return
    errorText.value = e?.data?.statusMessage || e?.message || 'Failed to generate preset lyrics'
    statusText.value = `Style applied: ${preset.label}(lyrics not generated, you can manually click Generate lyrics)`
  } finally {
    if (reqId === presetRequestId) lyricsLoading.value = false
  }
}

onMounted(() => {
  const presetId = typeof route.query.preset === 'string' ? route.query.preset : ''
  if (!presetId) return
  const found = SONG_PRESETS.find((p) => p.id === presetId)
  if (found) applyPreset(found)
})

function insertTag(tag: string) {
  const chunk = `\n[${tag}]\n`
  const el = lyricsEl.value
  if (!el) {
    lyrics.value += chunk
    return
  }
  const start = el.selectionStart
  const end = el.selectionEnd
  lyrics.value = lyrics.value.slice(0, start) + chunk + lyrics.value.slice(end)
  nextTick(() => {
    el.focus()
    const pos = start + chunk.length
    el.setSelectionRange(pos, pos)
  })
}

async function genLyrics() {
  lyricsLoading.value = true
  errorText.value = ''
  try {
    const res = await $fetch<{ title: string; styleTags: string; lyrics: string }>('/api/lyrics', {
      method: 'POST',
      body: {
        mode: lyrics.value.trim() ? 'edit' : 'write_full_song',
        prompt: lyricsHint.value || prompt.value || 'a vivid modern pop song',
        lyrics: lyrics.value || undefined,
        title: title.value || undefined,
      },
    })
    if (res.title && !title.value) title.value = res.title
    if (res.styleTags && !prompt.value.trim()) prompt.value = res.styleTags
    lyrics.value = res.lyrics
    if (mode.value === 'instrumental') mode.value = 'custom'
    else if (mode.value === 'simple') mode.value = 'custom'
  } catch (e: any) {
    errorText.value = e?.data?.statusMessage || e?.message || t('create.lyricsFailed')
  } finally {
    lyricsLoading.value = false
  }
}

async function submit() {
  if (!requireAuth()) return
  submitting.value = true
  errorText.value = ''
  statusText.value = 'Starting…'
  activeSong.value = null
  try {
    const res = await $fetch<{ job: any; song: SongPublic | null }>('/api/music/generate', {
      method: 'POST',
      body: {
        mode: mode.value,
        title: title.value,
        prompt: prompt.value,
        lyrics: lyrics.value,
      },
    })
    jobId.value = res.job.id
    statusText.value = res.job.progress
    refreshSongs().catch(() => {})
  } catch (e: any) {
    errorText.value = e?.data?.statusMessage || e?.message || t('create.generateFailed')
    statusText.value = ''
  } finally {
    submitting.value = false
  }
}

async function regenerate(song: SongPublic) {
  busyId.value = song.id
  errorText.value = ''
  statusText.value = t('create.regenerating')
  activeSong.value = null
  try {
    const res = await $fetch<{ job: any }>(`/api/songs/${song.id}/regenerate`, {
      method: 'POST',
    })
    jobId.value = res.job.id
    statusText.value = res.job.progress
    refreshSongs().catch(() => {})
  } catch (e: any) {
    errorText.value = e?.data?.statusMessage || e?.message || t('create.regenerateFailed')
    statusText.value = ''
  } finally {
    busyId.value = null
  }
}

function inferMode(song: SongPublic): 'custom' | 'simple' | 'instrumental' {
  const payload = song.meta?.jobPayload || {}
  if (payload.is_instrumental || (!song.lyrics?.trim() && song.type === 'generate')) return 'instrumental'
  if (payload.lyrics_optimizer && !song.lyrics?.trim()) return 'simple'
  return 'custom'
}

function loadFromSong(song: SongPublic) {
  title.value = song.title || ''
  prompt.value = song.prompt || ''
  lyrics.value = song.lyrics || ''
  mode.value = inferMode(song)
  activePresetId.value = null
  remixFrom.value = song.title || t('create.unnamed')
  statusText.value = t('create.loadedParams')
  errorText.value = ''
  // Scroll ops into view on mobile
  if (import.meta.client) {
    document.querySelector('.workspace__ops')?.scrollTo?.({ top: 0, behavior: 'smooth' })
  }
}

function clearRemix() {
  remixFrom.value = null
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
  if (!confirm(`${t('create.deleteConfirm', { title: song.title })}`)) return
  busyId.value = song.id
  errorText.value = ''
  try {
    await $fetch(`/api/songs/${song.id}`, { method: 'DELETE' })
    if (activeSong.value?.id === song.id) activeSong.value = null
    if (remixFrom.value && song.title === remixFrom.value) clearRemix()
    await refreshSongs()
  } catch (e: any) {
    errorText.value = e?.data?.statusMessage || e?.message || t('create.deleteFailed')
  } finally {
    busyId.value = null
  }
}

async function hydrateRemixFromQuery() {
  const id = typeof route.query.remix === 'string' ? route.query.remix : ''
  if (!id) return
  try {
    const res = await $fetch<{ song: SongPublic }>(`/api/songs/${id}`)
    if (res.song.type === 'cover') {
      await navigateTo(`/cover?remix=${id}`)
      return
    }
    loadFromSong(res.song)
    router.replace({ query: {} })
  } catch {
    // ignore missing
  }
}

onMounted(() => {
  hydrateRemixFromQuery()
})
</script>
