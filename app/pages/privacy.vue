<template>
  <div class="py-16 sm:py-24">
    <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <h1 class="font-display text-4xl font-800 text-white sm:text-5xl">Privacy Policy</h1>
      <p class="mt-4 text-sm text-ink-400">Last updated: August 2026</p>
      
      <div class="mt-10 space-y-8">
        <section>
          <h2 class="font-display text-2xl font-600 text-white">1. Information We Collect</h2>
          <p class="mt-3 text-ink-300 leading-relaxed">
            We collect information you provide directly: email address (for account creation), 
            and content you create using our AI tools (prompts, generated images, and audio files).
          </p>
        </section>
        
        <section>
          <h2 class="font-display text-2xl font-600 text-white">2. How We Use Your Information</h2>
          <p class="mt-3 text-ink-300 leading-relaxed">
            We use your information to provide and improve our services, process subscriptions, 
            and communicate with you about your account. We do NOT use your prompts or creations 
            to train AI models.
          </p>
        </section>
        
        <section>
          <h2 class="font-display text-2xl font-600 text-white">3. Data Security</h2>
          <p class="mt-3 text-ink-300 leading-relaxed">
            All sensitive data (prompts, lyrics, metadata) is encrypted at rest using AES-256-GCM. 
            API keys are encrypted and decrypted only at runtime. We use Cloudflare's infrastructure 
            for secure, global delivery.
          </p>
        </section>
        
        <section>
          <h2 class="font-display text-2xl font-600 text-white">4. Data Retention</h2>
          <p class="mt-3 text-ink-300 leading-relaxed">
            Your account data is retained as long as your account is active. Generated content 
            is stored for your access and can be deleted at any time from your dashboard.
          </p>
        </section>
        
        <section>
          <h2 class="font-display text-2xl font-600 text-white">5. Third-Party Services</h2>
          <p class="mt-3 text-ink-300 leading-relaxed">
            We use PayPal for payment processing. We use MiniMax for AI model inference. 
            These services have their own privacy policies governing their use of your data.
          </p>
        </section>
        
        <section>
          <h2 class="font-display text-2xl font-600 text-white">6. Your Rights</h2>
          <p class="mt-3 text-ink-300 leading-relaxed">
            You can request deletion of your account and all associated data by emailing 
            support@craftai.ai. We will process your request within 30 days.
          </p>
        </section>
        
        <section>
          <h2 class="font-display text-2xl font-600 text-white">7. Contact</h2>
          <p class="mt-3 text-ink-300 leading-relaxed">
            For privacy-related questions, contact us at privacy@craftai.ai.
          </p>
        </section>
      </div>
    </div>
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
  link: [{ rel: 'canonical', href: 'https://craftai.ai/privacy' }],
})
</script>
