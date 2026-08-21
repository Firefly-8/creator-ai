<template>
  <div class="content-page">
    <!-- Glow -->
    <div class="content-glow" />

    <section class="relative py-20 sm:py-28">
      <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <span class="content-badge">Blog</span>
          <h1 class="font-display text-4xl font-800 tracking-tight text-white sm:text-5xl mt-4">
            CraftAI Blog
          </h1>
          <p class="mx-auto mt-4 max-w-xl text-lg text-ink-300">
            Tips, tutorials, and updates on AI music and image generation.
          </p>
        </div>

        <div class="mt-14 space-y-5">
          <article class="panel p-7 transition duration-200 hover:border-white/[0.12]">
            <NuxtLink to="/blog/getting-started" class="block">
              <h2 class="font-display text-xl font-600 text-white hover:text-accent-soft transition-colors">
                Getting Started with AI Music Generation
              </h2>
              <p class="mt-2.5 text-[14px] leading-relaxed text-ink-300">
                Learn how to create your first AI-generated song in minutes. From writing prompts to choosing styles — a complete beginner's guide.
              </p>
              <p class="mt-4 text-sm text-ink-400">August 2026 · 5 min read</p>
            </NuxtLink>
          </article>

          <article class="panel p-7 transition duration-200 hover:border-white/[0.12]">
            <NuxtLink to="/blog/ai-image-prompts" class="block">
              <h2 class="font-display text-xl font-600 text-white hover:text-accent-soft transition-colors">
                How to Write Effective AI Image Prompts
              </h2>
              <p class="mt-2.5 text-[14px] leading-relaxed text-ink-300">
                Master the art of prompt engineering for AI image generation. Tips, examples, and common mistakes to avoid.
              </p>
              <p class="mt-4 text-sm text-ink-400">August 2026 · 7 min read</p>
            </NuxtLink>
          </article>

          <article class="panel p-7 transition duration-200 hover:border-white/[0.12]">
            <NuxtLink to="/blog/music-marketing" class="block">
              <h2 class="font-display text-xl font-600 text-white hover:text-accent-soft transition-colors">
                Using AI Music for Content Marketing
              </h2>
              <p class="mt-2.5 text-[14px] leading-relaxed text-ink-300">
                Discover how creators and marketers use AI-generated music for videos, podcasts, and social media content.
              </p>
              <p class="mt-4 text-sm text-ink-400">August 2026 · 6 min read</p>
            </NuxtLink>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Blog — CraftAI AI Music & Image Tips',
  meta: [
    { name: 'description', content: 'Learn about AI music generation, image prompt engineering, and content marketing tips. Tutorials and guides from the CraftAI team.' },
    { property: 'og:title', content: 'CraftAI Blog' },
    { property: 'og:description', content: 'AI music, image generation tips, and tutorials.' },
    { property: 'og:type', content: 'blog' },
  ],
  link: [{ rel: 'canonical', href: 'https://craftai.ai/blog' }],
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

.content-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(139, 124, 255, 0.2);
  background: rgba(139, 124, 255, 0.08);
  color: var(--accent-soft);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}
</style>
