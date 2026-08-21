<template>
  <div class="content-page">
    <div class="content-glow" />

    <section class="relative py-20 sm:py-28">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <!-- 返回链接 -->
        <NuxtLink to="/blog" class="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-accent-soft transition-colors mb-8">
          <span class="i-ph-arrow-left text-[14px]" />
          Back to Blog
        </NuxtLink>

        <!-- 加载状态 -->
        <div v-if="pending" class="animate-pulse">
          <div class="h-8 w-3/4 bg-white/10 rounded mb-4"></div>
          <div class="h-4 w-1/2 bg-white/10 rounded"></div>
        </div>

        <!-- 文章内容 -->
        <article v-else-if="post">
          <!-- 标签 -->
          <div class="flex flex-wrap items-center gap-2 mb-4">
            <span
              v-for="tag in post.tags"
              :key="tag"
              class="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-soft"
            >
              {{ tag }}
            </span>
          </div>

          <h1 class="font-display text-3xl font-800 tracking-tight text-white sm:text-4xl leading-tight">
            {{ post.title }}
          </h1>

          <div class="mt-4 flex items-center gap-3 text-sm text-ink-400">
            <span>{{ post.authorName }}</span>
            <span class="text-ink-600">·</span>
            <span>{{ formatDate(post.publishedAt) }}</span>
            <span class="text-ink-600">·</span>
            <span>{{ post.readingMinutes }} min read</span>
          </div>

          <div class="mt-4 text-sm text-ink-500">
            {{ post.viewCount }} views
          </div>

          <!-- 文章正文 -->
          <div class="mt-10 blog-content" v-html="renderedContent" />

          <!-- 文章内 CTA -->
          <div class="mt-12 rounded-2xl border border-accent/20 bg-accent/5 p-8 text-center">
            <h3 class="font-display text-xl font-700 text-white">Ready to Create?</h3>
            <p class="mt-2 text-ink-300">Try CraftAI free — no credit card required.</p>
            <NuxtLink to="/create" class="btn-primary mt-5 inline-flex !h-11 !px-7">
              Start Creating Free
            </NuxtLink>
          </div>
        </article>

        <!-- 404 -->
        <div v-else class="text-center py-20">
          <h1 class="font-display text-3xl font-700 text-white">Article Not Found</h1>
          <p class="mt-4 text-ink-400">The article you are looking for does not exist.</p>
          <NuxtLink to="/blog" class="btn-secondary mt-6 inline-flex">Back to Blog</NuxtLink>
        </div>

        <!-- 相关文章 -->
        <aside v-if="related.length" class="mt-16 border-t border-white/[0.06] pt-12">
          <h2 class="font-display text-xl font-700 text-white mb-6">Related Articles</h2>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NuxtLink
              v-for="r in related"
              :key="r.id"
              :to="`/blog/${r.slug}`"
              class="panel p-5 transition duration-200 hover:border-white/[0.12]"
            >
              <h3 class="font-display text-[15px] font-600 text-white hover:text-accent-soft transition-colors line-clamp-2">
                {{ r.title }}
              </h3>
              <p class="mt-2 text-[13px] text-ink-400 line-clamp-2">{{ r.excerpt }}</p>
              <p class="mt-3 text-xs text-ink-500">{{ r.readingMinutes }} min read</p>
            </NuxtLink>
          </div>
        </aside>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data, pending } = await useFetch(`/api/blog/${slug.value}`, {
  key: `blog-${slug.value}`,
})

const post = computed(() => data.value?.post || null)
const related = computed(() => data.value?.related || [])

// 简单的 markdown -> HTML 转换
const renderedContent = computed(() => {
  if (!post.value?.content) return ''
  return simpleMarkdownToHtml(post.value.content)
})

function simpleMarkdownToHtml(md: string): string {
  let html = md
  
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="font-display text-lg font-600 text-white mt-8 mb-3">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="font-display text-xl font-700 text-white mt-10 mb-4">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="font-display text-2xl font-800 text-white mt-12 mb-4">$1</h1>')
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-600 text-white">$1</strong>')
  
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  
  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li class="text-[15px] leading-relaxed text-ink-200 ml-4">$1</li>')
  
  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="text-[15px] leading-relaxed text-ink-200 ml-4 list-decimal">$1</li>')
  
  // Paragraphs
  html = html.replace(/^(?!<[hl]|<li)(.+)$/gm, '<p class="text-[15px] leading-relaxed text-ink-200 mt-4">$1</p>')
  
  // Clean up empty paragraphs
  html = html.replace(/<p class="[^"]*">\s*<\/p>/g, '')
  
  return html
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// 动态 SEO
watchEffect(() => {
  if (!post.value) return
  const p = post.value
  useHead({
    title: `${p.metaTitle || p.title} | CraftAI Blog`,
    meta: [
      { name: 'description', content: p.metaDescription || p.excerpt },
      { property: 'og:title', content: p.title },
      { property: 'og:description', content: p.excerpt },
      { property: 'og:type', content: 'article' },
      { property: 'article:published_time', content: p.publishedAt },
      { property: 'article:author', content: p.authorName },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: p.title },
      { name: 'twitter:description', content: p.excerpt },
    ],
    link: [{ rel: 'canonical', href: `https://creator.yozzytools.com/blog/${p.slug}` }],
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: p.title,
          description: p.excerpt,
          author: { '@type': 'Organization', name: p.authorName },
          datePublished: p.publishedAt,
          dateModified: p.updatedAt,
          publisher: {
            '@type': 'Organization',
            name: 'CraftAI',
            logo: { '@type': 'ImageObject', url: 'https://creator.yozzytools.com/logo.png' },
          },
        }),
      },
    ],
  })
})
</script>

<style scoped>
.content-page {
  position: relative;
}

.content-glow {
  pointer-events: none;
  position: absolute;
  inset: -5% -10% auto -10%;
  height: 40%;
  background: radial-gradient(ellipse at 50% 0%, rgba(139, 124, 255, 0.1), transparent 60%);
  z-index: 0;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
