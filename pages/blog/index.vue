<template>
  <div class="py-16 sm:py-24">
    <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <h1 class="font-display text-4xl font-800 text-white sm:text-5xl">CraftAI Blog</h1>
      <p class="mt-4 text-lg text-ink-300">
        Tips, tutorials, and updates on AI music and image generation.
      </p>
      
      <div class="mt-12 space-y-8">
        <article class="panel p-8">
          <NuxtLink to="/blog/getting-started" class="block">
            <h2 class="font-display text-2xl font-600 text-white hover:text-accent-soft transition-colors">
              Getting Started with AI Music Generation
            </h2>
            <p class="mt-3 text-ink-300">
              Learn how to create your first AI-generated song in minutes. From writing prompts 
              to choosing styles — a complete beginner's guide.
            </p>
            <p class="mt-4 text-sm text-ink-400">August 2026 · 5 min read</p>
          </NuxtLink>
        </article>
        
        <article class="panel p-8">
          <NuxtLink to="/blog/ai-image-prompts" class="block">
            <h2 class="font-display text-2xl font-600 text-white hover:text-accent-soft transition-colors">
              How to Write Effective AI Image Prompts
            </h2>
            <p class="mt-3 text-ink-300">
              Master the art of prompt engineering for AI image generation. Tips, examples, 
              and common mistakes to avoid.
            </p>
            <p class="mt-4 text-sm text-ink-400">August 2026 · 7 min read</p>
          </NuxtLink>
        </article>
        
        <article class="panel p-8">
          <NuxtLink to="/blog/music-marketing" class="block">
            <h2 class="font-display text-2xl font-600 text-white hover:text-accent-soft transition-colors">
              Using AI Music for Content Marketing
            </h2>
            <p class="mt-3 text-ink-300">
              Discover how creators and marketers use AI-generated music for videos, 
              podcasts, and social media content.
            </p>
            <p class="mt-4 text-sm text-ink-400">August 2026 · 6 min read</p>
          </NuxtLink>
        </article>
      </div>
    </div>
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
