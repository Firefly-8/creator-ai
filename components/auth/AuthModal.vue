<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close" />

        <!-- Modal -->
        <div class="panel relative w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
          <!-- Close button -->
          <button
            class="absolute right-4 top-4 text-ink-400 hover:text-white transition"
            @click="close"
          >
            <span class="i-ph-x text-xl" />
          </button>

          <!-- Tab switcher -->
          <div class="flex gap-1 rounded-xl bg-white/5 p-1 mb-6">
            <button
              class="flex-1 py-2 text-sm font-medium rounded-lg transition"
              :class="mode === 'login' ? 'bg-accent text-white' : 'text-ink-300 hover:text-white'"
              @click="mode = 'login'"
            >
              $t('nav.login')
            </button>
            <button
              class="flex-1 py-2 text-sm font-medium rounded-lg transition"
              :class="mode === 'signup' ? 'bg-accent text-white' : 'text-ink-300 hover:text-white'"
              @click="mode = 'signup'"
            >
              $t('nav.signup')
            </button>
          </div>

          <!-- Title -->
          <div class="text-center mb-6">
            <h2 class="font-display text-2xl font-700 text-white">
              {{ mode === 'login' ? $t('auth.login.title') : $t('auth.signup.title') }}
            </h2>
            <p class="mt-1 text-sm text-ink-300">
              {{ mode === 'login' ? $t('auth.login.subtitle') : $t('auth.signup.subtitle') }}
            </p>
          </div>

          <!-- Form -->
          <form class="space-y-4" @submit.prevent="handleSubmit">
            <div>
              <label class="field-label" for="auth-email">$t('auth.login.email')</label>
              <input
                id="auth-email"
                v-model="email"
                type="email"
                class="field mt-1"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label class="field-label" for="auth-password">$t('auth.login.password')</label>
              <input
                id="auth-password"
                v-model="password"
                type="password"
                class="field mt-1"
                :placeholder="mode === 'signup' ? $t('auth.signup.minChars') : $t('auth.login.enterPassword')"
                required
              />
            </div>
            <div v-if="error" class="rounded-xl bg-danger/10 p-3 text-sm text-danger">
              {{ error }}
            </div>
            <button type="submit" class="btn-primary w-full" :disabled="loading">
              {{ loading
                ? (mode === 'login' ? $t('auth.login.loading') : $t('auth.signup.loading'))
                : (mode === 'login' ? $t('auth.login.submit') : $t('auth.signup.submit'))
              }}
            </button>
          </form>

          <!-- Terms (signup only) -->
          <p v-if="mode === 'signup'" class="mt-4 text-center text-xs text-ink-400">
            $t('auth.signup.agreePrefix')
            <NuxtLink to="/terms" class="text-accent-soft hover:text-accent" @click="close">Terms</NuxtLink>
            and
            <NuxtLink to="/privacy" class="text-accent-soft hover:text-accent" @click="close">Privacy</NuxtLink>
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  initialMode?: 'login' | 'signup'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { signInWithEmail, signUpWithEmail } = useAuth()

const mode = ref(props.initialMode || 'login')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

function close() {
  isOpen.value = false
  error.value = ''
}

watch(() => props.initialMode, (val) => {
  if (val) mode.value = val
})

async function handleSubmit() {
  if (mode.value === 'signup' && password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }

  loading.value = true
  error.value = ''

  try {
    if (mode.value === 'login') {
      await signInWithEmail(email.value, password.value)
    } else {
      await signUpWithEmail(email.value, password.value)
    }
    close()
    await navigateTo('/dashboard')
  } catch (e: any) {
    error.value = getFirebaseErrorMessage(e.code)
  } finally {
    loading.value = false
  }
}

function getFirebaseErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/too-many-requests': 'Too many attempts, please try later',
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password': 'Password must be at least 8 characters',
    'auth/network-request-failed': 'Network error, please check your connection',
  }
  return messages[code] || 'Something went wrong, please try again'
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.zoom-in-95 {
  animation: zoomIn 0.2s ease;
}
@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
