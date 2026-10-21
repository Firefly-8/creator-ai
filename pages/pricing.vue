<template>
  <div class="ck-pricing">
    <div class="ck-wrap">
      <!-- 标题 -->
      <header class="ck-pricing__head">
        <p class="ck-badge">
          <span class="i-ph-wallet" /> Simple pricing
        </p>
        <h1 class="ck-h1">Pay for the cards you actually make.</h1>
        <p class="ck-lede">
          Preview as many as you like. You only pay when a card is right, and
          every card you make is yours to print and keep.
        </p>
      </header>

      <!-- 三档（价格全部来自 utils/pricing.ts —— 页面不会和收银台对不上） -->
      <div class="ck-plans">
        <div
          v-for="p in planCards"
          :key="p.id"
          class="ck-plan"
          :class="{ 'ck-plan--popular': p.popular }"
        >
          <span v-if="p.popular" class="ck-plan__badge">Most popular</span>
          <h2 class="ck-plan__name">{{ p.name }}</h2>

          <p class="ck-plan__price">
            <span class="ck-plan__amount">{{ money(p.price) }}</span>
            <span v-if="p.interval" class="ck-plan__per">/ {{ p.interval }}</span>
          </p>

          <p class="ck-plan__desc">{{ p.description }}</p>

          <div class="ck-plan__cta">
            <PayPalButton
              v-if="p.kind !== 'free'"
              :plan-id="p.id"
              :kind="p.kind === 'subscription' ? 'subscription' : 'one_time'"
              :label="p.cta"
              :logged-in="!!user"
              @need-login="requireLogin"
              @paid="onPaid"
            />
            <NuxtLink v-else to="/cards" class="ck-btn ck-btn--ghost ck-btn--full">
              {{ p.cta }}
            </NuxtLink>
          </div>

          <ul class="ck-plan__list">
            <li v-for="f in p.features" :key="f">
              <span class="i-ph-check" /> <span>{{ f }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- 支付结果提示 -->
      <p v-if="payMessage" class="ck-pay-note ck-pay-note--ok">
        <span class="i-ph-check-circle" /> {{ payMessage }}
      </p>
      <p v-else-if="payError" class="ck-pay-note ck-pay-note--bad">
        <span class="i-ph-warning-circle" /> {{ payError }}
      </p>

      <!-- 信任 -->
      <p class="ck-trust">
        <span><span class="i-ph-lock-key" /> Secure payment via PayPal</span>
        <span><span class="i-ph-arrow-counter-clockwise" /> Cancel anytime, keep what is left</span>
        <span><span class="i-ph-lightning" /> Print file straight away</span>
      </p>

      <!-- 单张 -->
      <section class="ck-single">
        <div>
          <h2 class="ck-h2">Just one card?</h2>
          <p class="ck-sub">
            A single card is <strong>{{ money(singlePlan.price) }}</strong>. No account tricks, no
            "upgrade" prompts — you pay for the card and you are done.
          </p>
        </div>
        <div class="ck-single__cta">
          <PayPalButton
            :plan-id="singlePlan.id"
            kind="one_time"
            :label="`Pay once — ${money(singlePlan.price)}`"
            :logged-in="!!user"
            @need-login="requireLogin"
            @paid="onPaid"
          />
        </div>
      </section>

      <!-- FAQ -->
      <section class="ck-faq-wrap">
        <h2 class="ck-h2">The fine print, in plain words.</h2>
        <div class="ck-faq">
          <details v-for="f in faqs" :key="f.q" class="ck-faq__item">
            <summary>
              {{ f.q }}
              <span class="i-ph-plus ck-faq__sign" />
            </summary>
            <p>{{ f.a }}</p>
          </details>
        </div>
      </section>

      <!-- 承诺 -->
      <section class="ck-promise">
        <div v-for="p in promises" :key="p.title" class="ck-promise__item">
          <span class="ck-promise__icon" :class="`i-${p.icon}`" />
          <h3>{{ p.title }}</h3>
          <p>{{ p.text }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PLANS } from '~/utils/pricing'
// ⚠️ 必须显式 import —— Nuxt 的组件自动导入会带目录前缀
//    （components/pricing/PayPalButton.vue 注册成的是 PricingPayPalButton），
//    写 <PayPalButton> 解析不到 → **整个按钮静默不渲染**（页面看着正常，买了也买不了）
import PayPalButton from '~/components/pricing/PayPalButton.vue'

definePageMeta({ layout: 'marketing' })

useHead({
  title: 'Pricing — Create Keepsakes',
  meta: [{
    name: 'description',
    content: `One card for $${PLANS.single.price.toFixed(2)}. A monthly plan of $${PLANS.creator.price.toFixed(2)} includes 5 print-ready cards. Cancel anytime.`,
  }],
  link: [{ rel: 'canonical', href: 'https://create.yozzytools.com/pricing' }],
})

const { user } = useAuth()
const { isOpen: authModalOpen, openLoginWithRedirect } = useAuthModal()
const payMessage = ref('')
const payError = ref('')

/** 三档：免费 / 月付 / 买断包（价格直接来自唯一真相源） */
const planCards = [PLANS.free, PLANS.creator, PLANS.lifetime]
const singlePlan = PLANS.single

/** $0 不要写成 $0.00 */
function money(n: number): string {
  return n ? `$${n.toFixed(2)}` : '$0'
}

function requireLogin() {
  openLoginWithRedirect('/pricing')
}

async function onPaid(info: any) {
  if (info?.type === 'subscription') {
    payMessage.value = 'Your plan is active. Thank you!'
  } else {
    payMessage.value = info?.message || 'Payment received — your cards are ready.'
  }
  payError.value = ''
  // 刷新额度显示
  await refreshNuxtData()
}

const faqs = [
  {
    q: `What exactly do I get for ${money(PLANS.creator.price)} a month?`,
    a: 'Five cards a month, at full print resolution — 300 DPI, sized for a 5 × 7 inch card — with no mark on the file. If you do not use all five, they roll over to the next month instead of disappearing.',
  },
  {
    q: 'What happens if I need more than five?',
    a: `Each extra card is ${money(PLANS.single.price)} — the same price as buying one card on its own. You can add them whenever you want, and you will always see the price before you pay.`,
  },
  {
    q: 'What if I use all my cards?',
    a: 'Your account falls back to the free daily allowance, so you can still make marked-up previews and try things out. Buy one more card or a pack of twenty and your print-ready files are back.',
  },
  {
    q: 'Can I cancel?',
    a: 'Yes, at any time, in one click, from your account page. You keep everything you have made, and your plan stays active until the end of the period you already paid for. We will not ask you to email anyone.',
  },
  {
    q: 'Will you ever move me to a different plan automatically?',
    a: 'No. We never change your plan or your price without you doing it yourself.',
  },
  {
    q: 'What size file do I get?',
    a: '5 × 7 inches at 300 DPI (1500 × 2100 pixels) as standard, plus 4 × 6 and A6. Wall prints come as 16 × 20 inches or A3 at 150 DPI, which is what print shops expect for a canvas.',
  },
  {
    q: 'What happens to my photos?',
    a: 'They stay in your account, are never published, and are never used to train anything. Delete them yourself whenever you like, and they are gone within 30 days.',
  },
  {
    q: 'Is this a subscription trap?',
    a: `No. The one-off pack of ${PLANS.lifetime.cards} cards is ${money(PLANS.lifetime.price)}, it never expires, and there is nothing recurring about it. We would rather you pay once than cancel and ask for your money back.`,
  },
]

const promises = [
  {
    icon: 'ph-check-square',
    title: 'Names spelled right',
    text: 'Every name, number and date is typeset by us, not painted by the picture. It comes out exactly as you typed it.',
  },
  {
    icon: 'ph-lock-key',
    title: 'Photos stay private',
    text: 'Never published, never used to train anything, deleted within 30 days. We do not sell or share your pictures.',
  },
  {
    icon: 'ph-printer',
    title: 'Genuinely printable',
    text: 'Real print dimensions at real resolution, not a phone screenshot. Take it to any print shop.',
  },
  {
    icon: 'ph-arrow-counter-clockwise',
    title: 'Refund if it is not right',
    text: 'If a card is not what you wanted, tell us and we will make it right or refund you. No forms.',
  },
]
</script>

<style scoped>
.ck-pricing {
  --ck-bg: #fbf7f1;
  --ck-cream: #f5ede1;
  --ck-white: #fffdfa;
  --ck-ink: #2a2420;
  --ck-ink-2: #6b5f55;
  --ck-line: rgba(58, 46, 38, 0.12);
  --ck-coral: #c8543d;
  --ck-coral-deep: #a53f2c;
  --ck-serif: 'Playfair Display', Georgia, serif;

  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: 'Manrope', system-ui, sans-serif;
  padding: 4.5rem 0 6rem;
}
.ck-wrap { max-width: 70rem; margin: 0 auto; padding: 0 1.5rem; }

.ck-h1 {
  font-family: var(--ck-serif);
  font-size: clamp(2.4rem, 5.5vw, 3.7rem);
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -0.015em;
}
.ck-h2 {
  font-family: var(--ck-serif);
  font-size: clamp(1.6rem, 3.2vw, 2.2rem);
  font-weight: 600;
  line-height: 1.2;
}
.ck-lede { margin-top: 1.3rem; font-size: 1.125rem; line-height: 1.65; color: var(--ck-ink-2); max-width: 48ch; }
.ck-sub { margin-top: 0.75rem; font-size: 1rem; line-height: 1.65; color: var(--ck-ink-2); max-width: 48ch; }

.ck-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  background: rgba(200, 84, 61, 0.1);
  color: var(--ck-coral-deep);
  font-size: 0.8125rem;
  font-weight: 600;
}
.ck-pricing__head { text-align: center; max-width: 46rem; margin: 0 auto 3.75rem; }
.ck-pricing__head .ck-lede { margin-left: auto; margin-right: auto; }

.ck-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.85rem 1.6rem;
  border: 1.5px solid transparent;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease;
}
.ck-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.ck-btn--primary { background: var(--ck-coral); color: #fff; }
.ck-btn--primary:hover:not(:disabled) { background: var(--ck-coral-deep); }
.ck-btn--ghost { border-color: var(--ck-line); color: var(--ck-ink); background: transparent; }
.ck-btn--ghost:hover:not(:disabled) { border-color: var(--ck-coral); color: var(--ck-coral-deep); }
.ck-btn--full { width: 100%; }

/* ---------- 档位 ---------- */
.ck-plans {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  align-items: start;
}
@media (max-width: 900px) { .ck-plans { grid-template-columns: 1fr; } }

.ck-plan {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 1.9rem 1.7rem 1.75rem;
  border: 1.5px solid var(--ck-line);
  border-radius: 1.25rem;
  background: var(--ck-white);
}
.ck-plan--popular {
  border-color: var(--ck-coral);
  box-shadow: 0 22px 48px -28px rgba(200, 84, 61, 0.55);
}
/* 主推徽章：压在卡片上边缘居中（原来贴左上角，像贴纸） */
.ck-plan__badge {
  position: absolute;
  top: -0.8rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.3rem 0.9rem;
  border-radius: 999px;
  background: var(--ck-coral);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
.ck-plan__name {
  font-family: var(--ck-serif);
  font-size: 1.45rem;
  font-weight: 600;
  line-height: 1.2;
}
/* 价格是卡片里最重的一块 —— 顶到名字下面，别夹在中间 */
.ck-plan__price {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin-top: 0.75rem;
}
.ck-plan__amount {
  font-family: var(--ck-serif);
  font-size: 2.9rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.01em;
}
.ck-plan__per { font-size: 0.9375rem; color: var(--ck-ink-2); }
.ck-plan__desc {
  margin: 0.75rem 0 0;
  font-size: 0.9375rem;
  line-height: 1.55;
  color: var(--ck-ink-2);
  min-height: 2.9em;      /* 三张卡的说明行数一致 → 下面的按钮对齐 */
}
.ck-plan__cta { margin-top: 1.35rem; }
/* 特性列表用一条细分隔线跟价格区断开，层级就清楚了 */
.ck-plan__list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin: 1.5rem 0 0;
  padding: 1.4rem 0 0;
  border-top: 1px solid var(--ck-line);
  list-style: none;
}
.ck-plan__list li {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--ck-ink);
}
.ck-plan__list li > span:last-child { min-width: 0; }
.ck-plan__list .i-ph-check { flex: none; margin-top: 0.22rem; color: var(--ck-coral); }

.ck-pay-note {
  margin: 0 0 1.2rem;
  padding: 0.85rem 1.1rem;
  border-radius: 0.8rem;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.ck-pay-note--ok { background: rgba(47, 64, 52, 0.1); color: #2f4034; }
.ck-pay-note--bad { background: rgba(200, 84, 61, 0.1); color: #a53f2c; }

.ck-trust {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem 1.75rem;
  margin-top: 2.25rem;
  font-size: 0.875rem;
  color: var(--ck-ink-2);
}
.ck-trust span { display: inline-flex; align-items: center; gap: 0.35rem; }
.ck-trust .i-ph-lock-key, .ck-trust .i-ph-arrow-counter-clockwise, .ck-trust .i-ph-lightning { color: var(--ck-coral); }

/* ---------- 单张 ---------- */
.ck-single {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.75rem 3rem;
  margin-top: 3.5rem;
  padding: 2.25rem 2.5rem;
  border-radius: 1.25rem;
  background: var(--ck-cream);
}
.ck-single .ck-h2 { max-width: none; }
.ck-single .ck-sub { max-width: 44ch; }
.ck-single__cta { flex: none; width: min(100%, 17rem); }

/* ---------- FAQ ---------- */
.ck-faq-wrap { margin-top: 4rem; max-width: 52rem; }
.ck-faq { margin-top: 1.75rem; }
.ck-faq__item { border-bottom: 1px solid var(--ck-line); }
.ck-faq__item summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.05rem 0;
  cursor: pointer;
  font-size: 1.0625rem;
  font-weight: 600;
  list-style: none;
}
.ck-faq__item summary::-webkit-details-marker { display: none; }
.ck-faq__sign { flex: none; color: var(--ck-coral); transition: transform 0.18s ease; }
.ck-faq__item[open] .ck-faq__sign { transform: rotate(45deg); }
.ck-faq__item p { padding-bottom: 1.1rem; font-size: 0.9375rem; line-height: 1.7; color: var(--ck-ink-2); max-width: 62ch; }

/* ---------- 承诺 ---------- */
.ck-promise {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1.25rem;
  margin-top: 4rem;
}
.ck-promise__item { padding: 1.4rem 1.25rem; border-radius: 1rem; background: var(--ck-cream); }
.ck-promise__icon {
  display: inline-grid;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 0.7rem;
  background: rgba(200, 84, 61, 0.12);
  color: var(--ck-coral-deep);
  font-size: 1.25rem;
}
.ck-promise__item h3 { margin: 0.85rem 0 0.4rem; font-size: 1rem; font-weight: 700; }
.ck-promise__item p { margin: 0; font-size: 0.875rem; line-height: 1.6; color: var(--ck-ink-2); }
</style>
