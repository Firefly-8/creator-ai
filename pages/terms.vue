<template>
  <div class="py-16 sm:py-24">
    <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <h1 class="font-display text-4xl font-800 text-white sm:text-5xl">Terms of Service</h1>
      <p class="mt-4 text-sm text-ink-400">Last updated: August 2026</p>
      
      <div class="mt-10 space-y-8">
        <section>
          <h2 class="font-display text-2xl font-600 text-white">1. Acceptance of Terms</h2>
          <p class="mt-3 text-ink-300 leading-relaxed">
            By accessing or using CraftAI, you agree to be bound by these Terms of Service. 
            If you do not agree, do not use our service.
          </p>
        </section>
        
        <section>
          <h2 class="font-display text-2xl font-600 text-white">2. Description of Service</h2>
          <p class="mt-3 text-ink-300 leading-relaxed">
            CraftAI provides AI-powered tools for generating music, images, and lyrics. 
            Service availability and output quality may vary based on the AI models used.
          </p>
        </section>
        
        <section>
          <h2 class="font-display text-2xl font-600 text-white">3. User Accounts</h2>
          <p class="mt-3 text-ink-300 leading-relaxed">
            You are responsible for maintaining the security of your account. You must provide 
            accurate information and keep your login credentials confidential.
          </p>
        </section>
        
        <section>
          <h2 class="font-display text-2xl font-600 text-white">4. Acceptable Use</h2>
          <p class="mt-3 text-ink-300 leading-relaxed">
            You may not use CraftAI to generate content that is illegal, harmful, or infringes 
            on others' rights. We reserve the right to suspend accounts that violate these terms.
          </p>
        </section>
        
        <section>
          <h2 class="font-display text-2xl font-600 text-white">5. Intellectual Property</h2>
          <p class="mt-3 text-ink-300 leading-relaxed">
            You retain rights to content you create using CraftAI. Paid plans include commercial 
            usage licenses. Free plan outputs may include watermarks.
          </p>
        </section>
        
        <section>
          <h2 class="font-display text-2xl font-600 text-white">6. Payment & Subscriptions</h2>
          <p class="mt-3 text-ink-300 leading-relaxed">
            Paid subscriptions are billed monthly via PayPal. You can cancel at any time. 
            Refunds are handled per PayPal's policies.
          </p>
        </section>
        
        <section>
          <h2 class="font-display text-2xl font-600 text-white">7. Limitation of Liability</h2>
          <p class="mt-3 text-ink-300 leading-relaxed">
            CraftAI is provided "as is" without warranties. We are not liable for any damages 
            arising from your use of the service.
          </p>
        </section>
        
        <section>
          <h2 class="font-display text-2xl font-600 text-white">8. Contact</h2>
          <p class="mt-3 text-ink-300 leading-relaxed">
            For questions about these terms, contact legal@craftai.ai.
          </p>
        </section>
      </div>
    </div>
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
