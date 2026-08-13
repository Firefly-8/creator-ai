<template>
  <div ref="rootEl" class="ui-more">
    <UiIconButton
      icon="i-ph-dots-three"
      variant="ghost"
      size="sm"
      :aria-label="ariaLabel"
      :disabled="disabled"
      @click.stop="toggle"
    />
    <div
      v-if="open"
      class="ui-more__panel"
      :data-placement="placement"
      role="menu"
      @click.stop
    >
      <template v-for="item in items" :key="item.id">
        <div v-if="item.dividerBefore" class="ui-more__divider" role="separator" />
        <button
          type="button"
          class="ui-more__item"
          :class="{ 'is-danger': item.danger }"
          role="menuitem"
          :disabled="item.disabled"
          @click="onSelect(item)"
        >
          <span v-if="item.icon" class="ui-more__icon" :class="item.icon" aria-hidden="true" />
          <span>{{  item.label  }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
export type MoreMenuItem = {
  id: string
  label: string
  icon?: string
  danger?: boolean
  disabled?: boolean
  dividerBefore?: boolean
}

const props = withDefaults(
  defineProps<{
    items: MoreMenuItem[]
    ariaLabel?: string
    disabled?: boolean
    placement?: 'bottom' | 'top'
  }>(),
  {
    ariaLabel: '更多操作',
    disabled: false,
    placement: 'bottom',
  },
)

const emit = defineEmits<{
  select: [id: string]
}>()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

function toggle() {
  open.value = !open.value
}

function onSelect(item: MoreMenuItem) {
  if (item.disabled) return
  open.value = false
  emit('select', item.id)
}

function onDocPointer(e: PointerEvent) {
  if (!open.value || !rootEl.value) return
  if (!rootEl.value.contains(e.target as Node)) open.value = false
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointer)
  document.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointer)
  document.removeEventListener('keydown', onKey)
})

watch(
  () => props.disabled,
  (v) => {
    if (v) open.value = false
  },
)
</script>
