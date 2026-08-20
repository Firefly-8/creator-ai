<template>
  <Transition name="slide-up">
    <div
      v-if="showBanner"
      class="fixed bottom-0 left-0 right-0 z-[100] p-4"
    >
      <div class="mx-auto max-w-4xl rounded-2xl bg-surface-raised border border-border-subtle p-6 shadow-2xl">
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div class="flex-1">
            <p class="text-sm text-ink-200">
              We use cookies to enhance your experience and analyze site traffic. By continuing to use our site, you consent to our use of cookies.
              <NuxtLink to="/privacy" class="text-accent-soft hover:text-accent underline">Learn more</NuxtLink>
            </p>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <button @click="rejectCookies" class="btn-secondary !h-9 !px-4 !text-sm">
              Reject
            </button>
            <button @click="acceptCookies" class="btn-primary !h-9 !px-4 !text-sm">
              Accept All
            </button>
          </div>
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
