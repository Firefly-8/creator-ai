<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="feedback-overlay" @click.self="close">
        <div class="feedback-backdrop" @click="close" />
        <div class="feedback-card">
          <!-- Header -->
          <div class="feedback-header">
            <h3 class="feedback-title">{{ $t('feedback.title', 'Send Feedback') }}</h3>
            <button class="feedback-close" @click="close" aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Success State -->
          <div v-if="submitted" class="feedback-success">
            <div class="feedback-success__icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p class="feedback-success__text">{{ $t('feedback.thanks', 'Thank you for your feedback!') }}</p>
            <button class="btn-primary w-full" @click="close">
              {{ $t('feedback.done', 'Done') }}
            </button>
          </div>

          <!-- Form -->
          <form v-else class="feedback-form" @submit.prevent="handleSubmit">
            <!-- Type Selection -->
            <div class="feedback-types">
              <button
                v-for="t in types"
                :key="t.value"
                type="button"
                class="feedback-type"
                :class="{ 'is-active': form.type === t.value }"
                @click="form.type = t.value"
              >
                <span class="feedback-type__icon">{{ t.icon }}</span>
                <span>{{ $t(t.labelKey) }}</span>
              </button>
            </div>

            <!-- Title -->
            <div class="feedback-field">
              <label class="field-label">{{ $t('feedback.subject', 'Subject') }}</label>
              <input
                v-model="form.title"
                type="text"
                class="field"
                :placeholder="$t('feedback.subjectPlaceholder', 'Brief description')"
                maxlength="200"
              />
            </div>

            <!-- Message -->
            <div class="feedback-field">
              <label class="field-label">{{ $t('feedback.message', 'Details') }}</label>
              <textarea
                v-model="form.message"
                class="field feedback-textarea"
                :placeholder="$t('feedback.messagePlaceholder', 'Tell us what you think or report an issue...')"
                rows="4"
                maxlength="5000"
                required
              />
            </div>

            <!-- Error -->
            <div v-if="error" class="feedback-error">
              {{ error }}
            </div>

            <!-- Submit -->
            <button
              type="submit"
              class="btn-primary w-full"
              :disabled="loading || !form.message.trim()"
            >
              <span v-if="loading">{{ $t('feedback.sending', 'Sending...') }}</span>
              <span v-else>{{ $t('feedback.submit', 'Submit Feedback') }}</span>
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const props = defineProps<{
  modelValue: boolean
  contentId?: string
  source?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const { getIdToken } = useAuth()

const types = [
  { value: 'bug', icon: '🐛', labelKey: 'feedback.typeBug' },
  { value: 'feature', icon: '💡', labelKey: 'feedback.typeFeature' },
  { value: 'content', icon: '✨', labelKey: 'feedback.typeContent' },
  { value: 'other', icon: '💬', labelKey: 'feedback.typeOther' },
]

const form = reactive({
  type: 'other',
  title: '',
  message: '',
})

const loading = ref(false)
const error = ref('')
const submitted = ref(false)

function close() {
  isOpen.value = false
  if (submitted.value) {
    // Reset after close animation
    setTimeout(() => {
      submitted.value = false
      form.type = 'other'
      form.title = ''
      form.message = ''
      error.value = ''
    }, 300)
  }
}

async function handleSubmit() {
  if (!form.message.trim()) return

  loading.value = true
  error.value = ''

  try {
    const token = await getIdToken()
    await $fetch('/api/feedback', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        source: props.source || 'creator',
        type: form.type,
        contentId: props.contentId,
        title: form.title.trim(),
        message: form.message.trim(),
      },
    })
    submitted.value = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to submit feedback'
  } finally {
    loading.value = false
  }
}

watch(() => props.modelValue, (val) => {
  if (val) {
    submitted.value = false
    error.value = ''
  }
})
</script>

<style scoped>
.feedback-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.feedback-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
}

.feedback-card {
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}

.feedback-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.feedback-title {
  font-family: 'Sora', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ink);
}

.feedback-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--fill-soft);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
}
.feedback-close:hover {
  color: var(--ink);
  background: var(--fill-hover);
}

/* Types */
.feedback-types {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.feedback-type {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.6rem 0.25rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--muted);
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s;
}

.feedback-type:hover {
  border-color: var(--border-strong);
  color: var(--ink);
}

.feedback-type.is-active {
  border-color: var(--accent);
  background: rgba(139, 124, 255, 0.1);
  color: var(--accent-soft);
}

.feedback-type__icon {
  font-size: 1.25rem;
}

/* Fields */
.feedback-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.feedback-textarea {
  resize: vertical;
  min-height: 100px;
}

/* Success */
.feedback-success {
  text-align: center;
  padding: 1.5rem 0;
}

.feedback-success__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  margin-bottom: 1rem;
  border-radius: 50%;
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
}

.feedback-success__text {
  color: var(--muted);
  margin-bottom: 1.5rem;
}

/* Error */
.feedback-error {
  padding: 0.6rem 0.75rem;
  margin-bottom: 1rem;
  border-radius: var(--radius-md);
  background: rgba(240, 113, 120, 0.1);
  color: var(--danger, #f07178);
  font-size: 0.85rem;
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
