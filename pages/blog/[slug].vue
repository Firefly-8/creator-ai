<template>
  <div class="py-16 sm:py-24">
    <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <template v-if="post">
        <NuxtLink to="/blog" class="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-accent-soft transition-colors">
          <span class="i-ph-arrow-left" /> Back to Blog
        </NuxtLink>
        <article class="mt-8">
          <h1 class="font-display text-4xl font-800 text-white sm:text-5xl">{{ post.title }}</h1>
          <div class="mt-4 flex items-center gap-4 text-sm text-ink-400">
            <span>{{ post.date }}</span>
            <span>·</span>
            <span>{{ post.readTime }}</span>
          </div>
          <div class="mt-10 prose prose-invert max-w-none" v-html="post.content" />
        </article>
      </template>
      <template v-else>
        <div class="text-center py-20">
          <h1 class="font-display text-3xl font-700 text-white">Post Not Found</h1>
          <p class="mt-4 text-ink-300">The blog post you're looking for doesn't exist.</p>
          <NuxtLink to="/blog" class="btn-primary mt-8 inline-flex !h-12 !px-8">
            Back to Blog
          </NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

interface BlogPost {
  title: string
  date: string
  readTime: string
  content: string
}

const posts: Record<string, BlogPost> = {
  'getting-started': {
    title: 'Getting Started with AI Music Generation',
    date: 'August 2026',
    readTime: '5 min read',
    content: '<p class="text-ink-300 text-lg leading-relaxed">AI music generation has never been more accessible. With CraftAI, you can create professional-quality music in minutes — no musical training required.</p><h2 class="font-display text-2xl font-600 text-white mt-10 mb-4">What You Will Need</h2><p class="text-ink-300 leading-relaxed">All you need is an idea. Describe the mood, style, or genre you want, and our AI will generate a complete track for you.</p><h2 class="font-display text-2xl font-600 text-white mt-10 mb-4">Step-by-Step Guide</h2><ol class="list-decimal list-inside text-ink-300 space-y-3 leading-relaxed"><li><strong class="text-white">Sign up</strong> for a free CraftAI account</li><li><strong class="text-white">Go to Create</strong> and choose Music</li><li><strong class="text-white">Write your prompt</strong> — describe the style, mood, tempo</li><li><strong class="text-white">Click Generate</strong> and wait for your track</li><li><strong class="text-white">Download or share</strong> your creation</li></ol><h2 class="font-display text-2xl font-600 text-white mt-10 mb-4">Tips for Better Results</h2><ul class="list-disc list-inside text-ink-300 space-y-3 leading-relaxed"><li>Be specific about genre: upbeat electronic vs melancholy piano</li><li>Mention the intended use: background music for podcast</li><li>Describe the energy: high-energy workout track or calm meditation music</li></ul><p class="text-ink-300 leading-relaxed mt-8">Ready to create your first AI-generated song? <a href="/create" class="text-accent-soft hover:text-accent">Start creating for free</a></p>'
  },
  'ai-image-prompts': {
    title: 'How to Write Effective AI Image Prompts',
    date: 'August 2026',
    readTime: '7 min read',
    content: '<p class="text-ink-300 text-lg leading-relaxed">The key to stunning AI image generation lies in your prompts. Here is how to write prompts that produce professional-quality results.</p><h2 class="font-display text-2xl font-600 text-white mt-10 mb-4">The Anatomy of a Good Prompt</h2><p class="text-ink-300 leading-relaxed">A great prompt includes: <strong class="text-white">subject</strong>, <strong class="text-white">style</strong>, <strong class="text-white">lighting</strong>, and <strong class="text-white">composition</strong>.</p><h2 class="font-display text-2xl font-600 text-white mt-10 mb-4">Example Prompts</h2><div class="bg-white/5 rounded-xl p-6 border border-white/10 my-6"><p class="text-accent-soft font-mono text-sm">A cyberpunk cityscape at sunset, neon lights reflecting on wet streets, cinematic composition, 4K, highly detailed</p></div><h2 class="font-display text-2xl font-600 text-white mt-10 mb-4">Common Mistakes to Avoid</h2><ul class="list-disc list-inside text-ink-300 space-y-3 leading-relaxed"><li>Being too vague: a nice picture</li><li>Overloading with too many conflicting concepts</li><li>Not specifying the desired art style</li><li>Forgetting to mention quality keywords</li></ul><p class="text-ink-300 leading-relaxed mt-8">Try these techniques in <a href="/image" class="text-accent-soft hover:text-accent">CraftAI Image Generator</a></p>'
  },
  'music-marketing': {
    title: 'Using AI Music for Content Marketing',
    date: 'August 2026',
    readTime: '6 min read',
    content: '<p class="text-ink-300 text-lg leading-relaxed">AI-generated music is transforming content marketing. Creators and businesses are using tools like CraftAI to produce royalty-free background music for their content.</p><h2 class="font-display text-2xl font-600 text-white mt-10 mb-4">Why AI Music for Marketing?</h2><ul class="list-disc list-inside text-ink-300 space-y-3 leading-relaxed"><li><strong class="text-white">Cost-effective</strong> — No need to hire composers or buy expensive licenses</li><li><strong class="text-white">Instant</strong> — Generate tracks in seconds, not days</li><li><strong class="text-white">Customizable</strong> — Match the exact mood and length you need</li><li><strong class="text-white">Royalty-free</strong> — Use your creations worry-free</li></ul><h2 class="font-display text-2xl font-600 text-white mt-10 mb-4">Use Cases</h2><p class="text-ink-300 leading-relaxed">YouTube videos, podcasts, social media content, presentations, ads — AI music fits everywhere you need a soundtrack.</p><p class="text-ink-300 leading-relaxed mt-8">Ready to create music for your content? <a href="/create" class="text-accent-soft hover:text-accent">Try CraftAI free</a></p>'
  }
}

const slug = route.params.slug as string
const post = posts[slug] || null

useHead({
  title: post ? post.title + ' — CraftAI Blog' : 'Post Not Found — CraftAI',
  meta: [
    { name: 'description', content: post ? post.content.replace(/<[^>]*>/g, '').substring(0, 160) : 'Blog post not found.' },
    ...(post ? [
      { property: 'og:title', content: post.title },
      { property: 'og:description', content: post.content.replace(/<[^>]*>/g, '').substring(0, 160) },
      { property: 'og:type', content: 'article' },
    ] : []),
  ],
  link: [{ rel: 'canonical', href: 'https://creator.yozzytools.com/blog/' + slug }],
})
</script>
