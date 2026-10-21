<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-md" @click="cancel" />
        <div class="confirm-modal">
          <div class="confirm-modal__body">
            <div class="confirm-modal__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 class="confirm-modal__title">{{ title }}</h3>
            <p v-if="message" class="confirm-modal__message">{{ message }}</p>
          </div>
          <div class="confirm-modal__actions">
            <button class="confirm-modal__btn confirm-modal__btn--cancel" @click="cancel">
              {{ cancelLabel }}
            </button>
            <button
              class="confirm-modal__btn confirm-modal__btn--confirm"
              :class="{ 'confirm-modal__btn--danger': danger }"
              @click="confirm"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}>(), {
  title: 'Are you sure?',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  danger: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function confirm() { emit('confirm') }
function cancel() { emit('cancel') }
</script>

<style scoped>
.confirm-modal {
  position: relative;
  width: 100%;
  max-width: 380px;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 64px -16px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.confirm-modal__body {
  padding: 1.75rem 1.75rem 1.25rem;
  text-align: center;
}

.confirm-modal__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  margin-bottom: 0.85rem;
  border-radius: 50%;
  background: rgba(240, 113, 120, 0.1);
  color: var(--danger, #f07178);
}

.confirm-modal__title {
  font-family: 'Sora', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.02em;
}

.confirm-modal__message {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.5;
}

.confirm-modal__actions {
  display: flex;
  gap: 0.5rem;
  padding: 0 1.75rem 1.5rem;
}

.confirm-modal__btn {
  flex: 1;
  height: 2.5rem;
  border: none;
  border-radius: var(--radius-pill);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-modal__btn--cancel {
  background: var(--fill-soft);
  color: var(--muted);
  border: 1px solid var(--border-subtle);
}

.confirm-modal__btn--cancel:hover {
  background: var(--fill-hover);
  color: var(--ink);
}

.confirm-modal__btn--confirm {
  background: var(--accent);
  color: #fff;
}

.confirm-modal__btn--confirm:hover {
  background: var(--accent-deep);
}

.confirm-modal__btn--danger {
  background: var(--danger, #f07178);
}

.confirm-modal__btn--danger:hover {
  background: #e05060;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
