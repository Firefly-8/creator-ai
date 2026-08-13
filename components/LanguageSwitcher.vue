<template>
  <div class="relative" ref="container">
    <button
      class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-ink-300 hover:bg-white/5 hover:text-white transition"
      @click="isOpen = !isOpen"
    >
      <span class="i-ph-translate text-[15px]" />
      <span class="uppercase text-xs font-medium">{{  currentLocale  }}</span>
      <span class="i-ph-caret-down text-[12px]" />
    </button>

    <Transition name="fade">
      <div
        v-if="isOpen"
        class="absolute right-0 top-full mt-1 w-40 rounded-xl bg-[#1a1726] border border-white/10 shadow-xl py-1 z-50"
      >
        <button
          v-for="loc in locales"
          :key="loc.code"
          class="flex items-center gap-2 w-full px-3 py-2 text-sm transition"
          :class="loc.code === currentLocale ? 'text-accent-soft bg-white/5' : 'text-ink-300 hover:bg-white/5 hover:text-white'"
          @click="switchLocale(loc.code)"
        >
          <span class="text-xs w-8 uppercase">{{  loc.code  }}</span>
          <span>{{  loc.name  }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const { locale, locales } = useI18n()
const isOpen = ref(false)
const container = ref<HTMLElement>()

const currentLocale = computed(() => locale.value)

function switchLocale(code: string) {
  locale.value = code
  isOpen.value = false
}

function onClickOutside(e: MouseEvent) {
  if (container.value && !container.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
