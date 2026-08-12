<template>
  <StudioWorkspace>
    <template #header>
      <div>
        <h1 class="font-display text-2xl font-700 text-white md:text-3xl">Create</h1>
        <p class="mt-1 text-[13.5px] text-ink-300">描述风格、写好歌词，生成完整歌曲。</p>
      </div>
    </template>

    <template #ops>
      <div class="space-y-4">
        <div v-if="remixFrom" class="ui-ops-banner">
          <div>
            <p class="ui-ops-banner__title">已载入「{{ remixFrom }}」</p>
            <p class="ui-ops-banner__hint">修改风格 / 歌词等细节后，点击生成新版本（原作品保留）。</p>
          </div>
          <UiIconButton
            icon="i-ph-x"
            variant="ghost"
            size="sm"
            aria-label="清除载入"
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
            placeholder="例：忧郁独立流行，柔和钢琴与远处电吉他延音，亲密人声，约 72 BPM…"
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
              {{ lyricsLoading ? '歌词生成中…' : 'Generate lyrics' }}
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
            :placeholder="lyricsLoading ? '歌词生成中，请稍候…' : '[Verse]\nYour lines here…\n\n[Chorus]\n…'"
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
            {{
              lyricsLoading
                ? '歌词生成中…'
                : isGenerating
                  ? 'Generating…'
                  : 'Generate song'
            }}
          </UiButton>
          <span v-if="errorText" class="status-pill !border-danger/30 !text-danger">{{ errorText }}</span>
          <span v-else-if="lyricsLoading" class="status-pill">
            <span class="i-ph-circle-fill text-[8px] text-accent-soft animate-pulse" />
            歌词生成中…
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
        <p class="text-[12px] text-ink-400">制作中与曲库作品</p>
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
          empty-title="还没有歌曲"
          empty-hint="在左侧生成后，作品会出现在这里"
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
import { LYRIC_TAGS, type SongPublic } from '~/utils/types'
import { SONG_PRESETS, type SongPreset } from '~/utils/presets'

definePageMeta({ layout: 'default' })

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
    statusText.value = `已套用预设：${preset.label}`
    return
  }

  mode.value = 'custom'
  lyrics.value = ''
  statusText.value = `已套用预设：${preset.label}，正在按官方流程生成歌词…`
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
    statusText.value = `预设就绪：${preset.label}，歌词已生成，可直接 Generate`
  } catch (e: any) {
    if (reqId !== presetRequestId) return
    errorText.value = e?.data?.statusMessage || e?.message || '预设歌词生成失败'
    statusText.value = `已套用编曲描述：${preset.label}（歌词未生成，可手动点 Generate lyrics）`
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
        prompt: lyricsHint.value || prompt.value || '一首有画面感的现代中文流行歌',
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
    errorText.value = e?.data?.statusMessage || e?.message || 'Lyrics generation failed'
  } finally {
    lyricsLoading.value = false
  }
}

async function submit() {
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
    errorText.value = e?.data?.statusMessage || e?.message || 'Failed to start generation'
    statusText.value = ''
  } finally {
    submitting.value = false
  }
}

async function regenerate(song: SongPublic) {
  busyId.value = song.id
  errorText.value = ''
  statusText.value = '重新生成中…'
  activeSong.value = null
  try {
    const res = await $fetch<{ job: any }>(`/api/songs/${song.id}/regenerate`, {
      method: 'POST',
    })
    jobId.value = res.job.id
    statusText.value = res.job.progress
    refreshSongs().catch(() => {})
  } catch (e: any) {
    errorText.value = e?.data?.statusMessage || e?.message || '重新生成失败'
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
  remixFrom.value = song.title || '未命名'
  statusText.value = '已载入参数，可调整后生成'
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
  if (!confirm(`删除「${song.title}」？此操作不可恢复。`)) return
  busyId.value = song.id
  errorText.value = ''
  try {
    await $fetch(`/api/songs/${song.id}`, { method: 'DELETE' })
    if (activeSong.value?.id === song.id) activeSong.value = null
    if (remixFrom.value && song.title === remixFrom.value) clearRemix()
    await refreshSongs()
  } catch (e: any) {
    errorText.value = e?.data?.statusMessage || e?.message || '删除失败'
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
