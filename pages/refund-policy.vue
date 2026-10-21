<template>
  <div class="ck-legal">
    <div class="ck-wrap ck-legal__wrap">
      <p class="ck-eyebrow">Legal</p>
      <h1 class="ck-h1">Refunds and cancellations</h1>
      <p class="ck-lede">
        Plain English. Here is exactly when you can get your money back, and what
        to do if something went wrong.
      </p>

      <div class="ck-legal__body">
        <h2>What you are buying</h2>
        <p>
          When you pay for a card, we create it for you and give you a file to
          download and print. It is a digital product — there is no physical
          item to post to you, and nothing is printed and shipped on your behalf.
        </p>
        <p>
          That means your purchase is complete the moment the finished file is
          ready for you to download.
        </p>

        <h2>When we refund you in full</h2>
        <p>We refund in full, without argument, when:</p>
        <ul>
          <li>we failed to deliver your card and we cannot fix it;</li>
          <li>your payment was taken twice — we return the duplicate;</li>
          <li>the file you downloaded is broken or wrong, and we cannot replace it;</li>
          <li>you were charged a different amount than the price shown on this site.</li>
        </ul>
        <p>
          If any of these happen, email
          <a href="mailto:refunds@yozzytools.com">refunds@yozzytools.com</a> with
          the email address on your account and the date. We aim to reply within
          two working days and to have the money back on your account within
          five to ten working days, depending on your bank.
        </p>

        <h2>Subscriptions</h2>
        <p>
          If you have a monthly plan, you can cancel at any time from your
          account page. Cancelling stops the next payment from being taken. You
          keep whatever cards you have already paid for — we do not take them
          back.
        </p>
        <p>
          We do not offer a cooling-off period on a subscription you have
          already used, because the cards are made for you the moment you
          generate them.
        </p>

        <h2>One-off packs</h2>
        <p>
          A one-off pack does not expire and does not renew. If you do not use
          every card in it, that is not a problem — you can use them whenever
          you like, and there is no deadline.
        </p>

        <h2>Changing your mind</h2>
        <p>
          Because your card is made specifically for you, we cannot refund a
          download you have already used to make or print a card. We would
          rather you did not pay than pay for something that does not work for
          you, so please try the free preview first, and email us if the result
          is not what you expected.
        </p>

        <h2>How long a refund takes</h2>
        <ul>
          <li>You will hear from us within two working days.</li>
          <li>PayPal processes refunds within 5–10 working days.</li>
          <li>Your bank may take a few more days to show the money.</li>
        </ul>

        <h2>Contact</h2>
        <p>
          Refunds: <a href="mailto:refunds@yozzytools.com">refunds@yozzytools.com</a><br>
          Anything else: <a href="mailto:hello@yozzytools.com">hello@yozzytools.com</a>
        </p>
        <p class="ck-legal__note">
          <NuxtLink to="/terms">Read the full terms</NuxtLink> ·
          <NuxtLink to="/privacy">Read the privacy policy</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

useHead({
  title: 'Refunds and cancellations — Create Keepsakes',
  meta: [{
    name: 'description',
    content: 'When you can get a refund from Create Keepsakes, how to ask for one, and how long it takes. Plain English, no small print.',
  }],
  link: [{ rel: 'canonical', href: 'https://create.yozzytools.com/refund-policy' }],
})
</script>

<style scoped>
.ck-legal {
  background: #fbf7f1;
  color: #2a2420;
  font-family: 'Manrope', system-ui, sans-serif;
  padding: 3rem 0 5rem;
}
.ck-legal__wrap { max-width: 46rem; }
.ck-eyebrow {
  margin: 0 0 0.6rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #c8543d;
}
.ck-h1 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(2rem, 4.4vw, 2.9rem);
  line-height: 1.15;
  font-weight: 700;
  margin: 0 0 0.8rem;
}
.ck-lede {
  font-size: 1.08rem;
  line-height: 1.65;
  color: #6b5f55;
  margin: 0 0 2.5rem;
}
.ck-legal__body h2 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.35rem;
  font-weight: 600;
  margin: 2.2rem 0 0.7rem;
}
.ck-legal__body p {
  font-size: 1rem;
  line-height: 1.75;
  color: #4a4038;
  margin: 0 0 1rem;
}
.ck-legal__body ul {
  margin: 0 0 1.2rem;
  padding-left: 1.3rem;
  color: #4a4038;
}
.ck-legal__body li {
  font-size: 1rem;
  line-height: 1.75;
  margin-bottom: 0.4rem;
}
.ck-legal__body a {
  color: #c8543d;
  font-weight: 600;
}
.ck-legal__note {
  margin-top: 2.5rem;
  padding-top: 1.4rem;
  border-top: 1px solid rgba(58, 46, 38, 0.12);
  font-size: 0.95rem !important;
}
</style>
