<template>
  <div class="ck-mine">
    <div class="ck-wrap">
      <!-- 标题 -->
      <header class="ck-mine__head">
        <div>
          <h1 class="ck-h1">My cards</h1>
          <p class="ck-lede">
            Everything you have made, in one place. Download it again whenever
            you need to — we never delete your work.
          </p>
        </div>
        <NuxtLink to="/cards" class="ck-btn ck-btn--primary">
          <span class="i-ph-plus" />
          Make another
        </NuxtLink>
      </header>

      <!-- 未登录 -->
      <section v-if="!authReady" class="ck-empty">
        <p class="ck-empty__text">Checking your account…</p>
      </section>

      <section v-else-if="!user" class="ck-empty">
        <span class="ck-empty__icon i-ph-user-circle" />
        <h2 class="ck-empty__title">Your cards live here</h2>
        <p class="ck-empty__text">
          Log in to see the cards you have made, download them again, or make a
          new one for someone else.
        </p>
        <div class="ck-empty__actions">
          <button class="ck-btn ck-btn--primary" @click="openLogin">Log in</button>
          <button class="ck-btn ck-btn--ghost" @click="openSignup">Create a free account</button>
        </div>
      </section>

      <!-- 空列表 -->
      <section v-else-if="!pending && !cards.length" class="ck-empty">
        <span class="ck-empty__icon i-ph-gift" />
        <h2 class="ck-empty__title">No cards yet</h2>
        <p class="ck-empty__text">
          Start with an occasion. We will take care of the picture, the
          lettering and the printing size.
        </p>
        <NuxtLink to="/cards" class="ck-btn ck-btn--primary">
          Make your first card
        </NuxtLink>
      </section>

      <!-- 列表 -->
      <template v-else>
        <p v-if="cards.length" class="ck-mine__count">
          {{ cards.length }} card{{ cards.length === 1 ? '' : 's' }}
        </p>

        <div class="ck-grid">
          <article v-for="c in cards" :key="c.id" class="ck-card">
            <NuxtLink :to="`/cards?from=${c.id}`" class="ck-card__media">
              <img
                v-if="c.imageUrl"
                :src="c.imageUrl"
                :alt="c.title || sceneLabel(c.scene)"
                loading="lazy"
                decoding="async"
              />
              <div v-else class="ck-card__broken">
                <span class="i-ph-warning" />
                <span>{{ c.errorMessage || 'This card could not be made' }}</span>
              </div>
            </NuxtLink>

            <div class="ck-card__body">
              <h3 class="ck-card__title">{{ c.title || sceneLabel(c.scene) }}</h3>
              <p class="ck-card__meta">
                {{ sceneLabel(c.scene) }}
                <span class="ck-card__dot">·</span>
                {{ formatDate(c.createdAt) }}
              </p>
            </div>

            <div class="ck-card__actions">
              <a
                v-if="c.imageUrl"
                :href="c.imageUrl"
                :download="`card-${c.id}.jpg`"
                class="ck-card__act"
                title="Download"
              >
                <span class="i-ph-download-simple" />
                <span>Download</span>
              </a>
              <NuxtLink :to="`/cards?from=${c.id}`" class="ck-card__act" title="Make a new version">
                <span class="i-ph-magic-wand" />
                <span>Remix</span>
              </NuxtLink>
              <button class="ck-card__act ck-card__act--danger" title="Delete" @click="remove(c)">
                <span class="i-ph-trash" />
                <span>Delete</span>
              </button>
            </div>
          </article>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getScenario } from '~/utils/imageScenarios'

definePageMeta({ layout: 'marketing' })

useHead({
  title: 'My cards — Create Keepsakes',
  meta: [{ name: 'description', content: 'Every card you have made, ready to download again.' }],
})

interface CardItem {
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

const cards = ref<CardItem[]>([])
const pending = ref(true)

async function load() {
  if (!user.value) {
    pending.value = false
    return
  }
  pending.value = true
  try {
    const res = await $fetch<{ images: CardItem[] }>('/api/images')
    cards.value = res.images || []
  } catch {
    cards.value = []
  } finally {
    pending.value = false
  }
}

watch(user, load, { immediate: true })

/** 场景 id → 人话标签；查不到就退回通用说法 */
function sceneLabel(scene: string) {
  const sc = getScenario(scene)
  return sc ? sc.label : 'Card'
}

function formatDate(s: string) {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function remove(c: CardItem) {
  if (!confirm('Delete this card? This cannot be undone.')) return
  try {
    await $fetch(`/api/images/${c.id}`, { method: 'DELETE' })
    cards.value = cards.value.filter(x => x.id !== c.id)
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not delete that card.')
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
.ck-lede { margin-top: 0.8rem; font-size: 1rem; line-height: 1.6; color: var(--ck-ink-2); max-width: 44ch; }

.ck-mine__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}
.ck-mine__count { margin-bottom: 1rem; font-size: 0.875rem; color: var(--ck-ink-2); }

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
.ck-empty__text { margin: 0; max-width: 40ch; font-size: 0.9375rem; line-height: 1.6; color: var(--ck-ink-2); }
.ck-empty__actions { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 0.5rem; }

/* ---------- 网格 ---------- */
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
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ck-ink-2);
  text-decoration: none;
  cursor: pointer;
}
.ck-card__act:hover { background: var(--ck-cream); color: var(--ck-ink); }
.ck-card__act--danger:hover { color: var(--ck-coral-deep); }
</style>
