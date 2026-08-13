<template>
  <button
    class="ui-btn"
    :class="[
      `ui-btn--${variant}`,
      `ui-btn--${size}`,
      loading && 'is-loading',
      block && 'is-block',
    ]"
    :type="type"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="ui-btn__loader" aria-hidden="true">
      <span class="ui-btn__eq">
        <i /><i /><i /><i />
      </span>
    </span>
    <span class="ui-btn__content" :class="{ 'is-hidden': loading }">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'generate'
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
    size?: 'md' | 'sm'
    block?: boolean
  }>(),
  {
    variant: 'primary',
    loading: false,
    disabled: false,
    type: 'button',
    size: 'md',
    block: false,
  },
)
</script>

<style scoped>
.ui-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.75rem;
  padding: 0 1.2rem;
  border: 0;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 650;
  letter-spacing: 0.01em;
  white-space: nowrap;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    opacity 0.18s ease,
    color 0.18s ease;
}

.ui-btn--sm {
  min-height: 2.25rem;
  padding: 0 0.95rem;
  font-size: 12.5px;
}

.ui-btn.is-block {
  width: 100%;
}

.ui-btn:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.ui-btn:not(:disabled):active {
  transform: scale(0.98);
}

.ui-btn--primary {
  color: #fff;
  background: #8b7cff;
  box-shadow:
    0 0 0 1px rgba(139, 124, 255, 0.28),
    0 10px 28px -12px rgba(110, 92, 230, 0.7);
}

.ui-btn--primary:not(:disabled):hover {
  background: #6e5ce6;
}

.ui-btn--generate {
  min-width: 10.5rem;
  color: #fff;
  background: linear-gradient(135deg, #9b8cff 0%, #7a67f0 48%, #6e5ce6 100%);
  box-shadow:
    0 0 0 1px rgba(155, 140, 255, 0.35),
    0 12px 30px -12px rgba(110, 92, 230, 0.8);
}

.ui-btn--generate:not(:disabled):hover {
  filter: brightness(1.06);
  box-shadow:
    0 0 0 1px rgba(155, 140, 255, 0.45),
    0 16px 34px -10px rgba(110, 92, 230, 0.9);
}

.ui-btn--secondary {
  color: #f3f1fb;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}

.ui-btn--secondary:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.ui-btn--ghost {
  min-height: 2.5rem;
  color: #c9c3dd;
  background: transparent;
}

.ui-btn--ghost:not(:disabled):hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.ui-btn__content {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.ui-btn__content.is-hidden {
  opacity: 0;
}

.ui-btn__loader {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.ui-btn__eq {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 14px;
}

.ui-btn__eq > i {
  display: block;
  width: 3px;
  height: 40%;
  border-radius: 999px;
  background: currentColor;
  animation: btn-eq 0.9s ease-in-out infinite;
}

.ui-btn__eq > i:nth-child(2) {
  animation-delay: 0.12s;
}
.ui-btn__eq > i:nth-child(3) {
  animation-delay: 0.24s;
}
.ui-btn__eq > i:nth-child(4) {
  animation-delay: 0.36s;
}

@keyframes btn-eq {
  0%,
  100% {
    height: 35%;
    opacity: 0.65;
  }
  50% {
    height: 100%;
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-btn__eq > i {
    animation: none;
    height: 70%;
  }
}
</style>
