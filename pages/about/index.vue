<template>
  <div class="content-page">
    <!-- Glow -->
    <div class="content-glow" />

    <section class="relative py-20 sm:py-28">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <span class="content-badge">About Us</span>
          <h1 class="font-display text-4xl font-800 tracking-tight text-white sm:text-5xl mt-4">
            About CraftAI
          </h1>
        </div>

        <div class="mt-14 space-y-6">
          <div class="panel p-8">
            <p class="text-[15px] leading-relaxed text-ink-200">
              CraftAI is an AI-powered creative studio that lets anyone generate music, images, and lyrics in seconds. Built for creators, marketers, and hobbyists who want to bring their ideas to life without complex tools.
            </p>
          </div>
          <div class="panel p-8">
            <p class="text-[15px] leading-relaxed text-ink-200">
              Our mission is to democratize creative content generation. Whether you need a soundtrack for your video, artwork for your social media, or lyrics for your next song — CraftAI makes it effortless.
            </p>
          </div>
        </div>

        <div class="mt-12 grid gap-6 sm:grid-cols-2">
          <div class="panel p-8 transition duration-200 hover:border-white/[0.12]">
            <div class="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-accent/15">
              <span class="i-ph-cpu text-xl text-accent-soft" />
            </div>
            <h2 class="font-display text-lg font-600 text-white">Our Technology</h2>
            <p class="mt-2 text-[14px] leading-relaxed text-ink-300">Powered by advanced AI models including MiniMax for high-quality music and image generation.</p>
          </div>
          <div class="panel p-8 transition duration-200 hover:border-white/[0.12]">
            <div class="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-accent/15">
              <span class="i-ph-shield-check text-xl text-accent-soft" />
            </div>
            <h2 class="font-display text-lg font-600 text-white">Privacy First</h2>
            <p class="mt-2 text-[14px] leading-relaxed text-ink-300">Your prompts and creations are encrypted. We never use your data to train models.</p>
          </div>
        </div>

        <div class="mt-12 text-center">
          <NuxtLink to="/create" class="btn-primary !h-11 !px-7">
            Start Creating Free
          </NuxtLink>
        </div>
      </div>
    </section>
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
