<template>
  <div class="ck-page">
    <div class="ck-wrap ck-wrap--narrow">
      <nav class="ck-page__crumb">
        <NuxtLink to="/" class="ck-page__back">
          <span class="i-ph-arrow-left" /> Home
        </NuxtLink>
      </nav>

      <h1 class="ck-h1">Why we made this</h1>
      <p class="ck-page__lead">
        It started with a birthday. We wanted a card for somebody's mother —
        with her face on it, her name spelled right, and a message that
        sounded like her children. We could not find one anywhere.
      </p>

      <div class="ck-page__body">
        <h2>The problem</h2>
        <p>
          You can buy a lovely card in a shop. It is beautiful, and it is
          about nobody in particular. You can use an AI tool. It will
          absolutely make you something with a face on it — and it will not
          know that the face is supposed to be Margaret, that she is turning
          eighty, or that the dog in the picture is called Biscuit and is
          the whole reason you are sending it.
        </p>
        <p>
          So you get a choice between a card that is lovely and generic, and
          a picture that is personal and strange. Neither is what you wanted
          to hand to your mother.
        </p>

        <h2>What we do about it</h2>
        <p>
          We split the job in two, and we are careful about which half goes to
          the machine.
        </p>

        <div class="ck-principles">
          <div class="ck-principle">
            <span class="ck-principle__icon i-ph-spell-check" />
            <h3>The words are typed, not painted</h3>
            <p>
              We let an image model paint the picture, but we typeset the
              words ourselves. Models are not good at spelling — asked to write
              “Happy 70th Birthday, Margaret” one of ours produced
              “Happy 70th Runthdscket”. On a card for somebody's eightieth
              birthday, that is not a funny glitch, it is a present you cannot
              give.
            </p>
          </div>
          <div class="ck-principle">
            <span class="ck-principle__icon i-ph-lock-key" />
            <h3>Your photos stay yours</h3>
            <p>
              Nothing you upload is published, sold, or used to train
              anything. Your photos are deleted within thirty days of you
              deleting them. We are asking you to hand over pictures of people
              who never agreed to be online, and we are not going to treat that
              lightly.
            </p>
          </div>
          <div class="ck-principle">
            <span class="ck-principle__icon i-ph-printer" />
            <h3>It is made to be printed</h3>
            <p>
              Not a screen picture. A real file at a real size — 5 × 7 inches
              at 300 DPI, or 16 × 20 on canvas — that a print shop will accept
              and that will not fall apart on card stock.
            </p>
          </div>
        </div>

        <h2>What we deliberately do not do</h2>
        <ul>
          <li><strong>We do not print and post cards for you.</strong> We make the file; how it gets there is up to you, and we would rather not run a postal operation badly.</li>
          <li><strong>We do not put advertising on your cards.</strong> There is no banner, no watermark on the paid file, and no sponsored anything in the middle of your message.</li>
          <li><strong>We do not sell your pictures.</strong> Not to us, not to anyone else, not ever.</li>
          <li><strong>We do not use your pictures to train AI.</strong> Neither ours nor anyone else's.</li>
        </ul>

        <h2>Who we are</h2>
        <p>
          We are a small team working on Yozzy Tools. We build tools for people
          who want to give something thoughtful and are not especially
          interested in design software. That is the whole idea: you should
          not need to know how to make a card in order to give one.
        </p>

        <h2>Say hello</h2>
        <p>
          Questions, problems, or a card you think we should see:
          <a href="mailto:hello@yozzytools.com">hello@yozzytools.com</a>
        </p>
        <p>
          We read everything. We may be slow, but we do answer.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

useHead({
  title: 'About — Create Keepsakes',
  meta: [{
    name: 'description',
    content: 'Why we built a card maker for people who want to give something thoughtful but are not designers.',
  }],
  link: [{ rel: 'canonical', href: 'https://create.yozzytools.com/about' }],
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
.ck-page__body h3 { margin: 0 0 0.45rem; font-size: 1.0625rem; font-weight: 700; color: var(--ck-ink); }
.ck-page__body p { margin: 0.9rem 0; font-size: 1rem; line-height: 1.75; color: #3f362f; }
.ck-page__body ul { margin: 0.9rem 0; padding-left: 1.35rem; }
.ck-page__body li { margin: 0.5rem 0; font-size: 1rem; line-height: 1.7; color: #3f362f; }
.ck-page__body strong { font-weight: 700; color: var(--ck-ink); }
.ck-page__body a { color: var(--ck-coral-deep); font-weight: 600; text-underline-offset: 3px; }

.ck-principles { display: grid; gap: 1rem; margin: 1.5rem 0; }
.ck-principle {
  padding: 1.4rem 1.35rem;
  border: 1px solid var(--ck-line);
  border-radius: 1rem;
  background: var(--ck-white);
}
.ck-principle__icon {
  display: inline-grid;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 0.7rem;
  background: rgba(200, 84, 61, 0.12);
  color: var(--ck-coral-deep);
  font-size: 1.2rem;
}
.ck-principle h3 { margin-top: 0.85rem; }
.ck-principle p { margin: 0.4rem 0 0; font-size: 0.9375rem; line-height: 1.65; color: var(--ck-ink-2); }
</style>
