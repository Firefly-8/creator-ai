<template>
  <UiIconButton
    icon="i-ph-arrow-clockwise"
    :label="label"
    :aria-label="ariaLabel"
    :variant="variant"
    :size="size"
    :loading="loading"
    :disabled="disabled"
    :type="type"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    ariaLabel?: string
    variant?: 'ghost' | 'soft' | 'outline'
    size?: 'sm' | 'md'
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  {
    label: '刷新',
    ariaLabel: '刷新列表',
    variant: 'soft',
    size: 'sm',
    loading: false,
    disabled: false,
    type: 'button',
  },
)
</script>
