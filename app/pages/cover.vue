<template>
  <StudioWorkspace>
    <template #header>
      <div>
        <h1 class="font-display text-2xl font-700 text-white md:text-3xl">Cover</h1>
        <p class="mt-1 text-[13.5px] text-ink-300">上传参考音频，快速翻唱或进阶改词。</p>
      </div>
    </template>

    <template #ops>
      <div class="space-y-4">
        <div v-if="remixFrom" class="ui-ops-banner">
          <div>
            <p class="ui-ops-banner__title">已载入「{{ remixFrom }}」</p>
            <p class="ui-ops-banner__hint">
              可改风格 / 歌词。参考音频需重新上传（若本地上传仍可用会自动带上）。
            </p>
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
        <label class="block space-y-2">
          <span class="field-label">Reference audio</span>
          <input
            class="field"
            type="file"
            accept="audio/*,.mp3,.wav,.flac,.m4a"
            @change="onFile"
          >
          <p class="field-hint">6 seconds – 6 minutes · max 50MB</p>
          <p v-if="uploadName" class="text-[13px] font-medium text-accent-soft">
            <span class="i-ph-check-circle-fill mr-1 text-[14px]" />
            {{ uploadName }}
          </p>
        </label>

        <label class="block space-y-2">
          <span class="field-label">Cover style prompt</span>
          <textarea
            v-model="prompt"
            class="field min-h-24"
            placeholder="Jazz, smooth, late night lounge, saxophone…"
          />
        </label>

        <label class="block space-y-2">
          <span class="field-label">Title</span>
          <input v-model="title" class="field" placeholder="Cover title" >
        </label>

        <div v-if="mode === 'advanced'" class="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <UiButton
            variant="secondary"
            size="sm"
            :loading="preprocessing"
            :disabled="!uploadId"
            @click="runPreprocess"
          >
            <span class="i-ph-scan text-[14px]" />
            Extract lyrics
          </UiButton>
          <label class="block space-y-2">
            <span class="field-label">Edit lyrics</span>
            <textarea v-model="lyrics" class="field lyric-editor !min-h-40" placeholder="Run extract first…" />
          </label>
          <p v-if="featureId" class="field-hint">Feature ready · valid ~24h</p>
          <div v-if="structurePreview.length" class="rounded-xl border border-white/10 bg-ink-950/50 p-3">
            <p class="text-[11px] font-semibold tracking-[0.14em] text-ink-400 uppercase">Structure</p>
            <ul class="mt-2 space-y-1 text-[12.5px] text-ink-200">
              <li v-for="(seg, i) in structurePreview" :key="i" class="flex justify-between gap-3">
                <span class="font-medium text-accent-soft">{{ seg.label }}</span>
                <span class="tabular-nums text-ink-400">{{ seg.start.toFixed(1) }}s – {{ seg.end.toFixed(1) }}s</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
          <UiButton
            variant="generate"
            :loading="submitting || isGenerating"
            :disabled="isGenerating"
            @click="submit"
          >
            <span class="i-ph-arrows-clockwise text-[15px]" />
            {{
              isGenerating
                ? 'Generating…'
                : mode === 'quick'
                  ? 'Generate cover'
                  : 'Generate with lyrics'
            }}
          </UiButton>
          <span v-if="errorText" class="status-pill !border-danger/30 !text-danger">{{ errorText }}</span>
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
        <p class="text-[12px] text-ink-400">翻唱进度与曲库</p>
      </div>
      <UiRefreshButton :loading="songsPending" @click="refreshSongs" />
    </template>

    <template #results>
      <div class="space-y-3">
        <GenerationStage
          v-if="isGenerating"
          :title="activeSong?.title || title || 'Restyling your track'"
          :status="job?.progress || statusText || 'Generating…'"
          :phase="job?.status || 'generating'"
        />
        <SongResultRail
          :songs="coverSongs"
          :pending="songsPending"
          :active-id="activeSong?.id"
          :busy-id="busyId"
          empty-title="还没有翻唱作品"
          empty-hint="生成 cover 后会出现在这里"
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
import type { SongPublic } from '~/utils/types'

definePageMeta({ layout: 'default' })

const mode = ref<'quick' | 'advanced'>('quick')
const modes = [
  { value: 'quick' as const, label: 'Quick', icon: 'i-ph-lightning' },
  { value: 'advanced' as const, label: 'Advanced', icon: 'i-ph-sliders-horizontal' },
]

const title = ref('')
const prompt = ref('')
const lyrics = ref('')
const uploadId = ref<string | null>(null)
const uploadName = ref('')
const featureId = ref<string | null>(null)
const structurePreview = ref<{ label: string; start: number; end: number }[]>([])
const preprocessing = ref(false)
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

const { data: songsData, pending: songsPending, refresh: refreshSongs } = await useFetch<{ songs: SongPublic[] }>('/api/songs', {
  key: 'library-songs',
})
const coverSongs = computed(() => (songsData.value?.songs || []).filter((s) => s.type === 'cover'))

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
      // ignore
    }
  }
  if (j.status === 'error') {
    errorText.value = j.errorMessage || 'Failed'
    activeSong.value = null
    refreshSongs().catch(() => {})
  }
  if (j.status === 'done' && j.type !== 'cover_preprocess') {
    await refreshSongs().catch(() => {})
    const id = j.songId || activeSong.value?.id
    if (id) navigateTo(`/song/${id}`)
  }
})

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  errorText.value = ''
  featureId.value = null
  lyrics.value = ''
  structurePreview.value = []
  statusText.value = 'Uploading…'
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await $fetch<{ uploadId: string; filename: string }>('/api/upload', {
      method: 'POST',
      body: form,
    })
    uploadId.value = res.uploadId
    uploadName.value = res.filename
    statusText.value = 'Upload ready'
  } catch (err: any) {
    errorText.value = err?.data?.statusMessage || err?.message || 'Upload failed'
    statusText.value = ''
  }
}

async function runPreprocess() {
  if (!uploadId.value) return
  preprocessing.value = true
  errorText.value = ''
  statusText.value = 'Preprocessing…'
  try {
    const res = await $fetch<{ job: any }>('/api/cover/preprocess', {
      method: 'POST',
      body: { audio_upload_id: uploadId.value },
    })
    let done = res.job
    while (done.status !== 'done' && done.status !== 'error') {
      await new Promise((r) => setTimeout(r, 800))
      const poll = await $fetch<{ job: any }>(`/api/jobs/${res.job.id}`)
      done = poll.job
      statusText.value = done.progress
    }
    if (done.status === 'error') throw new Error(done.errorMessage || 'Preprocess failed')
    featureId.value = done.result?.cover_feature_id
    lyrics.value = done.result?.formatted_lyrics || ''
    try {
      const structure = JSON.parse(done.result?.structure_result || '{}')
      structurePreview.value = structure.segments || []
    } catch {
      structurePreview.value = []
    }
    statusText.value = 'Lyrics extracted — edit then generate'
  } catch (err: any) {
    errorText.value = err?.data?.statusMessage || err?.message || 'Preprocess failed'
  } finally {
    preprocessing.value = false
  }
}

async function submit() {
  if (!uploadId.value && mode.value === 'quick') {
    errorText.value = 'Upload a reference audio first'
    return
  }
  if (mode.value === 'advanced' && !featureId.value) {
    errorText.value = 'Run preprocess first'
    return
  }
  submitting.value = true
  errorText.value = ''
  activeSong.value = null
  try {
    const body: Record<string, unknown> = {
      title: title.value || 'Cover Track',
      prompt: prompt.value,
    }
    if (mode.value === 'advanced') {
      body.cover_feature_id = featureId.value
      body.lyrics = lyrics.value
    } else {
      body.audio_upload_id = uploadId.value
    }
    const res = await $fetch<{ job: any; song: SongPublic | null }>('/api/cover/generate', {
      method: 'POST',
      body,
    })
    jobId.value = res.job.id
    statusText.value = res.job.progress
    refreshSongs().catch(() => {})
  } catch (err: any) {
    errorText.value = err?.data?.statusMessage || err?.message || 'Cover failed'
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
  } catch (err: any) {
    errorText.value = err?.data?.statusMessage || err?.message || '重新生成失败'
    statusText.value = ''
  } finally {
    busyId.value = null
  }
}

function loadFromSong(song: SongPublic) {
  const payload = song.meta?.jobPayload || {}
  title.value = song.title || ''
  prompt.value = song.prompt || ''
  lyrics.value = song.lyrics || ''
  if (payload.cover_feature_id) {
    mode.value = 'advanced'
    featureId.value = String(payload.cover_feature_id)
  } else {
    mode.value = 'quick'
    featureId.value = null
  }
  if (payload.audio_upload_id) {
    uploadId.value = String(payload.audio_upload_id)
    uploadName.value = '已恢复参考音频（来自上次生成）'
  }
  remixFrom.value = song.title || '未命名'
  statusText.value = '已载入参数，可调整后生成'
  errorText.value = ''
}

function clearRemix() {
  remixFrom.value = null
}

function downloadSong(song: SongPublic) {
  if (!song.downloadUrl) return
  const a = document.createElement('a')
  a.href = song.downloadUrl
  a.download = `${song.title || 'cover'}.mp3`
  a.rel = 'noopener'
  a.click()
}

function openSong(song: SongPublic) {
  navigateTo(`/song/${song.id}`)
}

async function removeSong(song: SongPublic) {
  if (!confirm(`删除「${song.title}」？此操作不可恢复。`)) return
  busyId.value = song.id
  try {
    await $fetch(`/api/songs/${song.id}`, { method: 'DELETE' })
    if (activeSong.value?.id === song.id) activeSong.value = null
    await refreshSongs()
  } catch (err: any) {
    errorText.value = err?.data?.statusMessage || err?.message || '删除失败'
  } finally {
    busyId.value = null
  }
}

async function hydrateRemixFromQuery() {
  const id = typeof route.query.remix === 'string' ? route.query.remix : ''
  if (!id) return
  try {
    const res = await $fetch<{ song: SongPublic }>(`/api/songs/${id}`)
    if (res.song.type !== 'cover') {
      await navigateTo(`/create?remix=${id}`)
      return
    }
    loadFromSong(res.song)
    router.replace({ query: {} })
  } catch {
    // ignore
  }
}

onMounted(() => {
  hydrateRemixFromQuery()
})
</script>
