<template>
  <Teleport to="body">
    <Transition name="ck-auth">
      <div
        v-if="isOpen"
        class="ck-auth__overlay"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.self="close"
        @keydown.esc="close"
      >
        <div class="ck-auth" @keydown.tab="trapFocus">
          <!-- 关闭 -->
          <button class="ck-auth__close" aria-label="Close" @click="close">
            <span class="i-ph-x" />
          </button>

          <div class="ck-auth__body">
            <!-- 品牌 -->
            <div class="ck-auth__brand">
              <img src="/logo.png" alt="" class="ck-auth__logo" />
              <h2 :id="titleId" class="ck-auth__title">{{ heading }}</h2>
              <p class="ck-auth__subtitle">{{ subheading }}</p>
            </div>

            <!-- 标签页 -->
            <div class="ck-auth__tabs" role="tablist">
              <button
                role="tab"
                :aria-selected="mode === 'login'"
                class="ck-auth__tab"
                :class="{ 'is-active': mode === 'login' }"
                @click="switchMode('login')"
              >
                Sign in
              </button>
              <button
                role="tab"
                :aria-selected="mode === 'signup'"
                class="ck-auth__tab"
                :class="{ 'is-active': mode === 'signup' }"
                @click="switchMode('signup')"
              >
                Create an account
              </button>
            </div>

            <!-- Google -->
            <button
              class="ck-auth__google"
              :disabled="loading"
              @click="handleGoogleSignIn"
            >
              <svg class="ck-auth__google-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <div class="ck-auth__divider">
              <span class="ck-auth__divider-line" />
              <span>or use your email</span>
              <span class="ck-auth__divider-line" />
            </div>

            <!-- 表单 -->
            <form class="ck-auth__form" @submit.prevent="handleSubmit">
              <div class="ck-auth__field">
                <label class="ck-auth__label" for="auth-email">Email address</label>
                <input
                  id="auth-email"
                  ref="emailInput"
                  v-model="email"
                  type="email"
                  class="ck-auth__input"
                  placeholder="you@example.com"
                  autocomplete="email"
                  inputmode="email"
                  required
                />
              </div>

              <div class="ck-auth__field">
                <div class="ck-auth__label-row">
                  <label class="ck-auth__label" for="auth-password">Password</label>
                  <span v-if="mode === 'signup'" class="ck-auth__hint">At least 8 characters</span>
                </div>
                <div class="ck-auth__input-wrap">
                  <input
                    id="auth-password"
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    class="ck-auth__input ck-auth__input--with-btn"
                    placeholder="Your password"
                    :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'"
                    required
                  />
                  <button
                    type="button"
                    class="ck-auth__eye"
                    :aria-label="showPassword ? 'Hide password' : 'Show password'"
                    @click="showPassword = !showPassword"
                  >
                    <span :class="showPassword ? 'i-ph-eye-slash' : 'i-ph-eye'" />
                  </button>
                </div>
              </div>

              <div v-if="error" class="ck-auth__error" role="alert">
                <span class="i-ph-warning-circle" />
                <span>{{ error }}</span>
              </div>

              <button type="submit" class="ck-auth__submit" :disabled="loading">
                <span v-if="loading" class="ck-auth__spinner" />
                <span v-else>{{ mode === 'login' ? 'Sign in' : 'Create my account' }}</span>
              </button>
            </form>

            <!-- 信任 -->
            <p class="ck-auth__promise">
              <span class="i-ph-lock-key" />
              Your photos stay private. We never publish them, and we do not
              send newsletters.
            </p>

            <!-- 切换 -->
            <p class="ck-auth__switch">
              <template v-if="mode === 'login'">
                No account yet?
                <button type="button" class="ck-auth__switch-btn" @click="switchMode('signup')">
                  Create one
                </button>
              </template>
              <template v-else>
                Already have an account?
                <button type="button" class="ck-auth__switch-btn" @click="switchMode('login')">
                  Sign in
                </button>
              </template>
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
const { redirectPath, clearRedirect } = useAuthModal()

const mode = ref(props.initialMode || 'login')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)
const emailInput = ref<HTMLInputElement | null>(null)
const titleId = 'ck-auth-title'

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const heading = computed(() =>
  mode.value === 'login' ? 'Welcome back' : 'Keep your cards in one place',
)
const subheading = computed(() =>
  mode.value === 'login'
    ? 'Sign in to pick up where you left off.'
    : 'Save your photos, your cards and your words. Free to start.',
)

function close() {
  isOpen.value = false
  error.value = ''
  showPassword.value = false
  clearRedirect()
}

function switchMode(next: 'login' | 'signup') {
  mode.value = next
  error.value = ''
  showPassword.value = false
  nextTick(() => emailInput.value?.focus())
}

watch(() => props.initialMode, (val) => {
  if (val) mode.value = val
})

// 打开时聚焦第一个输入框（省一次点击，中老年用户尤其需要）
watch(isOpen, (open) => {
  if (!open) return
  error.value = ''
  nextTick(() => emailInput.value?.focus())
})

/** 焦点陷阱：Tab 不应该跑到弹窗外面去 */
function trapFocus(e: KeyboardEvent) {
  const root = e.currentTarget as HTMLElement
  const focusables = root.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  )
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

/** 把 Firebase 的错误码翻译成人话 */
function friendlyError(e: any): string {
  const code = String(e?.code || '')
  const msg = String(e?.message || '')
  if (code.includes('email-already-in-use') || msg.includes('already in use')) {
    return 'There is already an account with that email. Try signing in instead.'
  }
  if (code.includes('invalid-credential') || msg.includes('wrong password')
    || msg.includes('invalid login')) {
    return 'That email and password do not match. Check for typos and try again.'
  }
  if (code.includes('too-many-requests')) {
    return 'Too many attempts. Wait a minute and try again.'
  }
  if (code.includes('weak-password')) {
    return 'Please choose a longer password — at least 8 characters.'
  }
  if (code.includes('network-request-failed')) {
    return 'We could not reach the server. Check your connection and try again.'
  }
  if (msg.includes('verify') && msg.includes('before')) {
    return 'Please verify your email first — check your inbox for the link we sent.'
  }
  return msg.replace('Firebase: ', '').replace(/\(auth\/.+\)\.?$/, '') || 'Something went wrong. Please try again.'
}

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    if (mode.value === 'login') {
      await signInWithEmail(email.value, password.value)
    } else {
      await signUpWithEmail(email.value, password.value)
    }
    const to = redirectPath.value
    close()
    if (to) {
      clearRedirect()
      await navigateTo(to)
    }
  } catch (e: any) {
    error.value = friendlyError(e)
  } finally {
    loading.value = false
  }
}

async function handleGoogleSignIn() {
  error.value = ''
  loading.value = true
  try {
    await signInWithGoogle()
    const to = redirectPath.value
    close()
    if (to) {
      clearRedirect()
      await navigateTo(to)
    }
  } catch (e: any) {
    error.value = friendlyError(e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ------------------------------------------------------------------
   登录弹窗 —— 浅色暖调，跟品牌一致
   ⚠️ 刻意不用全局深色 token（--ink / --surface-raised / --fill-soft）：
      那些是给深色工作台用的，弹窗要同时出现在浅色营销页和深色工作台里，
      所以在这里定义自己的一套浅色变量，两边都不违和。
   ------------------------------------------------------------------ */
.ck-auth__overlay {
  position: fixed;
  inset: 0;
  /* ⚠️ 必须高于 CookieConsent 的 z-[100]，否则 cookie 条会浮在弹窗上面 */
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(36, 31, 27, 0.45);
  backdrop-filter: blur(6px);
}

.ck-auth {
  --ck-bg: #fffdfa;
  --ck-cream: #f5ede1;
  --ck-ink: #2a2420;
  --ck-ink-2: #6b5f55;
  --ck-line: rgba(58, 46, 38, 0.16);
  --ck-coral: #c8543d;
  --ck-coral-deep: #a53f2c;
  --ck-serif: 'Playfair Display', Georgia, serif;

  position: relative;
  width: min(27rem, 100%);
  max-height: calc(100vh - 3rem);
  overflow-y: auto;
  border-radius: 1.25rem;
  background: var(--ck-bg);
  box-shadow: 0 40px 80px -30px rgba(36, 31, 27, 0.55);
}

.ck-auth__body { padding: 2.25rem 2rem 1.75rem; }

.ck-auth__close {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 999px;
  background: var(--ck-cream);
  color: var(--ck-ink-2);
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.14s ease, color 0.14s ease;
}
.ck-auth__close:hover { background: #ece0d0; color: var(--ck-ink); }

/* ---------- 品牌 ---------- */
.ck-auth__brand { display: flex; flex-direction: column; align-items: center; text-align: center; }
.ck-auth__logo {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 0.9rem;
  object-fit: contain;
}
.ck-auth__title {
  margin: 0.85rem 0 0;
  font-family: var(--ck-serif);
  font-size: 1.65rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--ck-ink);
}
.ck-auth__subtitle {
  margin: 0.45rem 0 0;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--ck-ink-2);
}

/* ---------- 标签页 ---------- */
.ck-auth__tabs {
  display: flex;
  gap: 0.25rem;
  margin: 1.5rem 0 1.25rem;
  padding: 0.25rem;
  border-radius: 999px;
  background: var(--ck-cream);
}
.ck-auth__tab {
  flex: 1;
  padding: 0.6rem 0.5rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ck-ink-2);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.16s ease, color 0.16s ease;
}
.ck-auth__tab:hover { color: var(--ck-ink); }
.ck-auth__tab.is-active {
  background: var(--ck-bg);
  color: var(--ck-ink);
  box-shadow: 0 2px 8px -3px rgba(58, 46, 38, 0.3);
}

/* ---------- Google ---------- */
.ck-auth__google {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  width: 100%;
  height: 3rem;
  border: 1.5px solid var(--ck-line);
  border-radius: 0.7rem;
  background: #fff;
  font-size: 1rem;
  font-weight: 600;
  color: var(--ck-ink);
  cursor: pointer;
  transition: border-color 0.14s ease, background 0.14s ease;
}
.ck-auth__google:hover:not(:disabled) { border-color: #c9b9a6; background: #fefcf8; }
.ck-auth__google:disabled { opacity: 0.6; cursor: not-allowed; }
.ck-auth__google-icon { width: 1.15rem; height: 1.15rem; flex: none; }

/* ---------- 分隔 ---------- */
.ck-auth__divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.15rem 0;
  font-size: 0.8125rem;
  color: #a08f81;
}
.ck-auth__divider-line { flex: 1; height: 1px; background: var(--ck-line); }

/* ---------- 表单 ---------- */
.ck-auth__form { display: flex; flex-direction: column; gap: 1rem; }
.ck-auth__field { display: flex; flex-direction: column; gap: 0.4rem; }
.ck-auth__label-row { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
.ck-auth__label { font-size: 0.875rem; font-weight: 600; color: var(--ck-ink); }
.ck-auth__hint { font-size: 0.75rem; color: #a08f81; }

.ck-auth__input {
  width: 100%;
  height: 3rem;
  padding: 0 0.9rem;
  border: 1.5px solid var(--ck-line);
  border-radius: 0.7rem;
  background: #fff;
  /* 17px 起步：iOS Safari 在 <16px 时会自动缩放页面 */
  font-size: 1.0625rem;
  font-family: inherit;
  color: var(--ck-ink);
  transition: border-color 0.14s ease, box-shadow 0.14s ease;
}
.ck-auth__input::placeholder { color: #b8a99b; }
.ck-auth__input:focus {
  outline: none;
  border-color: var(--ck-coral);
  box-shadow: 0 0 0 3px rgba(200, 84, 61, 0.15);
}
.ck-auth__input--with-btn { padding-right: 3rem; }

.ck-auth__input-wrap { position: relative; }
.ck-auth__eye {
  position: absolute;
  top: 50%;
  right: 0.4rem;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 2.2rem;
  height: 2.2rem;
  border: none;
  border-radius: 0.5rem;
  background: none;
  color: #a08f81;
  font-size: 1.1rem;
  cursor: pointer;
}
.ck-auth__eye:hover { color: var(--ck-ink); background: var(--ck-cream); }

/* ---------- 错误 ---------- */
.ck-auth__error {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.7rem 0.85rem;
  border-radius: 0.6rem;
  background: rgba(200, 84, 61, 0.1);
  font-size: 0.875rem;
  line-height: 1.5;
  color: #8f3524;
}
.ck-auth__error .i-ph-warning-circle { flex: none; margin-top: 0.1rem; font-size: 1.05rem; }

/* ---------- 提交 ---------- */
.ck-auth__submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 3rem;
  margin-top: 0.25rem;
  border: none;
  border-radius: 0.7rem;
  background: var(--ck-coral);
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  transition: background 0.14s ease;
}
.ck-auth__submit:hover:not(:disabled) { background: var(--ck-coral-deep); }
.ck-auth__submit:disabled { opacity: 0.65; cursor: not-allowed; }

.ck-auth__spinner {
  width: 1.05rem;
  height: 1.05rem;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 999px;
  animation: ck-auth-spin 0.7s linear infinite;
}
@keyframes ck-auth-spin { to { transform: rotate(360deg); } }

/* ---------- 承诺 ---------- */
.ck-auth__promise {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  margin: 1.15rem 0 0;
  padding: 0.7rem 0.85rem;
  border-radius: 0.6rem;
  background: var(--ck-cream);
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--ck-ink-2);
}
.ck-auth__promise .i-ph-lock-key { flex: none; margin-top: 0.1rem; color: var(--ck-coral); }

/* ---------- 切换 ---------- */
.ck-auth__switch {
  margin: 1.15rem 0 0;
  text-align: center;
  font-size: 0.875rem;
  color: var(--ck-ink-2);
}
.ck-auth__switch-btn {
  border: none;
  background: none;
  padding: 0;
  font-size: inherit;
  font-weight: 700;
  color: var(--ck-coral-deep);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ---------- 过渡 ---------- */
.ck-auth-enter-active,
.ck-auth-leave-active { transition: opacity 0.18s ease; }
.ck-auth-enter-active .ck-auth,
.ck-auth-leave-active .ck-auth { transition: transform 0.18s ease; }
.ck-auth-enter-from,
.ck-auth-leave-to { opacity: 0; }
.ck-auth-enter-from .ck-auth,
.ck-auth-leave-to .ck-auth { transform: translateY(10px) scale(0.98); }

/* ---------- 移动端：贴底，像原生弹层 ---------- */
@media (max-width: 520px) {
  .ck-auth__overlay { align-items: flex-end; padding: 0; }
  .ck-auth {
    width: 100%;
    max-height: 92vh;
    border-radius: 1.25rem 1.25rem 0 0;
  }
  .ck-auth__body { padding: 1.75rem 1.25rem 2rem; }
}
</style>
