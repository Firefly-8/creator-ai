<template>
  <div class="ck-share">
    <div class="ck-share__wrap">
      <template v-if="pending">
        <p class="ck-share__hint">Opening the card…</p>
      </template>
      <template v-else-if="!card">
        <h1 class="ck-share__h1">This card is not available</h1>
        <p class="ck-share__hint">The link may have expired, or the card was removed.</p>
        <NuxtLink to="/" class="ck-share__btn">Make your own card →</NuxtLink>
      </template>
      <template v-else>
        <p class="ck-share__eyebrow">A card made for you</p>
        <h1 class="ck-share__h1">{{ card.title }}</h1>
        <div class="ck-share__frame">
          <img v-if="card.imageUrl" :src="card.imageUrl" :alt="card.title" />
          <span v-else class="ck-share__missing">Picture is no longer available.</span>
        </div>
        <p class="ck-share__note">Made with care — open it on a phone or print it out.</p>
        <NuxtLink to="/" class="ck-share__btn">Make your own card →</NuxtLink>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const route = useRoute()
const id = computed(() => String(route.params.id || ''))

interface ShareCard {
  id: string
  title: string
  scene: string
  imageUrl: string | null
}

// 404 是「链接过期/卡片被删」的正常分支，不算请求异常。
// ignoreResponseError 让 ofetch 不抛错 → SSR 不再打 [request error] [unhandled]。
const { data: payload, pending } = await useFetch<ShareCard | null>(
  () => `/api/images/${encodeURIComponent(id.value)}/share`,
  { key: `share-${id.value}`, ignoreResponseError: true },
)

const card = computed(() =>
  payload.value && 'id' in payload.value ? payload.value as ShareCard : null,
)

// 无效分享链接返回真 404（本页 noindex，不影响收录）
if (import.meta.server && !pending.value && !card.value) setResponseStatus(404)

useHead({
  title: () => card.value ? `${card.value.title} — a card for you` : 'A card for you',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})
</script>

<style scoped>
.ck-share {
  min-height: 100vh;
  background: #fbf7f1;
  color: #2a2420;
  font-family: 'Manrope', system-ui, sans-serif;
  padding: 3rem 1rem 5rem;
}
.ck-share__wrap { max-width: 34rem; margin: 0 auto; text-align: center; }
.ck-share__eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #c8543d;
}
.ck-share__h1 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 2.1rem;
  margin: 0.4rem 0 1.5rem;
}
.ck-share__frame {
  background: #fff;
  padding: 0.75rem;
  border-radius: 0.75rem;
  box-shadow: 0 24px 50px -28px rgba(42, 36, 32, 0.45);
}
.ck-share__frame img { display: block; width: 100%; height: auto; border-radius: 0.4rem; }
.ck-share__missing { display: block; padding: 4rem 1rem; color: #8a7d72; }
.ck-share__hint, .ck-share__note { color: #6b5f55; line-height: 1.6; margin: 1rem 0; }
.ck-share__btn {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.75rem 1.4rem;
  border-radius: 0.6rem;
  background: #c8543d;
  color: #fff;
  font-weight: 700;
  text-decoration: none;
}
</style>
