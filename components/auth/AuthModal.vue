<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-md" @click="close" />

        <!-- Modal Card -->
        <div class="auth-modal">
          <!-- Close -->
          <button class="auth-modal__close" aria-label="Close" @click="close">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div class="auth-modal__body">
            <!-- Logo -->
            <div class="auth-modal__brand">
              <img src="/logo.png" alt="Creator" class="auth-modal__logo" />
              <span class="auth-modal__title">Creator</span>
            </div>

            <!-- Tabs -->
            <div class="auth-modal__tabs is-hidden" role="tablist">
              <button
                role="tab"
                :aria-selected="mode === 'login'"
                class="auth-modal__tab"
                :class="{ 'is-active': mode === 'login' }"
                @click="mode = 'login'"
              >
                {{ $t('auth.login.tab') }}
              </button>
              <button
                role="tab"
                :aria-selected="mode === 'signup'"
                class="auth-modal__tab"
                :class="{ 'is-active': mode === 'signup' }"
                @click="mode = 'signup'"
              >
                {{ $t('auth.signup.tab') }}
              </button>
            </div>

            <!-- Google -->
            <button
              class="btn-secondary w-full !h-[2.75rem]"
              :disabled="loading"
              @click="handleGoogleSignIn"
            >
              <svg class="auth-modal__google-icon" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{{ mode === 'login' ? $t('auth.login.google') : $t('auth.signup.google') }}</span>
            </button>

            <!-- Divider -->
            <div class="auth-modal__divider">
              <span class="auth-modal__divider-line" />
              <span class="auth-modal__divider-text">{{ $t('auth.orEmail') }}</span>
              <span class="auth-modal__divider-line" />
            </div>

            <!-- Form -->
            <form class="auth-modal__form" @submit.prevent="handleSubmit">
              <div class="auth-modal__field">
                <label class="field-label" for="auth-email">{{ $t('auth.email') }}</label>
                <input
                  id="auth-email"
                  v-model="email"
                  type="email"
                  class="field !h-[2.75rem] rounded-full"
                  :placeholder="$t('auth.emailPlaceholder')"
                  autocomplete="email"
                  required
                />
              </div>
              <div class="auth-modal__field">
                <div class="auth-modal__field-head">
                  <label class="field-label" for="auth-password">{{ $t('auth.password') }}</label>
                  <button
                    v-if="mode === 'login'"
                    type="button"
                    class="text-xs text-accent-soft hover:text-accent bg-transparent border-0 cursor-pointer"
                    @click="error = $t('auth.forgotPasswordComingSoon')"
                  >
                    {{ $t('auth.forgotPassword') }}
                  </button>
                </div>
                <input
                  id="auth-password"
                  v-model="password"
                  type="password"
                  class="field !h-[2.75rem] rounded-full"
                  :placeholder="mode === 'signup' ? $t('auth.minChars') : $t('auth.passwordPlaceholder')"
                  autocomplete="current-password"
                  required
                />
              </div>

              <div v-if="error" class="auth-modal__error">
                {{ error }}
              </div>

              <button
                type="submit"
                class="btn-primary w-full !h-[2.75rem]"
                :disabled="loading"
              >
                <span v-if="loading" class="auth-modal__spinner" />
                <span v-else>
                  {{ mode === 'login' ? $t('auth.login.submit') : $t('auth.signup.submit') }}
                </span>
              </button>
            </form>

            <!-- Switch mode -->
            <p class="auth-modal__switch">
              {{ mode === 'login' ? $t('auth.noAccount') : $t('auth.haveAccount') }}
              <button
                type="button"
                class="auth-modal__switch-btn"
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
/* ── Modal Card ── */
.auth-modal {
  position: relative;
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 64px -16px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04);
  overflow: hidden;
}

.auth-modal__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
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
  transition: color var(--ease-out), background var(--ease-out);
}
.auth-modal__close:hover {
  color: var(--ink);
  background: var(--fill-hover);
}

.auth-modal__body {
  padding: 2rem;
}

/* ── Brand ── */
.auth-modal__brand {
  flex-direction: column;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin-bottom: 1.75rem;
}
.auth-modal__logo {
  width: 4rem;
  height: 4rem;
  border-radius: var(--radius-sm);
  object-fit: contain;
}
.auth-modal__title {
  font-family: 'Sora', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.035em;
}

/* ── Tabs ── */
.auth-modal__tabs {
}

.auth-modal__tabs.is-hidden {
  display: none;
}

.auth-modal__tab-switch {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  margin-bottom: 1.5rem;
  background: var(--fill-soft);
  border-radius: var(--radius-pill);
}
.auth-modal__tab {
  flex: 1;
  padding: 0.55rem 1rem;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: color var(--ease-out), background var(--ease-out);
}
.auth-modal__tab:hover {
  color: var(--ink);
}
.auth-modal__tab.is-active {
  background: var(--surface-raised);
  color: var(--ink);
  box-shadow: inset 0 0 0 1px var(--border-soft);
}


/* ── Divider ── */
.auth-modal__divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.auth-modal__divider-line {
  flex: 1;
  height: 1px;
  background: var(--border-subtle);
}
.auth-modal__divider-text {
  font-size: 0.75rem;
  color: var(--muted);
  white-space: nowrap;
}

/* ── Form ── */
.auth-modal__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.auth-modal__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.auth-modal__field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
