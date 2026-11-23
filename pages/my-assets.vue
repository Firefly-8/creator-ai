<template>
  <div class="ck-mine">
    <div class="ck-wrap">
      <!-- 标题 -->
      <header class="ck-mine__head">
        <div>
          <h1 class="ck-h1">My creations</h1>
          <p class="ck-lede">
            Finished cards are kept forever. Unfinished drafts stay for 3 days, then disappear.
            Download or share any of them again whenever you need.
          </p>
        </div>
        <NuxtLink to="/cards?format=card" class="ck-btn ck-btn--primary">
          <span class="i-ph-plus" />
          Make another
        </NuxtLink>
      </header>

      <!-- 分类切换 -->
      <div class="ck-tabs" role="tablist">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          role="tab"
          class="ck-tab"
          :class="{ 'ck-tab--on': tab === t.id }"
          :aria-selected="tab === t.id"
          @click="tab = t.id"
        >
          <span :class="t.icon" />
          {{ t.label }}
          <span class="ck-tab__n">{{ t.count }}</span>
        </button>
      </div>

      <!-- 未登录 -->
      <section v-if="!authReady" class="ck-empty">
        <p class="ck-empty__text">Checking your account…</p>
      </section>

      <section v-else-if="!user" class="ck-empty">
        <span class="ck-empty__icon i-ph-images" />
        <h2 class="ck-empty__title">Your creations live here</h2>
        <p class="ck-empty__text">
          Log in to see the cards, pictures and songs you have made, download
          them again, or make a new one for someone else.
        </p>
        <div class="ck-empty__actions">
          <button class="ck-btn ck-btn--primary" @click="openLogin">Log in</button>
          <button class="ck-btn ck-btn--ghost" @click="openSignup">Create a free account</button>
        </div>
      </section>

      <!-- ==================== 图片 / 贺卡 ==================== -->
      <template v-else-if="tab === 'pictures'">
        <!-- 草稿 / 作品 子切换（2026-11-23 原型对齐：草稿 3 天、作品永久） -->
        <div class="ck-subtabs" role="tablist">
          <button
            type="button" role="tab"
            class="ck-subtab" :class="{ 'ck-subtab--on': assetFilter === 'work' }"
            :aria-selected="assetFilter === 'work'"
            @click="assetFilter = 'work'"
          >
            <span class="i-ph-seal-check" /> Finished cards
            <span class="ck-tab__n">{{ works.length }}</span>
          </button>
          <button
            type="button" role="tab"
            class="ck-subtab" :class="{ 'ck-subtab--on': assetFilter === 'draft' }"
            :aria-selected="assetFilter === 'draft'"
            @click="assetFilter = 'draft'"
          >
            <span class="i-ph-file-dashed" /> Drafts
            <span class="ck-tab__n">{{ drafts.length }}</span>
          </button>
        </div>
        <p v-if="assetFilter === 'draft'" class="ck-mine__note">
          <span class="i-ph-clock" /> Unfinished drafts are kept for 3 days, then removed.
        </p>

        <p v-if="visiblePictures.length" class="ck-mine__count">
          {{ visiblePictures.length }} {{ assetFilter === 'work' ? 'finished card' : 'draft' }}{{ visiblePictures.length === 1 ? '' : 's' }}
        </p>

        <section v-if="!visiblePictures.length" class="ck-empty">
          <span class="ck-empty__icon i-ph-image" />
          <h2 class="ck-empty__title">
            {{ assetFilter === 'work' ? 'No finished cards yet' : 'No drafts' }}
          </h2>
          <p class="ck-empty__text">
            {{ assetFilter === 'work'
              ? 'Finish a card in the editor and it will be kept here forever, ready to download or share.'
              : 'Cards you start but do not finish show up here for 3 days.' }}
          </p>
          <div class="ck-empty__actions">
            <NuxtLink to="/cards?format=card" class="ck-btn ck-btn--primary">Make a card</NuxtLink>
          </div>
        </section>

        <div v-else class="ck-grid">
          <article v-for="c in visiblePictures" :key="c.id" class="ck-card">
            <NuxtLink :to="`/cards?from=${c.id}`" class="ck-card__media">
              <img
                v-if="c.finalUrl || c.imageUrl"
                :src="c.finalUrl || c.imageUrl"
                :alt="pictureTitle(c)"
                loading="lazy"
                decoding="async"
              />
              <div v-else class="ck-card__broken">
                <span class="i-ph-warning" />
                <span>{{ c.errorMessage || 'This picture could not be made' }}</span>
              </div>
            </NuxtLink>

            <div class="ck-card__body">
              <h3 class="ck-card__title">{{ pictureTitle(c) }}</h3>
              <p class="ck-card__meta">
                {{ pictureKind(c) }}
                <span class="ck-card__dot">·</span>
                <span :class="c.assetType === 'work' ? 'ck-tag-work' : 'ck-tag-draft'">
                  {{ c.assetType === 'work' ? 'Finished · kept forever' : 'Draft' }}
                </span>
                <span class="ck-card__dot">·</span>
                {{ formatDate(c.createdAt) }}
              </p>
            </div>

            <div class="ck-card__actions">
              <a
                v-if="c.finalUrl || c.imageUrl"
                :href="c.finalUrl || c.imageUrl"
                :download="`card-${c.id}.png`"
                class="ck-card__act"
                title="Download"
              >
                <span class="i-ph-download-simple" />
                <span>Download</span>
              </a>
              <button
                v-if="c.assetType === 'work'"
                class="ck-card__act"
                title="Copy share link"
                @click="copyAssetLink(c)"
              >
                <span :class="linkCopiedId === c.id ? 'i-ph-check' : 'i-ph-link'" />
                <span>{{ linkCopiedId === c.id ? 'Copied' : 'Share' }}</span>
              </button>
              <button
                v-if="c.assetType === 'work'"
                class="ck-card__act"
                title="Print"
                @click="printAsset(c)"
              >
                <span class="i-ph-printer" />
                <span>Print</span>
              </button>
              <button
                v-if="c.assetType === 'work'"
                class="ck-card__act"
                title="Send by email"
                @click="emailAsset(c)"
              >
                <span class="i-ph-envelope" />
                <span>Email</span>
              </button>
              <NuxtLink :to="`/cards?from=${c.id}`" class="ck-card__act" title="Open in editor">
                <span class="i-ph-pencil" />
                <span>{{ c.assetType === 'work' ? 'Edit' : 'Continue' }}</span>
              </NuxtLink>
              <button class="ck-card__act ck-card__act--danger" title="Delete" @click="removePicture(c)">
                <span class="i-ph-trash" />
                <span>Delete</span>
              </button>
            </div>
          </article>
        </div>
      </template>

      <!-- ==================== 歌曲 ==================== -->
      <template v-else>
        <!-- 页面内置播放器：深色的全局播放器挂不到这种浅色页上 -->
        <audio ref="audioEl" preload="none" @ended="onEnded" @pause="playing = false" @play="playing = true" />

        <p v-if="songs.length" class="ck-mine__count">
          {{ songs.length }} song{{ songs.length === 1 ? '' : 's' }}
        </p>

        <section v-if="!songs.length" class="ck-empty">
          <span class="ck-empty__icon i-ph-music-notes" />
          <h2 class="ck-empty__title">No songs yet</h2>
          <p class="ck-empty__text">
            Write a few lines or a melody request and we will turn it into a
            track you can play and download.
          </p>
          <div class="ck-empty__actions">
            <NuxtLink to="/create" class="ck-btn ck-btn--primary">Make a song</NuxtLink>
            <NuxtLink to="/cover" class="ck-btn ck-btn--ghost">Cover art</NuxtLink>
          </div>
        </section>

        <ul v-else class="ck-songs">
          <li v-for="s in songs" :key="s.id" class="ck-song">
            <button
              type="button"
              class="ck-song__play"
              :disabled="!s.audioUrl || s.status !== 'ready'"
              :aria-label="`Play ${s.title}`"
              @click="togglePlay(s)"
            >
              <span
                :class="currentId === s.id && playing ? 'i-ph-pause-fill' : 'i-ph-play-fill'"
              />
            </button>

            <NuxtLink :to="`/song/${s.id}`" class="ck-song__cover" :aria-label="s.title">
              <img v-if="s.coverUrl" :src="s.coverUrl" :alt="s.title" loading="lazy">
              <span v-else class="ck-song__cover-ph" :style="{ background: s.coverColor || '#e6dccd' }" />
            </NuxtLink>

            <div class="ck-song__body">
              <NuxtLink :to="`/song/${s.id}`" class="ck-song__title">{{ s.title || 'Untitled' }}</NuxtLink>
              <p class="ck-song__meta">
                {{ s.type === 'cover' ? 'Cover art' : 'Song' }}
                <span class="ck-card__dot">·</span>
                {{ formatDuration(s.durationMs) }}
                <span class="ck-card__dot">·</span>
                {{ formatDate(s.createdAt) }}
              </p>
            </div>

            <div class="ck-song__actions">
              <a
                v-if="s.downloadUrl"
                :href="s.downloadUrl"
                :download="`${s.title || 'track'}.mp3`"
                class="ck-card__act"
                title="Download"
              >
                <span class="i-ph-download-simple" />
                <span>Download</span>
              </a>
              <NuxtLink :to="`/song/${s.id}`" class="ck-card__act" title="Open">
                <span class="i-ph-arrow-square-out" />
                <span>Open</span>
              </NuxtLink>
              <button class="ck-card__act ck-card__act--danger" title="Delete" @click="removeSong(s)">
                <span class="i-ph-trash" />
                <span>Delete</span>
              </button>
            </div>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getScenario } from '~/utils/imageScenarios'
import { formatDuration, type SongPublic } from '~/utils/types'

definePageMeta({ layout: 'marketing' })

useHead({
  title: 'My creations — Create Keepsakes',
  meta: [{ name: 'description', content: 'Every card, picture and song you have made, ready to download again.' }],
})

interface PictureItem {
  id: string
  title: string
  scene: string
  status: string
  imageUrl: string | null
  /** 完成设计后合成的成品图 URL（有则展示它，而非底图） */
  finalUrl: string | null
  /** 'work' = 完成的作品永久保存；'draft' = 3 天过期的草稿 */
  assetType: 'draft' | 'work'
  format: string | null
  finalizedAt: string | null
  errorMessage: string | null
  createdAt: string
}

const { user, authReady } = useAuth()
const { openLogin, openSignup } = useAuthModal()
const { get, del } = useApi()

const tab = ref<'pictures' | 'songs'>('pictures')
const pictures = ref<PictureItem[]>([])
const songs = ref<SongPublic[]>([])

// 草稿 / 作品分组（2026-11-23 原型对齐）
const assetFilter = ref<'work' | 'draft'>('work')
const works = computed(() => pictures.value.filter(p => p.assetType === 'work'))
const drafts = computed(() => pictures.value.filter(p => p.assetType === 'draft'))
const visiblePictures = computed(() => assetFilter.value === 'work' ? works.value : drafts.value)

const tabs = computed(() => [
  { id: 'pictures' as const, label: 'Cards', icon: 'i-ph-images', count: pictures.value.length },
  { id: 'songs' as const, label: 'Songs', icon: 'i-ph-music-notes', count: songs.value.length },
])

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
  try {
    await Promise.all([loadPictures(), loadSongs()])
  } catch (e: any) {
    console.error('[my-assets] 加载失败:', e?.data?.statusMessage || e?.message || e)
  }
}

watch(user, load, { immediate: true })

// ── 图片 ──────────────────────────────────────────────
/** 标题：优先用户自己填的，其次场景人话标签 */
function pictureTitle(im: PictureItem): string {
  if (im.title) return im.title
  const sc = getScenario(im.scene)
  if (sc && im.scene !== 'general') return sc.label
  return 'AI picture'
}

/** 副标题：区分「贺卡」和「AI 图片」 */
function pictureKind(im: PictureItem): string {
  const sc = getScenario(im.scene)
  if (sc && im.scene !== 'general') return 'Card'
  return 'AI picture'
}

function formatDate(s: string) {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── 作品交付（2026-11-23 原型对齐：资产卡片直接给分享/打印/邮件）──────
const linkCopiedId = ref('')
async function copyAssetLink(im: PictureItem) {
  const link = `${location.origin}/card/${im.id}`
  try {
    await navigator.clipboard.writeText(link)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = link
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  linkCopiedId.value = im.id
  setTimeout(() => { linkCopiedId.value = '' }, 2500)
}

function printAsset(im: PictureItem) {
  const url = im.finalUrl || im.imageUrl
  if (!url) return
  const win = window.open(url, '_blank')
  if (win) {
    win.onload = () => { try { win.focus(); win.print() } catch { /* ignore */ } }
  }
}

function emailAsset(im: PictureItem) {
  const link = `${location.origin}/card/${im.id}`
  const subject = encodeURIComponent('A card for you')
  const body = encodeURIComponent(`I made this card for you.\n\nOpen it here: ${link}`)
  window.location.href = `mailto:?subject=${subject}&body=${body}`
}

async function removePicture(im: PictureItem) {
  if (!confirm('Delete this picture? This cannot be undone.')) return
  try {
    await del(`/api/images/${im.id}`)
    pictures.value = pictures.value.filter(x => x.id !== im.id)
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not delete that picture.')
  }
}

// ── 歌曲 ──────────────────────────────────────────────
const audioEl = ref<HTMLAudioElement | null>(null)
const currentId = ref<string | null>(null)
const playing = ref(false)

function togglePlay(song: SongPublic) {
  const el = audioEl.value
  if (!el || !song.audioUrl || song.status !== 'ready') return

  if (currentId.value === song.id) {
    if (el.paused) el.play().catch(() => {})
    else el.pause()
    return
  }

  el.src = song.audioUrl
  currentId.value = song.id
  el.play().catch(() => {
    playing.value = false
  })
}

function onEnded() {
  playing.value = false
}

async function removeSong(song: SongPublic) {
  if (!confirm(`Delete "${song.title}"? This cannot be undone.`)) return
  try {
    await del(`/api/songs/${song.id}`)
    if (currentId.value === song.id) {
      audioEl.value?.pause()
      currentId.value = null
    }
    songs.value = songs.value.filter(x => x.id !== song.id)
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not delete that song.')
  }
}
</script>

<style scoped>
.ck-mine {
  --ck-bg: #fbf7f1;
  --ck-cream: #f5ede1;
  --ck-white: #fffdfa;
  --ck-ink: #2a2420;
  --ck-ink-2: #6b5f55;
  --ck-line: rgba(58, 46, 38, 0.12);
  --ck-coral: #c8543d;
  --ck-coral-deep: #a53f2c;
  --ck-serif: 'Playfair Display', Georgia, serif;

  min-height: 70vh;
  padding: 3rem 0 5rem;
  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: 'Manrope', system-ui, sans-serif;
}
.ck-wrap { max-width: 74rem; margin: 0 auto; padding: 0 1.5rem; }

.ck-h1 {
  font-family: var(--ck-serif);
  font-size: clamp(2.1rem, 5vw, 3rem);
  font-weight: 600;
  line-height: 1.1;
}
.ck-lede { margin-top: 0.8rem; font-size: 1rem; line-height: 1.6; color: var(--ck-ink-2); max-width: 52ch; }

.ck-mine__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.75rem;
}
.ck-mine__count { margin-bottom: 1rem; font-size: 0.875rem; color: var(--ck-ink-2); }
.ck-mine__note { display: flex; align-items: center; gap: 0.4rem; margin: -0.8rem 0 1.2rem; font-size: 0.85rem; color: #a53f2c; }

/* 草稿 / 作品 子切换 */
.ck-subtabs { display: inline-flex; gap: 0.35rem; padding: 0.3rem; margin-bottom: 1rem; border: 1.5px solid var(--ck-line); border-radius: 999px; background: var(--ck-white); }
.ck-subtab { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.5rem 1rem; border: none; border-radius: 999px; background: transparent; font-family: inherit; font-size: 0.9rem; font-weight: 700; color: var(--ck-ink-2); cursor: pointer; }
.ck-subtab:hover { color: var(--ck-ink); }
.ck-subtab--on { background: var(--ck-ink); color: #fff; }
.ck-subtab--on:hover { color: #fff; }

.ck-tag-work { color: #2f7d4f; font-weight: 600; }
.ck-tag-draft { color: #a53f2c; font-weight: 600; }

.ck-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.8rem 1.5rem;
  border: 1.5px solid transparent;
  border-radius: 999px;
  font-size: 0.9375rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}
.ck-btn--primary { background: var(--ck-coral); color: #fff; }
.ck-btn--primary:hover { background: var(--ck-coral-deep); }
.ck-btn--ghost { border-color: var(--ck-line); color: var(--ck-ink); background: transparent; }
.ck-btn--ghost:hover { border-color: var(--ck-coral); color: var(--ck-coral-deep); }

/* ---------- 分类切换 ---------- */
.ck-tabs {
  display: inline-flex;
  gap: 0.35rem;
  padding: 0.3rem;
  margin-bottom: 1.75rem;
  border: 1.5px solid var(--ck-line);
  border-radius: 999px;
  background: var(--ck-white);
}
.ck-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 1.1rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  font-family: inherit;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--ck-ink-2);
  cursor: pointer;
}
.ck-tab:hover { color: var(--ck-ink); }
.ck-tab--on { background: var(--ck-coral); color: #fff; }
.ck-tab--on:hover { color: #fff; }
.ck-tab__n {
  min-width: 1.35rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.06);
  font-size: 0.75rem;
  line-height: 1.5;
  text-align: center;
}
.ck-tab--on .ck-tab__n { background: rgba(255, 255, 255, 0.22); }

/* ---------- 空态 ---------- */
.ck-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 1.5rem;
  border: 1.5px dashed var(--ck-line);
  border-radius: 1.1rem;
  background: var(--ck-white);
  text-align: center;
}
.ck-empty__icon { font-size: 2.75rem; color: var(--ck-coral); }
.ck-empty__title { margin: 0; font-family: var(--ck-serif); font-size: 1.6rem; font-weight: 600; }
.ck-empty__text { margin: 0; max-width: 42ch; font-size: 0.9375rem; line-height: 1.6; color: var(--ck-ink-2); }
.ck-empty__actions { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 0.5rem; }

/* ---------- 图片网格 ---------- */
.ck-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 1.25rem;
}
.ck-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--ck-line);
  border-radius: 1.1rem;
  background: var(--ck-white);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.ck-card:hover { transform: translateY(-3px); box-shadow: 0 18px 40px -22px rgba(58, 46, 38, 0.4); }

.ck-card__media { display: block; aspect-ratio: 3 / 4; overflow: hidden; background: var(--ck-cream); }
.ck-card__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ck-card__broken {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 100%;
  padding: 1rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--ck-ink-2);
}
.ck-card__broken .i-ph-warning { font-size: 1.6rem; color: var(--ck-coral); }

.ck-card__body { padding: 0.85rem 1rem 0.5rem; }
.ck-card__title { margin: 0; font-size: 1rem; font-weight: 700; color: var(--ck-ink); }
.ck-card__meta { margin: 0.3rem 0 0; font-size: 0.8125rem; color: var(--ck-ink-2); }
.ck-card__dot { margin: 0 0.25rem; }

.ck-card__actions {
  display: flex;
  gap: 0.25rem;
  margin-top: auto;
  padding: 0.5rem 0.6rem 0.7rem;
  border-top: 1px solid var(--ck-line);
}
.ck-card__act {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.55rem;
  border: none;
  border-radius: 0.5rem;
  background: none;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ck-ink-2);
  text-decoration: none;
  cursor: pointer;
}
.ck-card__act:hover { background: var(--ck-cream); color: var(--ck-ink); }
.ck-card__act--danger:hover { color: var(--ck-coral-deep); }

/* ---------- 歌曲列表 ---------- */
.ck-songs {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ck-song {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--ck-line);
  border-radius: 1rem;
  background: var(--ck-white);
}
.ck-song__play {
  display: grid;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  flex-shrink: 0;
  border: none;
  border-radius: 999px;
  background: var(--ck-coral);
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
}
.ck-song__play:hover:not(:disabled) { background: var(--ck-coral-deep); }
.ck-song__play:disabled { background: var(--ck-cream); color: var(--ck-ink-2); cursor: not-allowed; }

.ck-song__cover {
  display: block;
  width: 3rem;
  height: 3rem;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 0.7rem;
  background: var(--ck-cream);
}
.ck-song__cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ck-song__cover-ph { display: block; width: 100%; height: 100%; }

.ck-song__body { flex: 1; min-width: 0; }
.ck-song__title {
  display: block;
  overflow: hidden;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--ck-ink);
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ck-song__title:hover { color: var(--ck-coral); }
.ck-song__meta { margin: 0.2rem 0 0; font-size: 0.8125rem; color: var(--ck-ink-2); }

.ck-song__actions { display: flex; align-items: center; gap: 0.2rem; flex-shrink: 0; }
</style>
