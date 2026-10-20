<template>
  <div class="ck-page">
    <div class="ck-wrap ck-wrap--narrow">
      <nav class="ck-page__crumb">
        <NuxtLink to="/" class="ck-page__back">
          <span class="i-ph-arrow-left" /> Home
        </NuxtLink>
      </nav>

      <h1 class="ck-h1">Terms of use</h1>
      <p class="ck-page__updated">Last updated: 20 October 2026</p>
      <p class="ck-page__lead">
        These are the rules for using Create Keepsakes. We have kept them
        short and readable. If something here is unclear, email us before you
        use the service.
      </p>

      <div class="ck-page__body">
        <h2>1. The service</h2>
        <p>
          Create Keepsakes lets you create personalised greeting cards and
          prints from photographs and text you supply. We produce a digital
          file that you can download, share and print yourself. We do not
          print or post physical cards on your behalf.
        </p>

        <h2>2. Your account</h2>
        <p>
          You need an account to make and save cards. Keep your password to
          yourself, and tell us if you think someone else has used your
          account. You are responsible for what happens under your account.
        </p>
        <p>
          You must be old enough to enter a contract where you live, and at
          least 13 years old. If you are making cards for someone else, you
          are the one responsible for having permission to use their
          photograph.
        </p>

        <h2>3. Your content</h2>
        <p>
          <strong>You keep ownership of everything you upload and write.</strong>
          We do not claim it.
        </p>
        <p>
          You give us a limited, non-exclusive licence to host, process and
          transform your content for the purpose of making the cards you ask
          for — and for nothing else. That includes passing a picture to our
          image generation provider so it can be drawn. We do not use your
          content to train AI models, and we do not sell it.
        </p>
        <p>
          You are responsible for having the right to use the photographs you
          upload. If you upload a picture of somebody without their permission,
          that is on you, not on us.
        </p>

        <h2>4. Payments</h2>
        <ul>
          <li>Cards are sold individually, and as monthly plans or one-off packs. The price is always shown before you pay.</li>
          <li>Payments are handled by PayPal. We never see or store your card details.</li>
          <li>A monthly plan renews automatically each month until you cancel. <strong>We will never change your price or move you to a different plan without you doing it yourself.</strong></li>
          <li>You can cancel at any time, in one click, from your account page. Your plan stays active until the end of the period you have already paid for.</li>
          <li>Unused cards on a monthly plan roll over to the next month rather than expiring.</li>
          <li>If you buy more cards than you need, the extra ones are charged at the price shown at the time.</li>
        </ul>

        <h2>5. Refunds</h2>
        <p>
          If a card is not right, tell us and we will either make it right or
          refund you. We do not ask you to fill in a form, and we do not make
          you argue for it. If you bought a plan and have used none of the
          cards in it, we will refund it.
        </p>
        <p>
          Because we produce files for you rather than physical goods, we
          cannot usually take a used file back — but “used” here means printed
          and given away, not “I looked at it and did not like the font”.
        </p>

        <h2>6. Your content and AI</h2>
        <p>
          The pictures on your cards are produced by an AI image model. That
          means:
        </p>
        <ul>
          <li>Output is not guaranteed to be exactly what you expected, and we may be unable to reproduce a result you liked.</li>
          <li>We test every style we offer, but individual results vary, and we cannot promise a specific image every time.</li>
          <li>The words on your card are typeset by us rather than drawn by the model, so names, numbers and dates are rendered exactly as you typed them.</li>
        </ul>
        <p>
          We may also remove content that is unlawful, that infringes someone
          else's rights, or that we are asked to remove by someone with a
          legitimate claim to it.
        </p>

        <h2>7. Acceptable use</h2>
        <p>Please do not use the service to:</p>
        <ul>
          <li>Create sexual content involving children, or any content that sexualises a real, identifiable person without their consent.</li>
          <li>Make content that is hateful, or that harasses or defames a real person.</li>
          <li>Impersonate someone else in a way intended to deceive.</li>
          <li>Try to break the service, scrape it at volume, or resell access to it as your own service.</li>
          <li>Upload content you do not have the right to upload.</li>
        </ul>
        <p>
          We may suspend an account that does any of these, and in serious
          cases we will involve the authorities.
        </p>

        <h2>8. Availability</h2>
        <p>
          We aim to keep the service running all the time, but we do not
          guarantee that it will never be down. We may change or withdraw
          features. If we make a change that materially reduces something you
          have paid for, we will tell you and refund the affected part.
        </p>

        <h2>9. Our liability</h2>
        <p>
          The service is provided “as is”. To the extent the law allows, we
          are not liable for indirect or consequential loss, or for loss of
          profit, revenue or data. Our total liability for any claim
          relating to the service is limited to the amount you paid us in the
          twelve months before the claim.
        </p>
        <p>
          Nothing in these terms limits liability for death or personal
          injury caused by negligence, for fraud, or for anything else that
          cannot lawfully be limited.
        </p>

        <h2>10. Ending it</h2>
        <p>
          You can close your account at any time. We may suspend or close an
          account that breaks these terms, and we will refund any unused
          prepaid amount unless the account was closed for abuse.
        </p>

        <h2>11. Changes to these terms</h2>
        <p>
          If we change these terms in a way that affects you, we will update
          the date at the top and email you about anything significant before
          it takes effect.
        </p>

        <h2>12. Law and contact</h2>
        <p>
          These terms are governed by the law of England and Wales, and the
          courts of England and Wales have exclusive jurisdiction, without
          affecting any rights you have under the consumer law of your own
          country.
        </p>
        <p>
          Questions about any of this:
          <a href="mailto:hello@yozzytools.com">hello@yozzytools.com</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

useHead({
  title: 'Terms of use — Create Keepsakes',
  meta: [{
    name: 'description',
    content: 'The terms for using Create Keepsakes: your content, payments, refunds, acceptable use and liability.',
  }],
  link: [{ rel: 'canonical', href: 'https://create.yozzytools.com/terms' }],
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
.ck-page__updated { margin-top: 0.6rem; font-size: 0.8125rem; color: #a08f81; }

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
  margin: 2.25rem 0 0.75rem;
  font-family: var(--ck-serif);
  font-size: 1.4rem;
  font-weight: 600;
}
.ck-page__body p { margin: 0.9rem 0; font-size: 1rem; line-height: 1.75; color: #3f362f; }
.ck-page__body ul { margin: 0.9rem 0; padding-left: 1.35rem; }
.ck-page__body li { margin: 0.5rem 0; font-size: 1rem; line-height: 1.7; color: #3f362f; }
.ck-page__body strong { font-weight: 700; color: var(--ck-ink); }
.ck-page__body a { color: var(--ck-coral-deep); font-weight: 600; text-underline-offset: 3px; }
</style>
