<template>
  <Transition name="slide-up">
    <div
      v-if="showBanner"
      class="ck-cookie"
    >
      <div class="ck-cookie__box">
        <p class="ck-cookie__text">
          We use cookies to keep the site working and to see which pages are
          useful. Nothing is sold on.
          <NuxtLink to="/privacy" class="ck-cookie__link">Learn more</NuxtLink>
        </p>
        <div class="ck-cookie__actions">
          <button @click="rejectCookies" class="ck-cookie__btn ck-cookie__btn--ghost">
            Only necessary
          </button>
          <button @click="acceptCookies" class="ck-cookie__btn ck-cookie__btn--primary">
            Accept all
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const COOKIE_CONSENT_KEY = 'craftai_cookie_consent'

const consent = ref<'accepted' | 'rejected' | null>(null)
const showBanner = ref(false)

onMounted(() => {
  consent.value = localStorage.getItem(COOKIE_CONSENT_KEY) as 'accepted' | 'rejected' | null
  if (!consent.value) {
    showBanner.value = true
  }
})

function acceptCookies() {
  localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
  consent.value = 'accepted'
  showBanner.value = false
}

function rejectCookies() {
  localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected')
  consent.value = 'rejected'
  showBanner.value = false
}
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}


</style>
<style scoped>
/* 浅色暖调 —— 与品牌/弹窗一致（原来用的是深色紫，和新品牌不搭，
   而且会和登录弹窗同屏出现，非常突兀） */
.ck-cookie {
  --ck-bg: #fffdfa;
  --ck-cream: #f5ede1;
  --ck-ink: #2a2420;
  --ck-ink-2: #6b5f55;
  --ck-line: rgba(58, 46, 38, 0.14);
  --ck-coral: #c8543d;
  --ck-coral-deep: #a53f2c;

  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 1rem;
}

.ck-cookie__box {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 56rem;
  margin: 0 auto;
  padding: 1.1rem 1.25rem;
  border: 1px solid var(--ck-line);
  border-radius: 1rem;
  background: var(--ck-bg);
  box-shadow: 0 24px 50px -26px rgba(36, 31, 27, 0.45);
}

@media (min-width: 640px) {
  .ck-cookie__box {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    padding: 1.1rem 1.4rem;
  }
}

.ck-cookie__text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--ck-ink-2);
}
.ck-cookie__link {
  margin-left: 0.35rem;
  color: var(--ck-coral-deep);
  font-weight: 600;
  text-underline-offset: 3px;
}

.ck-cookie__actions { display: flex; gap: 0.5rem; flex: none; }
.ck-cookie__btn {
  height: 2.5rem;
  padding: 0 1rem;
  border: 1.5px solid transparent;
  border-radius: 0.6rem;
  font-size: 0.875rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease;
}
.ck-cookie__btn--primary { background: var(--ck-coral); color: #fff; }
.ck-cookie__btn--primary:hover { background: var(--ck-coral-deep); }
.ck-cookie__btn--ghost { border-color: var(--ck-line); background: transparent; color: var(--ck-ink); }
.ck-cookie__btn--ghost:hover { border-color: var(--ck-coral); color: var(--ck-coral-deep); }
</style>
