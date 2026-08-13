<template>
  <div
    class="ui-segment"
    :class="[`is-${size}`, equal && 'is-equal']"
    role="tablist"
  >
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      role="tab"
      class="ui-segment__item"
      :class="{ 'is-active': modelValue === opt.value }"
      :aria-selected="modelValue === opt.value"
      @click="$emit('update:modelValue', opt.value)"
    >
      <span v-if="opt.icon" class="ui-segment__icon" :class="opt.icon" />
      <span class="ui-segment__label">{{  opt.label  }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
export type SegmentOption = {
  value: string
  label: string
  icon?: string
}

withDefaults(
  defineProps<{
    modelValue: string
    options: SegmentOption[]
    size?: 'sm' | 'md'
    equal?: boolean
  }>(),
  {
    size: 'md',
    equal: false,
  },
)

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.ui-segment {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.035);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.ui-segment.is-equal {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  width: min(100%, 22rem);
}

.ui-segment__item {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 2.15rem;
  padding: 0 0.95rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #a39db8;
  font-size: 12.75px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.12s ease;
}

.ui-segment.is-sm .ui-segment__item {
  min-height: 1.85rem;
  padding: 0 0.75rem;
  font-size: 12px;
}

.ui-segment__icon {
  width: 0.95em;
  height: 0.95em;
  opacity: 0.85;
}

.ui-segment__item:hover:not(.is-active) {
  color: #e6e2f4;
  background: rgba(255, 255, 255, 0.04);
}

.ui-segment__item:active {
  transform: scale(0.98);
}

.ui-segment__item.is-active {
  color: #fff;
  background: rgba(139, 124, 255, 0.22);
  box-shadow:
    inset 0 0 0 1px rgba(139, 124, 255, 0.35),
    0 6px 16px -10px rgba(110, 92, 230, 0.75);
}

.ui-segment__item.is-active .ui-segment__icon {
  opacity: 1;
  color: #b4a9ff;
}

.ui-segment__label {
  line-height: 1;
}
</style>
