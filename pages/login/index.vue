<template>
  <div class="ck-auth-page">
    <div class="ck-wrap ck-wrap--narrow">
      <nav class="ck-auth-page__crumb">
        <NuxtLink to="/" class="ck-auth-page__back">
          <span class="i-ph-arrow-left" /> Home
        </NuxtLink>
      </nav>

      <div class="ck-auth-page__box">
        <img src="/logo.png" alt="" class="ck-auth-page__logo" />
        <h1 class="ck-h1">
          {{ mode === 'login' ? 'Welcome back' : 'Keep your cards in one place' }}
        </h1>
        <p class="ck-auth-page__lead">
          {{
            mode === 'login'
              ? 'Sign in to pick up where you left off.'
              : 'Save your photos, your cards and your words. Free to start.'
          }}
        </p>

        <button class="ck-btn" @click="open">
          {{ mode === 'login' ? 'Sign in' : 'Create my account' }}
          <span class="i-ph-arrow-right" />
        </button>

        <p class="ck-auth-page__alt">
          <template v-if="mode === 'login'">
            No account yet?
            <button class="ck-auth-page__switch" @click="switchTo('signup')">Create one</button>
          </template>
          <template v-else>
            Already have an account?
            <button class="ck-auth-page__switch" @click="switchTo('login')">Sign in</button>
          </template>
        </p>

        <p class="ck-auth-page__note">
          <span class="i-ph-lock-key" />
          Your photos stay private. We never publish them, and we do not send
          newsletters.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const route = useRoute()
const { openLogin, openSignup } = useAuthModal()

const mode = ref<'login' | 'signup'>(
  route.path.includes('signup') ? 'signup' : 'login',
)

useHead({
  title: () => (mode.value === 'login' ? 'Sign in' : 'Create an account') + ' — Create Keepsakes',
  meta: [{ name: 'robots', content: 'noindex, follow' }],
})

function open() {
  if (mode.value === 'login') openLogin()
  else openSignup()
}

function switchTo(next: 'login' | 'signup') {
  mode.value = next
  open()
}
</script>

<style scoped>
.ck-auth-page {
  --ck-bg: #fbf7f1;
  --ck-cream: #f5ede1;
  --ck-white: #fffdfa;
  --ck-ink: #2a2420;
  --ck-ink-2: #6b5f55;
  --ck-line: rgba(58, 46, 38, 0.12);
  --ck-coral: #c8543d;
  --ck-coral-deep: #a53f2c;
  --ck-serif: 'Playfair Display', Georgia, serif;

  display: grid;
  place-items: center;
  min-height: 72vh;
  padding: 3rem 1.5rem 4rem;
  background: var(--ck-bg);
  color: var(--ck-ink);
  font-family: 'Manrope', system-ui, sans-serif;
}
.ck-wrap { max-width: 74rem; margin: 0 auto; padding: 0 1.5rem; }
.ck-wrap--narrow { max-width: 30rem; }

.ck-h1 {
  font-family: var(--ck-serif);
  font-size: clamp(1.9rem, 4.4vw, 2.5rem);
  font-weight: 600;
  line-height: 1.15;
  text-align: center;
}

.ck-auth-page__crumb { margin-bottom: 1.25rem; }
.ck-auth-page__back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ck-ink-2);
  text-decoration: none;
}
.ck-auth-page__back:hover { color: var(--ck-coral-deep); }

.ck-auth-page__box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 2rem 2rem;
  border: 1px solid var(--ck-line);
  border-radius: 1.25rem;
  background: var(--ck-white);
  text-align: center;
}
.ck-auth-page__logo { width: 3.5rem; height: 3.5rem; border-radius: 0.9rem; }
.ck-auth-page__lead { margin: 0; font-size: 0.9375rem; line-height: 1.55; color: var(--ck-ink-2); }

.ck-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.5rem;
  padding: 0.85rem 1.6rem;
  border: none;
  border-radius: 999px;
  background: var(--ck-coral);
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.14s ease;
}
.ck-btn:hover { background: var(--ck-coral-deep); }

.ck-auth-page__alt { margin: 0.25rem 0 0; font-size: 0.875rem; color: var(--ck-ink-2); }
.ck-auth-page__switch {
  border: none;
  background: none;
  padding: 0;
  font-size: inherit;
  font-weight: 700;
  color: var(--ck-coral-deep);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.ck-auth-page__note {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  margin: 0.5rem 0 0;
  padding: 0.7rem 0.85rem;
  border-radius: 0.6rem;
  background: var(--ck-cream);
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--ck-ink-2);
  text-align: left;
}
.ck-auth-page__note .i-ph-lock-key { flex: none; margin-top: 0.1rem; color: var(--ck-coral); }
</style>
