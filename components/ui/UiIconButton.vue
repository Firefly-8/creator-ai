<template>
  <button
    class="inline-flex items-center justify-center rounded-xl transition-colors"
    :class="[
      variant === 'ghost' ? 'hover:bg-white/5' : 'bg-white/10 hover:bg-white/15',
      size === 'md' ? 'h-9 w-9' : 'h-8 w-8'
    ]"
    :aria-label="ariaLabel"
    @click="$emit('click', $event)"
  >
    <span :class="icon" class="text-white/80" />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  variant?: 'ghost' | 'solid'
  size?: 'sm' | 'md'
  ariaLabel?: string
}>()

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>
