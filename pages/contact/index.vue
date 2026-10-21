<template>
  <div class="ck-page">
    <div class="ck-wrap ck-wrap--narrow">
      <nav class="ck-page__crumb">
        <NuxtLink to="/" class="ck-page__back">
          <span class="i-ph-arrow-left" /> Home
        </NuxtLink>
      </nav>

      <h1 class="ck-h1">Get in touch</h1>
      <p class="ck-page__lead">
        Something not right, or a card you would like us to look at? We read
        every message. It is a small team, so replies take a day or two — but
        they come.
      </p>

      <div class="ck-page__body">
        <h2>Email us</h2>
        <div class="ck-ways">
          <a class="ck-way" href="mailto:hello@yozzytools.com">
            <span class="ck-way__icon"><span class="ck-way__glyph i-ph-chat-circle-text" /></span>
            <span class="ck-way__body">
              <span class="ck-way__label">General questions</span>
              <span class="ck-way__value">hello@yozzytools.com</span>
            </span>
            <span class="i-ph-arrow-up-right ck-way__go" />
          </a>
          <a class="ck-way" href="mailto:privacy@yozzytools.com">
            <span class="ck-way__icon"><span class="ck-way__glyph i-ph-lock-key" /></span>
            <span class="ck-way__body">
              <span class="ck-way__label">Privacy and your data</span>
              <span class="ck-way__value">privacy@yozzytools.com</span>
            </span>
            <span class="i-ph-arrow-up-right ck-way__go" />
          </a>
          <a class="ck-way" href="mailto:refunds@yozzytools.com">
            <span class="ck-way__icon"><span class="ck-way__glyph i-ph-arrow-counter-clockwise" /></span>
            <span class="ck-way__body">
              <span class="ck-way__label">Refunds and payments</span>
              <span class="ck-way__value">refunds@yozzytools.com</span>
            </span>
            <span class="i-ph-arrow-up-right ck-way__go" />
          </a>
        </div>

        <h2>Before you write</h2>
        <p>These cover most of what people ask:</p>
        <ul>
          <li>
            <strong>Can I get a refund?</strong>
            Yes, if a card is not right. Tell us what went wrong and we will
            either fix it or refund you — no forms.
          </li>
          <li>
            <strong>Will my photo end up online?</strong>
            No. Photos are private to your account, never published, never
            sold, and deleted within 30 days of you deleting them. See the
            <NuxtLink to="/privacy">privacy page</NuxtLink> for the detail.
          </li>
          <li>
            <strong>The name on the card is wrong.</strong>
            It should not be — we typeset the words rather than letting the
            picture model paint them. If it is wrong anyway, tell us and we
            will fix it.
          </li>
          <li>
            <strong>Can I cancel my subscription?</strong>
            Yes, from your account page, in one click. You keep what you have
            made, and your plan runs to the end of the period you paid for.
          </li>
        </ul>

        <h2>Where we are</h2>
        <p>
          We are a small, distributed team. There is no office address to
          post to — email is genuinely the best way to reach us, and it means
          you get a reply from the person who can actually fix the thing.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

useHead({
  title: 'Contact — Create Keepsakes',
  meta: [{
    name: 'description',
    content: 'Email us about a card, a payment or your privacy. We read everything and we do reply.',
  }],
  link: [{ rel: 'canonical', href: 'https://create.yozzytools.com/contact' }],
})
</script>

<style scoped>
.ck-page {
  --ck-bg: #fbf7f1;
  --ck-cream: #f5ede1;
  --ck-white: #fffdfa;
  --ck-ink: #2a2420;
  --ck-ink-2: #6b5f55;
  --ck-line: rgba(58, 46, 38, 0.12);
  --ck-coral: #c8543d;
  --ck-coral-deep: #a53f2c;
  --ck-serif: 'Playfair Display', Georgia, serif;

  min-height: 70vh;
  padding: 2.5rem 0 5rem;
  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: 'Manrope', system-ui, sans-serif;
}
.ck-wrap { max-width: 74rem; margin: 0 auto; padding: 0 1.5rem; }
.ck-wrap--narrow { max-width: 46rem; }

.ck-h1 {
  font-family: var(--ck-serif);
  font-size: clamp(2.1rem, 4.6vw, 2.9rem);
  font-weight: 600;
  line-height: 1.1;
}
.ck-page__crumb { margin-bottom: 1.5rem; }
.ck-page__back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ck-ink-2);
  text-decoration: none;
}
.ck-page__back:hover { color: var(--ck-coral-deep); }

.ck-page__lead {
  margin-top: 1.25rem;
  padding: 1.1rem 1.25rem;
  border-radius: 0.8rem;
  background: var(--ck-cream);
  font-size: 1rem;
  line-height: 1.65;
  color: var(--ck-ink-2);
}

.ck-page__body { margin-top: 2.25rem; }
.ck-page__body h2 {
  margin: 2.5rem 0 0.75rem;
  font-family: var(--ck-serif);
  font-size: 1.5rem;
  font-weight: 600;
}
.ck-page__body p { margin: 0.9rem 0; font-size: 1rem; line-height: 1.75; color: #3f362f; }
.ck-page__body ul { margin: 0.9rem 0; padding-left: 1.35rem; }
.ck-page__body li { margin: 0.6rem 0; font-size: 1rem; line-height: 1.7; color: #3f362f; }
.ck-page__body strong { font-weight: 700; color: var(--ck-ink); }
.ck-page__body a { color: var(--ck-coral-deep); font-weight: 600; text-underline-offset: 3px; }

.ck-ways { display: grid; gap: 0.75rem; margin: 1.25rem 0; }
.ck-way {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 1rem 1.15rem;
  border: 1px solid var(--ck-line);
  border-radius: 0.9rem;
  background: var(--ck-white);
  text-decoration: none;
  transition: transform 0.14s ease, border-color 0.14s ease;
}
.ck-way:hover { transform: translateY(-2px); border-color: var(--ck-coral); }
.ck-way__glyph {
  display: block;
  width: 1.35rem;
  height: 1.35rem;
  color: #c8543d;
}
.ck-way__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 0.7rem;
  background: rgba(200, 84, 61, 0.12);
  color: var(--ck-coral-deep);
  font-size: 1.2rem;
}
.ck-way__body { display: flex; flex-direction: column; gap: 0.1rem; }
.ck-way__label { font-size: 0.8125rem; color: #a08f81; }
.ck-way__value { font-size: 1rem; font-weight: 700; color: var(--ck-ink); }
.ck-way__go { margin-left: auto; color: #a08f81; font-size: 1.1rem; }
</style>
