<template>
  <div class="py-8">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="font-display text-2xl font-700 text-white">My creations</h1>
          <p class="mt-1 text-ink-300">
            Every picture and song you have made, in one place. Download them again whenever you need.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UiSegmented v-model="tab" size="sm" :options="tabs" />
          <UiRefreshButton :loading="pending" @click="reload" />
        </div>
      </div>

      <!-- 未登录 -->
      <section v-if="!authReady" class="panel p-10 text-center">
        <p class="text-ink-400">Checking your account…</p>
      </section>

      <section v-else-if="!user" class="panel p-10 text-center">
        <div class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent-mute text-accent-soft">
          <span class="i-ph-images text-[22px]" />
        </div>
        <h2 class="font-display text-lg font-650 text-white">Your creations live here</h2>
        <p class="mx-auto mt-1 max-w-[40ch] text-[13.5px] text-ink-400">
          Log in to see every card, picture and song you have made — and download them again.
        </p>
        <div class="mt-5 flex flex-wrap justify-center gap-2">
          <button class="btn-primary" type="button" @click="openLogin">Log in</button>
          <button class="btn-secondary" type="button" @click="openSignup">Create a free account</button>
        </div>
      </section>

      <!-- 图片 -->
      <template v-else-if="tab === 'pictures'">
        <p v-if="pictures.length" class="mb-3 text-[12px] text-ink-400">
          {{ pictures.length }} picture{{ pictures.length === 1 ? '' : 's' }}
        </p>

        <section v-if="!pictures.length" class="panel p-10 text-center">
          <div class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent-mute text-accent-soft">
            <span class="i-ph-image text-[22px]" />
          </div>
          <h2 class="font-display text-lg font-650 text-white">No pictures yet</h2>
          <p class="mx-auto mt-1 max-w-[42ch] text-[13.5px] text-ink-400">
            Make a card for someone you love, or try the AI image studio. Whatever you make shows up here.
          </p>
          <div class="mt-5 flex flex-wrap justify-center gap-2">
            <NuxtLink to="/cards" class="btn-primary">Make a card</NuxtLink>
            <NuxtLink to="/image" class="btn-secondary">AI image studio</NuxtLink>
          </div>
        </section>

        <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article v-for="im in pictures" :key="im.id" class="panel overflow-hidden">
            <NuxtLink :to="`/cards?from=${im.id}`" class="block aspect-[3/4] bg-white/[0.04]">
              <img
                v-if="im.imageUrl"
                :src="im.imageUrl"
                :alt="pictureTitle(im)"
                class="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              >
              <div
                v-else
                class="grid h-full w-full place-items-center p-3 text-center text-[12px] text-ink-500"
              >
                {{ im.errorMessage || 'This picture could not be made' }}
              </div>
            </NuxtLink>

            <div class="p-3">
              <p class="truncate text-[13.5px] font-650 text-white">{{ pictureTitle(im) }}</p>
              <p class="mt-0.5 text-[12px] text-ink-400">{{ formatDate(im.createdAt) }}</p>

              <div class="mt-2 flex items-center gap-1">
                <a
                  v-if="im.imageUrl"
                  :href="im.imageUrl"
                  :download="`card-${im.id}.png`"
                  class="rounded-lg px-2 py-1 text-[12px] font-600 text-ink-300 hover:bg-white/[0.06] hover:text-white"
                >
                  <span class="i-ph-download-simple" /> Download
                </a>
                <NuxtLink
                  :to="`/cards?from=${im.id}`"
                  class="rounded-lg px-2 py-1 text-[12px] font-600 text-ink-300 hover:bg-white/[0.06] hover:text-white"
                >
                  <span class="i-ph-magic-wand" /> Remix
                </NuxtLink>
                <button
                  class="ml-auto rounded-lg px-2 py-1 text-[12px] font-600 text-ink-500 hover:bg-white/[0.06] hover:text-danger"
                  type="button"
                  @click="removePicture(im)"
                >
                  <span class="i-ph-trash" /> Delete
                </button>
              </div>
            </div>
          </article>
        </div>
      </template>

      <!-- 歌曲 -->
      <template v-else>
        <SongResultRail
          :songs="songs"
          :pending="pending"
          :busy-id="busyId"
          empty-title="No songs yet"
          empty-hint="Make a track and it will show up here."
          @remix="remixSong"
          @regenerate="regenerateSong"
          @download="downloadSong"
          @delete="promptDeleteSong"
          @open="openSong"
        />
      </template>

      <p v-if="actionError" class="mt-4 text-[12px] text-danger">{{ actionError }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getScenario } from '~/utils/imageScenarios'
import type { SongPublic } from '~/utils/types'

definePageMeta({ layout: 'default' })

useHead({
  title: 'My creations — Create Keepsakes',
  meta: [
    { name: 'description', content: 'Every picture and song you have made, ready to download again.' },
  ],
})

interface PictureItem {
  id: string
  title: string
  scene: string
  status: string
  imageUrl: string | null
  errorMessage: string | null
  createdAt: string
}


const { user, authReady } = useAuth()
const { openLogin, openSignup } = useAuthModal()
const { get, del } = useApi()

const tab = ref<'pictures' | 'songs'>('pictures')
const tabs = [
  { value: 'pictures', label: 'Pictures' },
  { value: 'songs', label: 'Songs' },
]

const pictures = ref<PictureItem[]>([])
const songs = ref<SongPublic[]>([])
const pending = ref(false)
const busyId = ref<string | null>(null)
const actionError = ref('')

async function loadPictures() {
  const res = await get<{ images: PictureItem[] }>('/api/images')
  pictures.value = res.images || []
}

async function loadSongs() {
  const res = await get<{ songs: SongPublic[] }>('/api/songs')
  songs.value = res.songs || []
}

async function load() {
  if (!user.value) return
  pending.value = true
  actionError.value = ''
  try {
    // 两个列表都拉，切换 tab 不用等
    await Promise.all([loadPictures(), loadSongs()])
  } catch (e: any) {
    actionError.value = e?.data?.statusMessage || e?.message || 'Could not load your creations.'
  } finally {
    pending.value = false
  }
}

function reload() {
  load()
}

watch(user, load, { immediate: true })

// ── 图片 ──────────────────────────────────────────────
function pictureTitle(im: PictureItem): string {
  if (im.title) return im.title
  const sc = getScenario(im.scene)
  // 场景是 'general' 的就是 AI 图片工作室出的图，不是贺卡
  if (sc && im.scene !== 'general') return sc.label
  return 'AI picture'
}

function formatDate(s: string) {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function removePicture(im: PictureItem) {
  if (!confirm('Delete this picture? This cannot be undone.')) return
  try {
    await del(`/api/images/${im.id}`)
    pictures.value = pictures.value.filter(x => x.id !== im.id)
  } catch (e: any) {
    actionError.value = e?.data?.statusMessage || e?.message || 'Could not delete that picture.'
  }
}

// ── 歌曲 ──────────────────────────────────────────────
function remixSong(song: SongPublic) {
  const path = song.type === 'cover' ? '/cover' : '/create'
  navigateTo(`${path}?remix=${song.id}`)
}

async function regenerateSong(song: SongPublic) {
  busyId.value = song.id
  actionError.value = ''
  try {
    await get(`/api/songs/${song.id}/regenerate`)
    await loadSongs()
  } catch (e: any) {
    actionError.value = e?.data?.statusMessage || e?.message || 'Could not regenerate that track.'
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

function promptDeleteSong(song: SongPublic) {
  if (!confirm(`Delete "${song.title}"? This cannot be undone.`)) return
  busyId.value = song.id
  actionError.value = ''
  del(`/api/songs/${song.id}`)
    .then(() => loadSongs())
    .catch((e: any) => {
      actionError.value = e?.data?.statusMessage || e?.message || 'Could not delete that track.'
    })
    .finally(() => {
      busyId.value = null
    })
}
</script>
