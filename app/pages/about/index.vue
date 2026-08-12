<template>
  <div class="py-16 sm:py-24">
    <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <h1 class="font-display text-4xl font-800 text-white sm:text-5xl">About CraftAI</h1>
      <p class="mt-6 text-lg leading-relaxed text-ink-300">
        CraftAI is an AI-powered creative studio that lets anyone generate music, images, and lyrics in seconds. 
        Built for creators, marketers, and hobbyists who want to bring their ideas to life without complex tools.
      </p>
      <p class="mt-4 text-lg leading-relaxed text-ink-300">
        Our mission is to democratize creative content generation. Whether you need a soundtrack for your video, 
        artwork for your social media, or lyrics for your next song — CraftAI makes it effortless.
      </p>
      <div class="mt-12 grid gap-8 sm:grid-cols-2">
        <div class="panel p-6">
          <h2 class="font-display text-xl font-600 text-white">Our Technology</h2>
          <p class="mt-2 text-ink-300">Powered by advanced AI models including MiniMax for high-quality music and image generation.</p>
        </div>
        <div class="panel p-6">
          <h2 class="font-display text-xl font-600 text-white">Privacy First</h2>
          <p class="mt-2 text-ink-300">Your prompts and creations are encrypted. We never use your data to train models.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'About CraftAI — AI Music & Image Studio',
  meta: [
    { name: 'description', content: 'Learn about CraftAI — the AI-powered creative studio for generating music, images, and lyrics. Privacy-first, creator-friendly.' },
    { property: 'og:title', content: 'About CraftAI' },
    { property: 'og:description', content: 'AI-powered creative studio for music, images, and lyrics.' },
    { property: 'og:type', content: 'website' },
  ],
  link: [{ rel: 'canonical', href: 'https://craftai.ai/about' }],
})
</script>
