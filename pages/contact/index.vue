<template>
  <div class="py-16 sm:py-24">
    <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <h1 class="font-display text-4xl font-800 text-white sm:text-5xl">Contact Us</h1>
      <p class="mt-6 text-lg text-ink-300">
        Have questions, feedback, or need help? We'd love to hear from you.
      </p>
      <div class="mt-12 panel p-8">
        <h2 class="font-display text-xl font-600 text-white">Get in Touch</h2>
        <p class="mt-4 text-ink-300">
          Email us at: <a href="mailto:support@craftai.ai" class="text-accent-soft hover:text-accent">support@craftai.ai</a>
        </p>
        <p class="mt-4 text-ink-300">
          For business inquiries: <a href="mailto:business@craftai.ai" class="text-accent-soft hover:text-accent">business@craftai.ai</a>
        </p>
        <p class="mt-4 text-ink-300">
          Response time: Usually within 24 hours.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Contact CraftAI — Get Support & Help',
  meta: [
    { name: 'description', content: 'Contact CraftAI support. Get help with your account, billing, or technical issues. Email us at support@craftai.ai.' },
    { property: 'og:title', content: 'Contact CraftAI' },
    { property: 'og:description', content: 'Get support, ask questions, or send feedback.' },
  ],
  link: [{ rel: 'canonical', href: 'https://craftai.ai/contact' }],
})
</script>
