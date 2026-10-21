<template>
  <div class="ck-blog">
    <div class="ck-wrap">
      <header class="ck-blog__head">
        <p class="ck-badge">
          <span class="i-ph-newspaper" /> Notes on making cards that land
        </p>
        <h1 class="ck-h1">The blog</h1>
        <p class="ck-lede">
          What to write, what to give, and the small things that make a card
          feel like it came from a person rather than a shop.
        </p>
      </header>

      <div v-if="pending" class="ck-loading">Loading articles…</div>

      <template v-else-if="posts.length">
        <!-- 头条 -->
        <article v-if="featured" class="ck-lead">
          <NuxtLink :to="`/blog/${featured.slug}`" class="ck-lead__media">
            <img
              v-if="featured.coverImage"
              :src="featured.coverImage"
              :alt="featured.title"
              loading="eager"
              decoding="async"
            />
          </NuxtLink>
          <div class="ck-lead__body">
            <div class="ck-tags">
              <span v-for="t in featured.tags.slice(0, 2)" :key="t" class="ck-tag">{{ t }}</span>
            </div>
            <h2 class="ck-lead__title">
              <NuxtLink :to="`/blog/${featured.slug}`">{{ featured.title }}</NuxtLink>
            </h2>
            <p class="ck-lead__excerpt">{{ featured.excerpt }}</p>
            <p class="ck-meta">
              {{ formatDate(featured.publishedAt) }} · {{ featured.readingMinutes }} min read
            </p>
            <NuxtLink :to="`/blog/${featured.slug}`" class="ck-readmore">
              Read it
              <span class="i-ph-arrow-right" />
            </NuxtLink>
          </div>
        </article>

        <!-- 列表 -->
        <div class="ck-articles">
          <article v-for="p in rest" :key="p.id" class="ck-article">
            <NuxtLink :to="`/blog/${p.slug}`" class="ck-article__media">
              <img
                v-if="p.coverImage"
                :src="p.coverImage"
                :alt="p.title"
                loading="lazy"
                decoding="async"
              />
            </NuxtLink>
            <div class="ck-article__body">
              <div class="ck-tags">
                <span v-for="t in p.tags.slice(0, 2)" :key="t" class="ck-tag">{{ t }}</span>
              </div>
              <h3 class="ck-article__title">
                <NuxtLink :to="`/blog/${p.slug}`">{{ p.title }}</NuxtLink>
              </h3>
              <p class="ck-article__excerpt">{{ p.excerpt }}</p>
              <p class="ck-meta">
                {{ formatDate(p.publishedAt) }} · {{ p.readingMinutes }} min read
              </p>
            </div>
          </article>
        </div>

        <!-- CTA -->
        <section class="ck-blog__cta">
          <h2 class="ck-h2">Put it on a card.</h2>
          <p class="ck-sub">
            Start from an occasion, add their photo and their name, and write
            something only you would write.
          </p>
          <NuxtLink to="/cards" class="ck-btn ck-btn--primary ck-btn--lg">
            Make a card
            <span class="i-ph-arrow-right" />
          </NuxtLink>
        </section>
      </template>

      <div v-else class="ck-loading">No articles yet — check back soon.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

useHead({
  title: 'The blog — Create Keepsakes',
  meta: [{
    name: 'description',
    content: 'What to write on a birthday card, what to give at a milestone, and how to make a card feel personal.',
  }],
  link: [{ rel: 'canonical', href: 'https://create.yozzytools.com/blog' }],
})

interface Post {
  id: string
  slug: string
  title: string
  excerpt: string
  coverImage: string | null
  tags: string[]
  readingMinutes: number
  publishedAt: string
}

const { data, pending } = await useFetch<{ posts: Post[] }>('/api/blog', {
  key: 'blog-list',
})

const posts = computed(() => data.value?.posts || [])
const featured = computed(() => posts.value[0])
const rest = computed(() => posts.value.slice(1))

function formatDate(s: string) {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<style scoped>
.ck-blog {
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
  padding: 3.5rem 0 5rem;
  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: 'Manrope', system-ui, sans-serif;
}
.ck-wrap { max-width: 70rem; margin: 0 auto; padding: 0 1.5rem; }

.ck-h1 {
  font-family: var(--ck-serif);
  font-size: clamp(2.2rem, 5vw, 3.2rem);
  font-weight: 600;
  line-height: 1.1;
}
.ck-h2 { font-family: var(--ck-serif); font-size: clamp(1.7rem, 3.4vw, 2.3rem); font-weight: 600; }
.ck-lede { margin-top: 0.9rem; font-size: 1.0625rem; line-height: 1.6; color: var(--ck-ink-2); max-width: 48ch; }
.ck-sub { margin-top: 0.8rem; font-size: 1rem; line-height: 1.6; color: var(--ck-ink-2); max-width: 46ch; }

.ck-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  background: rgba(200, 84, 61, 0.1);
  color: var(--ck-coral-deep);
  font-size: 0.8125rem;
  font-weight: 600;
}
.ck-blog__head { max-width: 44rem; margin-bottom: 2.75rem; }

.ck-loading { padding: 3rem 0; text-align: center; color: var(--ck-ink-2); }

.ck-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1.6rem;
  border: 1.5px solid transparent;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.14s ease;
}
.ck-btn--primary { background: var(--ck-coral); color: #fff; }
.ck-btn--primary:hover { background: var(--ck-coral-deep); }
.ck-btn--lg { padding: 1rem 2rem; font-size: 1.0625rem; }

.ck-tags { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.ck-tag {
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: rgba(200, 84, 61, 0.1);
  color: var(--ck-coral-deep);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.03em;
}
.ck-meta { font-size: 0.8125rem; color: #a08f81; }

/* ---------- 头条 ---------- */
.ck-lead {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: center;
  margin-bottom: 2.5rem;
  padding: 1.25rem;
  border: 1px solid var(--ck-line);
  border-radius: 1.25rem;
  background: var(--ck-white);
}
@media (max-width: 780px) { .ck-lead { grid-template-columns: 1fr; } }

.ck-lead__media { display: block; border-radius: 0.9rem; overflow: hidden; background: var(--ck-cream); }
.ck-lead__media img { display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: cover; }
.ck-lead__title {
  margin: 0.75rem 0 0;
  font-family: var(--ck-serif);
  font-size: clamp(1.5rem, 2.6vw, 2rem);
  font-weight: 600;
  line-height: 1.2;
}
.ck-lead__title a { color: var(--ck-ink); text-decoration: none; }
.ck-lead__title a:hover { color: var(--ck-coral-deep); }
.ck-lead__excerpt { margin: 0.75rem 0 0; font-size: 0.9375rem; line-height: 1.65; color: var(--ck-ink-2); }
.ck-lead__body .ck-meta { margin-top: 0.75rem; }
.ck-readmore {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 1rem;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--ck-coral-deep);
  text-decoration: none;
}
.ck-readmore:hover { gap: 0.55rem; }

/* ---------- 列表 ---------- */
.ck-articles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 1.5rem;
}
.ck-article {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--ck-line);
  border-radius: 1.1rem;
  background: var(--ck-white);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.ck-article:hover { transform: translateY(-3px); box-shadow: 0 18px 40px -22px rgba(58, 46, 38, 0.4); }
.ck-article__media { display: block; background: var(--ck-cream); }
.ck-article__media img { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; }
.ck-article__body { display: flex; flex-direction: column; gap: 0.5rem; padding: 1.1rem 1.15rem 1.3rem; }
.ck-article__title { margin: 0; font-family: var(--ck-serif); font-size: 1.2rem; font-weight: 600; line-height: 1.25; }
.ck-article__title a { color: var(--ck-ink); text-decoration: none; }
.ck-article__title a:hover { color: var(--ck-coral-deep); }
.ck-article__excerpt { margin: 0; font-size: 0.875rem; line-height: 1.6; color: var(--ck-ink-2); }

/* ---------- CTA ---------- */
.ck-blog__cta {
  margin-top: 4rem;
  padding: 2.5rem 2rem;
  border-radius: 1.25rem;
  background: var(--ck-cream);
  text-align: center;
}
.ck-blog__cta .ck-h2 { margin: 0 auto; }
.ck-blog__cta .ck-sub { margin-left: auto; margin-right: auto; }
.ck-blog__cta .ck-btn { margin-top: 1.5rem; }
</style>
