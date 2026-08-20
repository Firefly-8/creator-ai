<template>
  <div class="lang-switcher">
    <button
      class="lang-switcher__btn"
      :aria-label="t('ui.language', 'Language')"
      @click="toggle"
    >
      <span class="i-ph-translate text-[15px]" />
      <span class="lang-switcher__current">{{ currentLocaleName }}</span>
      <span class="i-ph-caret-down text-[12px] transition-transform" :class="{ 'rotate-180': open }" />
    </button>

    <Transition name="lang-drop">
      <div v-if="open" class="lang-switcher__dropdown" role="menu">
        <button
          v-for="loc in availableLocales"
          :key="loc.code"
          class="lang-switcher__item"
          :class="{ 'is-active': loc.code === locale }"
          role="menuitem"
          @click="selectLocale(loc.code)"
        >
          <span class="lang-switcher__name">{{ loc.name }}</span>
          <span v-if="loc.code === locale" class="i-ph-check text-[13px] text-accent" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const { locale, setLocale, t } = useI18n()
const open = ref(false)

const currentLocaleName = computed(() => {
  const names: Record<string, string> = {
    en: 'English',
    zh: '中文',
    ja: '日本語',
    de: 'Deutsch',
    fr: 'Français',
    ko: '한국어',
    es: 'Español',
    pt: 'Português',
    it: 'Italiano',
    ar: 'العربية',
  }
  return names[locale.value] || 'English'
})

const availableLocales = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'it', name: 'Italiano' },
  { code: 'ar', name: 'العربية' },
]

function toggle() {
  open.value = !open.value
}

function selectLocale(code: string) {
  setLocale(code)
  open.value = false
}

function close(e: PointerEvent) {
  const target = e.target as Node
  const root = document.querySelector('.lang-switcher')
  if (root && !root.contains(target)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', close)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', close)
})
</script>

<style scoped>
.lang-switcher {
  position: relative;
  width: 100%;
}

.lang-switcher__btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--muted);
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.2s;
}

.lang-switcher__btn:hover {
  border-color: var(--border-strong);
  color: var(--ink);
  background: var(--fill-soft);
}

.lang-switcher__current {
  flex: 1;
  text-align: left;
  font-weight: 500;
}

.lang-switcher__dropdown {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--surface, #14121c);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md, 0.75rem);
  overflow: hidden;
  z-index: 100;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  max-height: 280px;
  overflow-y: auto;
}

.lang-switcher__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  color: var(--ink);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s;
}

.lang-switcher__item:hover {
  background: var(--fill-soft);
}

.lang-switcher__item.is-active {
  color: var(--accent);
}

.lang-switcher__name {
  font-weight: 500;
}

/* Transition */
.lang-drop-enter-active,
.lang-drop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.lang-drop-enter-from,
.lang-drop-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
