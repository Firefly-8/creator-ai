<template>
  <div class="content-page">
    <!-- Glow -->
    <div class="content-glow" />

    <section class="relative py-20 sm:py-28">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <span class="content-badge">Legal</span>
          <h1 class="font-display text-4xl font-800 tracking-tight text-white sm:text-5xl mt-4">
            Privacy Policy
          </h1>
          <p class="mt-3 text-sm text-ink-400">Last updated: August 2026</p>
        </div>

        <div class="mt-14 space-y-5">
          <div class="panel p-7">
            <h2 class="font-display text-lg font-600 text-white">1. Information We Collect</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">
              We collect information you provide directly: email address (for account creation), and content you create using our AI tools (prompts, generated images, and audio files).
            </p>
          </div>

          <div class="panel p-7">
            <h2 class="font-display text-lg font-600 text-white">2. How We Use Your Information</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">
              We use your information to provide and improve our services, process subscriptions, and communicate with you about your account. We do NOT use your prompts or creations to train AI models.
            </p>
          </div>

          <div class="panel p-7">
            <h2 class="font-display text-lg font-600 text-white">3. Data Security</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">
              All sensitive data (prompts, lyrics, metadata) is encrypted at rest using AES-256-GCM. API keys are encrypted and decrypted only at runtime. We use Cloudflare's infrastructure for secure, global delivery.
            </p>
          </div>

          <div class="panel p-7">
            <h2 class="font-display text-lg font-600 text-white">4. Data Retention</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">
              Your account data is retained as long as your account is active. Generated content is stored for your access and can be deleted at any time from your dashboard.
            </p>
          </div>

          <div class="panel p-7">
            <h2 class="font-display text-lg font-600 text-white">5. Third-Party Services</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">
              We use PayPal for payment processing. We use MiniMax for AI model inference. These services have their own privacy policies governing their use of your data.
            </p>
          </div>

          <div class="panel p-7">
            <h2 class="font-display text-lg font-600 text-white">6. Your Rights</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">
              You can request deletion of your account and all associated data by emailing <a href="mailto:support@craftai.ai" class="text-accent-soft hover:text-accent">support@craftai.ai</a>. We will process your request within 30 days.
            </p>
          </div>

          <div class="panel p-7">
            <h2 class="font-display text-lg font-600 text-white">7. Contact</h2>
            <p class="mt-2.5 text-[14.5px] leading-relaxed text-ink-300">
              For privacy-related questions, contact us at <a href="mailto:privacy@craftai.ai" class="text-accent-soft hover:text-accent">privacy@craftai.ai</a>.
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Privacy Policy — CraftAI',
  meta: [
    { name: 'description', content: 'CraftAI Privacy Policy. Learn how we collect, use, and protect your data. Your prompts and creations are encrypted and never used for training.' },
    { property: 'og:title', content: 'Privacy Policy — CraftAI' },
    { robots: 'index, follow' },
  ],
  link: [{ rel: 'canonical', href: 'https://creator.yozzytools.com/privacy' }],
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
