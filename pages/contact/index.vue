<template>
  <div class="content-page">
    <!-- Glow -->
    <div class="content-glow" />

    <section class="relative py-20 sm:py-28">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <span class="content-badge">Contact</span>
          <h1 class="font-display text-4xl font-800 tracking-tight text-white sm:text-5xl mt-4">
            Get in Touch
          </h1>
          <p class="mx-auto mt-4 max-w-xl text-lg text-ink-300">
            Have questions, feedback, or need help? We'd love to hear from you.
          </p>
        </div>

        <div class="mt-12 panel p-8 sm:p-10">
          <div class="space-y-6">
            <div class="flex items-start gap-4">
              <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15">
                <span class="i-ph-envelope-simple text-lg text-accent-soft" />
              </div>
              <div>
                <h3 class="font-display text-[15px] font-600 text-white">General Support</h3>
                <a href="mailto:support@craftai.ai" class="mt-1 text-[14px] text-accent-soft hover:text-accent transition-colors">support@craftai.ai</a>
              </div>
            </div>
            <div class="border-t border-white/[0.06]"></div>
            <div class="flex items-start gap-4">
              <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15">
                <span class="i-ph-briefcase text-lg text-accent-soft" />
              </div>
              <div>
                <h3 class="font-display text-[15px] font-600 text-white">Business Inquiries</h3>
                <a href="mailto:business@craftai.ai" class="mt-1 text-[14px] text-accent-soft hover:text-accent transition-colors">business@craftai.ai</a>
              </div>
            </div>
            <div class="border-t border-white/[0.06]"></div>
            <div class="flex items-start gap-4">
              <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15">
                <span class="i-ph-clock text-lg text-accent-soft" />
              </div>
              <div>
                <h3 class="font-display text-[15px] font-600 text-white">Response Time</h3>
                <p class="mt-1 text-[14px] text-ink-300">Usually within 24 hours.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
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
