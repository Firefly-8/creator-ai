<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="close" />

        <!-- Modal Card -->
        <div class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <!-- Close button -->
          <button
            class="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition z-10"
            @click="close"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div class="p-8 pt-10">
            <!-- Logo -->
            <div class="flex justify-center mb-6">
              <div class="flex items-center gap-2">
                <img src="/logo.png" alt="Creator" class="h-10 w-10 rounded-xl object-contain" />
                <span class="font-display text-xl font-bold text-gray-900">Creator</span>
              </div>
            </div>

            <!-- Tab Switcher -->
            <div class="flex gap-1 rounded-xl bg-gray-100 p-1 mb-6">
              <button
                class="flex-1 py-2.5 text-sm font-medium rounded-lg transition"
                :class="mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                @click="mode = 'login'"
              >
                {{ $t('auth.login.tab') }}
              </button>
              <button
                class="flex-1 py-2.5 text-sm font-medium rounded-lg transition"
                :class="mode === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                @click="mode = 'signup'"
              >
                {{ $t('auth.signup.tab') }}
              </button>
            </div>

            <!-- Social Login -->
            <button
              class="flex items-center justify-center gap-3 w-full py-2.5 px-4 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 transition mb-4"
              :disabled="loading"
              @click="handleGoogleSignIn"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {{ mode === 'login' ? $t('auth.login.google') : $t('auth.signup.google') }}
            </button>

            <!-- Divider -->
            <div class="flex items-center gap-3 mb-4">
              <div class="flex-1 h-px bg-gray-200" />
              <span class="text-xs text-gray-400">{{ $t('auth.orEmail') }}</span>
              <div class="flex-1 h-px bg-gray-200" />
            </div>

            <!-- Form -->
            <form class="space-y-4" @submit.prevent="handleSubmit">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5" for="auth-email">
                  {{ $t('auth.email') }}
                </label>
                <input
                  id="auth-email"
                  v-model="email"
                  type="email"
                  class="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-sm focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                  :placeholder="$t('auth.emailPlaceholder')"
                  required
                />
              </div>
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="block text-sm font-medium text-gray-700" for="auth-password">
                    {{ $t('auth.password') }}
                  </label>
                    <button
                      v-if="mode === 'login'"
                      type="button"
                      class="text-xs text-accent hover:text-accent-dark transition"
                      @click="error = $t('auth.forgotPasswordComingSoon')"
                    >
                      {{ $t('auth.forgotPassword') }}
                    </button>
                  </div>
                <input
                  id="auth-password"
                  v-model="password"
                  type="password"
                  class="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-sm focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                  :placeholder="mode === 'signup' ? $t('auth.minChars') : $t('auth.passwordPlaceholder')"
                  required
                />
              </div>
              <div v-if="error" class="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                {{ error }}
              </div>
              <button
                type="submit"
                class="w-full py-2.5 px-4 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent-dark transition disabled:opacity-50"
                :disabled="loading"
              >
                {{ loading
                  ? (mode === 'login' ? $t('auth.login.loading') : $t('auth.signup.loading'))
                  : (mode === 'login' ? $t('auth.login.submit') : $t('auth.signup.submit'))
                }}
              </button>
            </form>

            <!-- Bottom text -->
            <p class="mt-6 text-center text-sm text-gray-500">
              {{ mode === 'login' ? $t('auth.noAccount') : $t('auth.haveAccount') }}
              <button
                class="text-accent font-medium hover:text-accent-dark transition ml-1"
                @click="mode = mode === 'login' ? 'signup' : 'login'"
              >
                {{ mode === 'login' ? $t('auth.signup.tab') : $t('auth.login.tab') }}
              </button>
            </p>
          </div>
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

const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth()

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

async function handleGoogleSignIn() {
  loading.value = true
  error.value = ''
  try {
    await signInWithGoogle()
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
    'auth/popup-closed-by-user': 'Login cancelled',
    'auth/account-exists-with-different-credential': 'An account already exists with this email',
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
