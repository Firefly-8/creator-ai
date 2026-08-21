<template>
  <div class="pricing-page">
    <!-- Glow -->
    <div class="pricing-glow" />

    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative">
      <!-- Header -->
      <div class="text-center max-w-2xl mx-auto">
        <span class="pricing-badge">{{ $t('pricing.badge', 'Simple Pricing') }}</span>
        <h1 class="font-display text-4xl font-800 text-white sm:text-5xl mt-4 leading-tight">
          {{ $t('pricing.title') }}
        </h1>
        <p class="mt-4 text-lg text-ink-300 leading-relaxed">{{ $t('pricing.subtitle') }}</p>
      </div>

      <!-- Billing Toggle -->
      <div class="mt-10 flex items-center justify-center gap-3">
        <button
          class="billing-toggle__label"
          :class="{ 'is-active': !annual }"
          @click="annual = false"
        >
          {{ $t('pricing.monthly', 'Monthly') }}
        </button>
        <button
          class="billing-toggle"
          :class="{ 'is-annual': annual }"
          role="switch"
          :aria-checked="annual"
          :aria-label="t('pricing.toggleBilling', 'Toggle annual billing')"
          @click="annual = !annual"
        >
          <span class="billing-toggle__thumb" />
        </button>
        <button
          class="billing-toggle__label"
          :class="{ 'is-active': annual }"
          @click="annual = true"
        >
          {{ $t('pricing.annual', 'Annual') }}
          <span class="billing-toggle__save">{{ $t('pricing.save20', 'Save 20%') }}</span>
        </button>
      </div>

      <!-- Plans -->
      <div class="mt-12 grid gap-6 lg:gap-8 lg:grid-cols-3 items-start">
        <!-- Free -->
        <div class="plan-card plan-card--free">
          <div class="plan-card__head">
            <h2 class="plan-card__name">{{ $t('pricing.free') }}</h2>
            <p class="plan-card__desc">{{ $t('pricing.freeDesc', 'Try it out, no strings attached') }}</p>
          </div>
          <div class="plan-card__price">
            <span class="plan-card__amount">$0</span>
            <span class="plan-card__period">{{ $t('pricing.forever', 'forever') }}</span>
          </div>
          <NuxtLink to="/create" class="plan-card__cta plan-card__cta--ghost">
            {{ $t('pricing.getStarted') }}
            <span class="i-ph-arrow-right text-[14px]" />
          </NuxtLink>
          <div class="plan-card__divider" />
          <ul class="plan-card__features">
            <li><span class="plan-card__check" />{{ $t('pricing.f_free1', '10 music generations/month') }}</li>
            <li><span class="plan-card__check" />{{ $t('pricing.f_free2', '20 image generations/month') }}</li>
            <li><span class="plan-card__check" />{{ $t('pricing.f_free3', 'Basic quality output') }}</li>
            <li><span class="plan-card__check" />{{ $t('pricing.f_free4', 'Community support') }}</li>
          </ul>
        </div>

        <!-- Creator (Popular) -->
        <div class="plan-card plan-card--popular">
          <div class="plan-card__popular-badge">
            <span class="i-ph-crown text-[12px]" />
            {{ $t('pricing.popular') }}
          </div>
          <div class="plan-card__head">
            <h2 class="plan-card__name">{{ $t('pricing.creator') }}</h2>
            <p class="plan-card__desc">{{ $t('pricing.creatorDesc', 'For creators who want more') }}</p>
          </div>
          <div class="plan-card__price">
            <span class="plan-card__amount">{{ annual ? '$7.99' : '$9.99' }}</span>
            <span class="plan-card__period">{{ $t('pricing.perMonth') }}</span>
          </div>
          <p v-if="annual" class="plan-card__billed">{{ $t('pricing.billedAnnually', '{price} billed annually', { price: '$95.88' }) }}</p>
          <NuxtLink to="/signup?plan=creator" class="plan-card__cta plan-card__cta--primary">
            {{ $t('pricing.subscribe') }}
            <span class="i-ph-arrow-right text-[14px]" />
          </NuxtLink>
          <div class="plan-card__divider" />
          <ul class="plan-card__features">
            <li><span class="plan-card__check" />{{ $t('pricing.f_creator1', '100 music generations/month') }}</li>
            <li><span class="plan-card__check" />{{ $t('pricing.f_creator2', '200 image generations/month') }}</li>
            <li><span class="plan-card__check" />{{ $t('pricing.f_creator3', 'HD quality, no watermark') }}</li>
            <li><span class="plan-card__check" />{{ $t('pricing.f_creator4', 'Commercial license') }}</li>
            <li><span class="plan-card__check" />{{ $t('pricing.f_creator5', 'Priority support') }}</li>
          </ul>
        </div>

        <!-- Pro -->
        <div class="plan-card plan-card--pro">
          <div class="plan-card__head">
            <h2 class="plan-card__name">{{ $t('pricing.pro') }}</h2>
            <p class="plan-card__desc">{{ $t('pricing.proDesc', 'Maximum power for professionals') }}</p>
          </div>
          <div class="plan-card__price">
            <span class="plan-card__amount">{{ annual ? '$15.99' : '$19.99' }}</span>
            <span class="plan-card__period">{{ $t('pricing.perMonth') }}</span>
          </div>
          <p v-if="annual" class="plan-card__billed">{{ $t('pricing.billedAnnually', '{price} billed annually', { price: '$191.88' }) }}</p>
          <NuxtLink to="/signup?plan=pro" class="plan-card__cta plan-card__cta--outline">
            {{ $t('pricing.subscribe') }}
            <span class="i-ph-arrow-right text-[14px]" />
          </NuxtLink>
          <div class="plan-card__divider" />
          <ul class="plan-card__features">
            <li><span class="plan-card__check" />{{ $t('pricing.f_pro1', '300 music generations/month') }}</li>
            <li><span class="plan-card__check" />{{ $t('pricing.f_pro2', '500 image generations/month') }}</li>
            <li><span class="plan-card__check" />{{ $t('pricing.f_pro3', 'HD quality, no watermark') }}</li>
            <li><span class="plan-card__check" />{{ $t('pricing.f_pro4', 'API access') }}</li>
            <li><span class="plan-card__check" />{{ $t('pricing.f_pro5', 'Dedicated support') }}</li>
          </ul>
        </div>
      </div>

      <!-- Trust line -->
      <div class="mt-12 text-center">
        <p class="text-sm text-ink-400 flex items-center justify-center gap-4 flex-wrap">
          <span class="flex items-center gap-1.5"><span class="i-ph-shield-check text-accent-soft" />{{ $t('pricing.trustSecure', 'Secure payment via PayPal') }}</span>
          <span class="text-ink-600">·</span>
          <span class="flex items-center gap-1.5"><span class="i-ph-arrow-counter-clockwise text-accent-soft" />{{ $t('pricing.trustCancel', 'Cancel anytime') }}</span>
          <span class="text-ink-600">·</span>
          <span class="flex items-center gap-1.5"><span class="i-ph-lightning text-accent-soft" />{{ $t('pricing.trustInstant', 'Instant activation') }}</span>
        </p>
      </div>

      <!-- FAQ -->
      <div class="mt-20 max-w-3xl mx-auto">
        <h2 class="font-display text-2xl font-700 text-white text-center mb-8">{{ $t('pricing.faq.title') }}</h2>
        <div class="space-y-3">
          <div v-for="(item, i) in faqItems" :key="i" class="faq-item" :class="{ 'is-open': openFaq === i }">
            <button class="faq-item__q" @click="openFaq = openFaq === i ? null : i">
              <span class="text-white font-medium text-sm">{{ item.q }}</span>
              <span class="i-ph-caret-down text-ink-400 transition-transform faq-item__icon" :class="{ 'rotate-180': openFaq === i }" />
            </button>
            <Transition name="faq">
              <div v-if="openFaq === i" class="faq-item__a">
                <p class="text-ink-300 text-sm leading-relaxed">{{ item.a }}</p>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const annual = ref(false)
const openFaq = ref<number | null>(null)

const faqItems = computed(() => [
  { q: t('pricing.faq.commercial.q'), a: t('pricing.faq.commercial.a') },
  { q: t('pricing.faq.payment.q'), a: t('pricing.faq.payment.a') },
  { q: t('pricing.faq.cancel.q'), a: t('pricing.faq.cancel.a') },
  { q: t('pricing.faq.switch.q', 'Can I switch plans later?'), a: t('pricing.faq.switch.a', 'Yes, upgrade or downgrade anytime. Changes take effect immediately.') },
  { q: t('pricing.faq.free_generations.q', 'What counts as a generation?'), a: t('pricing.faq.free_generations.a', 'Each time you click Generate and receive output, that counts as one generation. Failed generations do not count.') },
])

useHead({
  title: 'Pricing — CraftAI',
  meta: [{ name: 'description', content: 'Simple pricing for CraftAI. Start free, upgrade to Creator for $9.99/month or save 20% with annual billing.' }],
  link: [{ rel: 'canonical', href: 'https://craftai.ai/pricing' }],
})
</script>

<style scoped>
.pricing-page {
  position: relative;
  min-height: 100vh;
}

.pricing-glow {
  position: absolute;
  top: -120px;
  left: 50%;
  transform: translateX(-50%);
  width: 800px;
  height: 400px;
  background: radial-gradient(ellipse at center, rgba(139, 124, 255, 0.12), transparent 70%);
  pointer-events: none;
}

.pricing-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.85rem;
  border-radius: 999px;
  background: rgba(139, 124, 255, 0.12);
  border: 1px solid rgba(139, 124, 255, 0.25);
  color: #b4a9ff;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

/* —— Billing Toggle —— */
.billing-toggle__label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.billing-toggle__label.is-active {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}

.billing-toggle__label:hover:not(.is-active) {
  color: var(--ink-2, #d0cbe0);
}

.billing-toggle {
  position: relative;
  width: 52px;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.billing-toggle.is-annual {
  background: var(--accent, #8b7cff);
  border-color: var(--accent, #8b7cff);
  box-shadow: 0 0 20px rgba(139, 124, 255, 0.3);
}

.billing-toggle__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.billing-toggle.is-annual .billing-toggle__thumb {
  transform: translateX(24px);
}

.billing-toggle__save {
  display: inline-flex;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: rgba(139, 124, 255, 0.2);
  color: #b4a9ff;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.billing-toggle__label.is-active .billing-toggle__save {
  background: var(--accent, #8b7cff);
  color: #fff;
}

/* —— Plan Cards —— */
.plan-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 2rem;
  border-radius: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(18, 16, 26, 0.7);
  backdrop-filter: blur(12px);
  transition: all 0.3s ease;
}

.plan-card:hover {
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-4px);
  box-shadow: 0 20px 48px -24px rgba(0, 0, 0, 0.6);
}

.plan-card--popular {
  border-color: rgba(139, 124, 255, 0.35);
  background: linear-gradient(180deg, rgba(139, 124, 255, 0.08) 0%, rgba(18, 16, 26, 0.7) 40%);
  box-shadow: 0 0 0 1px rgba(139, 124, 255, 0.15), 0 24px 56px -24px rgba(110, 92, 230, 0.35);
  transform: scale(1.03);
}

.plan-card--popular:hover {
  transform: scale(1.03) translateY(-4px);
  box-shadow: 0 0 0 1px rgba(139, 124, 255, 0.25), 0 32px 64px -24px rgba(110, 92, 230, 0.45);
}

.plan-card__popular-badge {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 1rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #8b7cff, #6e5ce6);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(110, 92, 230, 0.4);
}

.plan-card__head {
  margin-bottom: 1.25rem;
}

.plan-card__name {
  font-family: 'Sora', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
}

.plan-card__desc {
  margin-top: 0.35rem;
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.4;
}

.plan-card__price {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  margin-bottom: 0.35rem;
}

.plan-card__amount {
  font-family: 'Sora', sans-serif;
  font-size: 2.75rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.03em;
  line-height: 1;
}

.plan-card__period {
  font-size: 0.85rem;
  color: var(--muted);
}

.plan-card__billed {
  font-size: 0.78rem;
  color: var(--accent-soft);
  margin-bottom: 1rem;
  font-weight: 500;
}

.plan-card__cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  height: 2.85rem;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  margin-top: 1.25rem;
  text-decoration: none;
}

.plan-card__cta--primary {
  background: linear-gradient(135deg, #8b7cff, #6e5ce6);
  color: #fff;
  box-shadow: 0 4px 20px -4px rgba(110, 92, 230, 0.5);
}

.plan-card__cta--primary:hover {
  background: linear-gradient(135deg, #9b8cff, #7e6ce6);
  box-shadow: 0 8px 28px -4px rgba(110, 92, 230, 0.6);
  transform: translateY(-1px);
}

.plan-card__cta--outline {
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.plan-card__cta--outline:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.24);
  transform: translateY(-1px);
}

.plan-card__cta--ghost {
  background: transparent;
  color: var(--ink-2, #d0cbe0);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.plan-card__cta--ghost:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.18);
  transform: translateY(-1px);
}

.plan-card__cta:active {
  transform: scale(0.98);
}

.plan-card__divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
  margin: 1.5rem 0 1.25rem;
}

.plan-card__features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  flex: 1;
}

.plan-card__features li {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  font-size: 0.84rem;
  color: var(--ink-2, #d0cbe0);
  line-height: 1.4;
}

.plan-card__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(139, 124, 255, 0.15);
  color: var(--accent-soft);
  font-size: 10px;
  flex-shrink: 0;
  margin-top: 2px;
}

.plan-card__check::before {
  content: '';
  width: 10px;
  height: 10px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23b4a9ff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
}

/* —— FAQ —— */
.faq-item {
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(18, 16, 26, 0.5);
  overflow: hidden;
  transition: border-color 0.2s;
}

.faq-item:hover {
  border-color: rgba(255, 255, 255, 0.1);
}

.faq-item.is-open {
  border-color: rgba(139, 124, 255, 0.2);
}

.faq-item__q {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 1.1rem 1.25rem;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}

.faq-item__icon {
  transition: transform 0.25s ease;
  flex-shrink: 0;
  margin-left: 0.75rem;
}

.faq-item__a {
  padding: 0 1.25rem 1.1rem;
}

.faq-enter-active,
.faq-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

.faq-enter-from,
.faq-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

/* —— Responsive —— */
@media (max-width: 1024px) {
  .plan-card--popular {
    transform: scale(1);
  }
  .plan-card--popular:hover {
    transform: translateY(-4px);
  }
}
</style>
