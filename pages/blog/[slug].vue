<template>
  <div class="ck-post">
    <div class="ck-wrap ck-wrap--narrow">
      <NuxtLink to="/blog" class="ck-back">
        <span class="i-ph-arrow-left" />
        All articles
      </NuxtLink>

      <div v-if="pending" class="ck-loading">Loading…</div>

      <article v-else-if="post" class="ck-article">
        <header class="ck-article__head">
          <div class="ck-tags">
            <span v-for="t in post.tags.slice(0, 3)" :key="t" class="ck-tag">{{ t }}</span>
          </div>
          <h1 class="ck-h1">{{ post.title }}</h1>
          <p class="ck-meta">
            {{ post.authorName }} · {{ formatDate(post.publishedAt) }} · {{ post.readingMinutes }} min read
          </p>
        </header>

        <img
          v-if="post.coverImage"
          :src="post.coverImage"
          :alt="post.title"
          class="ck-article__cover"
          decoding="async"
        />

        <!-- 正文：marked 渲染 -->
        <div class="ck-prose" v-html="renderedContent" />

        <footer class="ck-article__foot">
          <div class="ck-cta">
            <h2 class="ck-cta__title">Ready to make one?</h2>
            <p class="ck-cta__text">
              Start from an occasion, add their photo and their name, and write
              the words yourself.
            </p>
            <NuxtLink to="/cards" class="ck-btn ck-btn--primary">
              Create a card
              <span class="i-ph-arrow-right" />
            </NuxtLink>
          </div>
        </footer>
      </article>

      <div v-else class="ck-loading">That article does not exist.</div>

      <!-- 相关 -->
      <section v-if="related.length" class="ck-related">
        <h2 class="ck-related__title">Read next</h2>
        <div class="ck-related__grid">
          <NuxtLink
            v-for="r in related"
            :key="r.id"
            :to="`/blog/${r.slug}`"
            class="ck-related__item"
          >
            <img v-if="r.coverImage" :src="r.coverImage" :alt="r.title" loading="lazy" decoding="async" />
            <span class="ck-related__text">{{ r.title }}</span>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'

definePageMeta({ layout: 'marketing' })

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))

const { data, pending } = await useFetch<{ post: any; related: any[] }>(
  () => `/api/blog/${slug.value}`,
  { key: () => `blog-post-${slug.value}` },
)

const post = computed(() => (data.value as any)?.post || null)
// related 由服务端算（同标签优先），不用在前端再拉一遍列表
const related = computed(() => (data.value as any)?.related || [])

/** 用 marked 渲染 Markdown（比原来那段正则转换靠谱得多） */
const renderedContent = computed(() => {
  const md = post.value?.content
  if (!md) return ''
  return marked.parse(md, { async: false }) as string
})

useHead(() => {
  const p = post.value
  return {
    title: p ? `${p.title} — Create Keepsakes` : 'Create Keepsakes',
    meta: p
      ? [
          { name: 'description', content: p.metaDescription || p.excerpt },
          { property: 'og:title', content: p.title },
          { property: 'og:description', content: p.excerpt },
          { property: 'og:type', content: 'article' },
          { property: 'article:published_time', content: p.publishedAt },
          { property: 'og:image', content: p.coverImage || 'https://assets.yozzytools.com/og-image.jpg' },
          { name: 'twitter:card', content: 'summary_large_image' },
        ]
      : [],
    link: [{ rel: 'canonical', href: `https://create.yozzytools.com/blog/${slug.value}` }],
  }
})

function formatDate(s: string) {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<style scoped>
.ck-post {
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
  padding: 2.5rem 0 5rem;
  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: 'Manrope', system-ui, sans-serif;
}
.ck-wrap { max-width: 74rem; margin: 0 auto; padding: 0 1.5rem; }
.ck-wrap--narrow { max-width: 46rem; }

.ck-h1 {
  font-family: var(--ck-serif);
  font-size: clamp(1.9rem, 4.4vw, 2.9rem);
  font-weight: 600;
  line-height: 1.15;
}

.ck-back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 2rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ck-ink-2);
  text-decoration: none;
}
.ck-back:hover { color: var(--ck-coral-deep); }

.ck-loading { padding: 3rem 0; text-align: center; color: var(--ck-ink-2); }

.ck-tags { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.ck-tag {
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: rgba(200, 84, 61, 0.1);
  color: var(--ck-coral-deep);
  font-size: 0.6875rem;
  font-weight: 700;
}
.ck-meta { font-size: 0.8125rem; color: #a08f81; }

.ck-article__head { margin-bottom: 1.75rem; }
.ck-article__head .ck-h1 { margin-top: 0.75rem; }
.ck-article__head .ck-meta { margin-top: 0.75rem; }
.ck-article__cover {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 1rem;
  margin-bottom: 2rem;
}

/* ---------- 正文 ---------- */
.ck-prose {
  font-size: 1.0625rem;
  line-height: 1.75;
  color: #3f362f;
}
.ck-prose :deep(h2) {
  margin: 2.25rem 0 0.75rem;
  font-family: var(--ck-serif);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--ck-ink);
}
.ck-prose :deep(h3) {
  margin: 1.75rem 0 0.6rem;
  font-family: var(--ck-serif);
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--ck-ink);
}
.ck-prose :deep(p) { margin: 1rem 0; }
.ck-prose :deep(strong) { font-weight: 700; color: var(--ck-ink); }
.ck-prose :deep(em) { font-style: italic; }
.ck-prose :deep(ul),
.ck-prose :deep(ol) { margin: 1rem 0; padding-left: 1.4rem; }
.ck-prose :deep(li) { margin: 0.45rem 0; }
.ck-prose :deep(a) { color: var(--ck-coral-deep); font-weight: 600; text-underline-offset: 3px; }
.ck-prose :deep(blockquote) {
  margin: 1.5rem 0;
  padding: 0.9rem 1.25rem;
  border-left: 3px solid var(--ck-coral);
  border-radius: 0 0.6rem 0.6rem 0;
  background: var(--ck-cream);
  font-family: var(--ck-serif);
  font-size: 1.0625rem;
  font-style: italic;
  color: var(--ck-ink);
}
.ck-prose :deep(blockquote p) { margin: 0.4rem 0; }
.ck-prose :deep(hr) { margin: 2.5rem 0; border: 0; border-top: 1px solid var(--ck-line); }
.ck-prose :deep(code) {
  padding: 0.12rem 0.4rem;
  border-radius: 0.3rem;
  background: var(--ck-cream);
  font-size: 0.9em;
}

/* ---------- 文末 CTA ---------- */
.ck-article__foot { margin-top: 3rem; }
.ck-cta {
  padding: 2rem;
  border-radius: 1.1rem;
  background: var(--ck-cream);
  text-align: center;
}
.ck-cta__title { margin: 0; font-family: var(--ck-serif); font-size: 1.6rem; font-weight: 600; }
.ck-cta__text { margin: 0.6rem auto 1.25rem; max-width: 38ch; font-size: 0.9375rem; line-height: 1.6; color: var(--ck-ink-2); }
.ck-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.8rem 1.5rem;
  border-radius: 999px;
  background: var(--ck-coral);
  color: #fff;
  font-size: 0.9375rem;
  font-weight: 700;
  text-decoration: none;
}
.ck-btn:hover { background: var(--ck-coral-deep); }

/* ---------- 相关 ---------- */
.ck-related { margin-top: 4rem; }
.ck-related__title {
  margin: 0 0 1.25rem;
  font-family: var(--ck-serif);
  font-size: 1.35rem;
  font-weight: 600;
}
.ck-related__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 1rem; }
.ck-related__item {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.75rem;
  border: 1px solid var(--ck-line);
  border-radius: 0.9rem;
  background: var(--ck-white);
  text-decoration: none;
  transition: transform 0.16s ease;
}
.ck-related__item:hover { transform: translateY(-2px); }
.ck-related__item img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 0.6rem; }
.ck-related__text { font-size: 0.875rem; font-weight: 600; line-height: 1.4; color: var(--ck-ink); }
</style>
