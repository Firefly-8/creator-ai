<template>
  <button
    class="ui-icon-btn"
    :class="[
      `ui-icon-btn--${variant}`,
      `ui-icon-btn--${size}`,
      !label && 'ui-icon-btn--icon-only',
      loading && 'is-loading',
    ]"
    :type="type"
    :disabled="disabled || loading"
    :aria-label="ariaLabel || label || undefined"
    :aria-busy="loading || undefined"
  >
    <span class="ui-icon-btn__icon" :class="icon" aria-hidden="true" />
    <span v-if="label" class="ui-icon-btn__label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    icon: string
    label?: string
    /** Accessible name when label is omitted */
    ariaLabel?: string
    variant?: 'ghost' | 'soft' | 'outline'
    size?: 'sm' | 'md'
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  {
    label: undefined,
    ariaLabel: undefined,
    variant: 'soft',
    size: 'sm',
    loading: false,
    disabled: false,
    type: 'button',
  },
)
</script>
