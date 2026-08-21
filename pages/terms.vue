<template>
  <div class="content-page">
    <!-- Glow -->
    <div class="content-glow" />

    <section class="relative py-20 sm:py-28">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <span class="content-badge">Legal</span>
          <h1 class="font-display text-4xl font-800 tracking-tight text-white sm:text-5xl mt-4">
            Terms of Service
          </h1>
          <p class="mt-3 text-sm text-ink-400">Last updated: August 2026</p>
        </div>

        <div class="mt-14 space-y-5">
          <div class="panel p-7">
            <h2 class="font-display text-lg font-600 text-white">1. Acceptance of Terms</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">
              By accessing or using CraftAI, you agree to be bound by these Terms of Service. If you do not agree, do not use our service.
            </p>
          </div>

          <div class="panel p-7">
            <h2 class="font-display text-lg font-600 text-white">2. Description of Service</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">
              CraftAI provides AI-powered tools for generating music, images, and lyrics. Service availability and output quality may vary based on the AI models used.
            </p>
          </div>

          <div class="panel p-7">
            <h2 class="font-display text-lg font-600 text-white">3. User Accounts</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">
              You are responsible for maintaining the security of your account. You must provide accurate information and keep your login credentials confidential.
            </p>
          </div>

          <div class="panel p-7">
            <h2 class="font-display text-lg font-600 text-white">4. Acceptable Use</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">
              You may not use CraftAI to generate content that is illegal, harmful, or infringes on others' rights. We reserve the right to suspend accounts that violate these terms.
            </p>
          </div>

          <div class="panel p-7">
            <h2 class="font-display text-lg font-600 text-white">5. Intellectual Property</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">
              You retain rights to content you create using CraftAI. Paid plans include commercial usage licenses. Free plan outputs may include watermarks.
            </p>
          </div>

          <div class="panel p-7">
            <h2 class="font-display text-lg font-600 text-white">6. Payment & Subscriptions</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">
              Paid subscriptions are billed monthly via PayPal. You can cancel at any time. Refunds are handled per PayPal's policies.
            </p>
          </div>

          <div class="panel p-7">
            <h2 class="font-display text-lg font-600 text-white">7. Limitation of Liability</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">
              CraftAI is provided "as is" without warranties. We are not liable for any damages arising from your use of the service.
            </p>
          </div>

          <div class="panel p-7">
            <h2 class="font-display text-lg font-600 text-white">8. Contact</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">
              For questions about these terms, contact <a href="mailto:legal@craftai.ai" class="text-accent-soft hover:text-accent">legal@craftai.ai</a>.
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Terms of Service — CraftAI',
  meta: [
    { name: 'description', content: 'CraftAI Terms of Service. Read our terms for using the AI music and image generation platform.' },
    { property: 'og:title', content: 'Terms of Service — CraftAI' },
    { robots: 'index, follow' },
  ],
  link: [{ rel: 'canonical', href: 'https://craftai.ai/terms' }],
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
