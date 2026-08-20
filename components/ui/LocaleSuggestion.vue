<template>
  <Transition name="locale-banner">
    <div v-if="showBanner" class="locale-banner">
      <p class="locale-banner__text">
        {{ t('ui.localeSuggested', '检测到您来自中文地区，是否切换到中文？') }}
      </p>
      <div class="locale-banner__actions">
        <button class="locale-banner__btn locale-banner__btn--primary" @click="switchToZh">
          切换到中文
        </button>
        <button class="locale-banner__btn locale-banner__btn--ghost" @click="dismiss">
          {{ t('ui.dismiss', 'No thanks') }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { locale, setLocale } = useI18n()
const showBanner = ref(false)

onMounted(() => {
  // 只在英文状态下提示
  if (locale.value !== 'en') return

  // 读取 middleware 设置的 cookie
  const suggested = getCookie('craftai_suggested_locale')
  if (suggested === 'zh') {
    showBanner.value = true
  }
})

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function switchToZh() {
  setLocale('zh')
  dismiss()
}

function dismiss() {
  showBanner.value = false
  // 设置 cookie 不再提示
  document.cookie = 'craftai_suggested_locale=dismissed; max-age=2592000; path=/; SameSite=Lax'
}
</script>

<style scoped>
.locale-banner {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9000;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  background: var(--surface, #1a1726);
  border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.12));
  border-radius: var(--radius-pill, 999px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  max-width: calc(100vw - 32px);
}

.locale-banner__text {
  font-size: 0.82rem;
  color: var(--ink, #f3f1fb);
  white-space: nowrap;
}

.locale-banner__actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.locale-banner__btn {
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-pill, 999px);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.locale-banner__btn--primary {
  background: var(--accent, #8b7cff);
  color: #fff;
  border: none;
}

.locale-banner__btn--primary:hover {
  background: var(--accent-deep, #6e5ce6);
}

.locale-banner__btn--ghost {
  background: transparent;
  color: var(--muted, #a39db8);
  border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.12));
}

.locale-banner__btn--ghost:hover {
  color: var(--ink, #f3f1fb);
  background: var(--fill-soft, rgba(255, 255, 255, 0.06));
}

/* Transition */
.locale-banner-enter-active,
.locale-banner-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.locale-banner-enter-from,
.locale-banner-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}

@media (max-width: 480px) {
  .locale-banner {
    flex-direction: column;
    gap: 0.6rem;
    border-radius: var(--radius-md, 0.75rem);
    padding: 0.85rem 1rem;
  }
  .locale-banner__text {
    white-space: normal;
    text-align: center;
  }
}
</style>
