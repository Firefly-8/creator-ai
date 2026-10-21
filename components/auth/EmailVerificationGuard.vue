<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showGuard" class="email-guard">
        <div class="email-guard__backdrop" />
        <div class="email-guard__card">
          <!-- Icon -->
          <div class="email-guard__icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>

          <h2 class="email-guard__title">{{ $t('auth.verifyTitle', 'Verify your email') }}</h2>
          
          <p class="email-guard__desc">
            {{ $t('auth.verifyDesc', 'We sent a verification email to') }} 
            <strong>{{ user?.email }}</strong> 
            {{ $t('auth.verifyDesc2', 'Please check your inbox and click the verification link to complete registration.') }}
          </p>

          <div class="email-guard__actions">
            <button
              class="email-guard__btn email-guard__btn--primary"
              :disabled="cooldown > 0 || sending"
              @click="handleResend"
            >
              <span v-if="sending">{{ $t('auth.sending', 'Sending...') }}</span>
              <span v-else-if="cooldown > 0">{{ $t('auth.resendIn', 'Resend') }} ({{ cooldown }}s)</span>
              <span v-else>{{ $t('auth.resendEmail', 'Resend verification email') }}</span>
            </button>

            <button
              class="email-guard__btn email-guard__btn--secondary"
              :disabled="checking"
              @click="handleCheck"
            >
              <span v-if="checking">{{ $t('auth.checking', 'Checking...') }}</span>
              <span v-else>{{ $t('auth.verified', 'I have verified, refresh status') }}</span>
            </button>
          </div>

          <button class="email-guard__logout" @click="handleLogout">
            {{ $t('auth.logout', 'Sign out') }}
          </button>

          <p v-if="message" class="email-guard__message" :class="{ 'is-error': isError }">
            {{ message }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">

// ⚠️ 用 useT() 而不是 useI18n()：auto-import 的 useI18n 解析到 vue-i18n
// 原始实现，客户端拿到的 t 不是函数，组件一渲染就抛 "n.t is not a function" → 整页 500
const { t: $t } = useT()
const { user, verifying, refreshVerificationStatus, resendVerificationEmail, logout } = useAuth()

const cooldown = ref(0)
const sending = ref(false)
const checking = ref(false)
const message = ref('')
const isError = ref(false)

// 只有"通过邮箱登录且未验证"时才显示守卫
const showGuard = computed(() => verifying.value)

// 冷却计时器
let timer: ReturnType<typeof setInterval> | null = null

function startCooldown() {
  cooldown.value = 60
  timer = setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

async function handleResend() {
  if (cooldown.value > 0 || sending.value) return
  sending.value = true
  message.value = ''
  isError.value = false
  
  const result = await resendVerificationEmail()
  
  if (result.success) {
    message.value = $t?.('auth.verifySent', 'Verification email sent, please check your inbox') || 'Verification email sent, please check your inbox'
    isError.value = false
    startCooldown()
  } else {
    message.value = result.message || 'Failed to send'
    isError.value = true
  }
  
  sending.value = false
}

async function handleCheck() {
  checking.value = true
  message.value = ''
  isError.value = false
  
  await refreshVerificationStatus()
  
  checking.value = false
}

async function handleLogout() {
  await logout()
  navigateTo('/')
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
/* ------------------------------------------------------------------
   邮箱验证守卫 —— 与 AuthModal 同一套浅色暖调
   ⚠️ 原来用的是深色紫（--surface/#14121c、--accent/#8b7cff），
      和新弹窗放在一起会明显是两套设计。两个弹层会先后出现，必须统一。
   ------------------------------------------------------------------ */
.email-guard {
  --ck-bg: #fffdfa;
  --ck-cream: #f5ede1;
  --ck-ink: #2a2420;
  --ck-ink-2: #6b5f55;
  --ck-line: rgba(58, 46, 38, 0.16);
  --ck-coral: #c8543d;
  --ck-coral-deep: #a53f2c;
  --ck-serif: 'Playfair Display', Georgia, serif;

  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.email-guard__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(36, 31, 27, 0.45);
  backdrop-filter: blur(6px);
}

.email-guard__card {
  position: relative;
  width: min(26rem, 100%);
  padding: 2.5rem 2rem 2rem;
  border-radius: 1.25rem;
  background: var(--ck-bg);
  box-shadow: 0 40px 80px -30px rgba(36, 31, 27, 0.55);
  text-align: center;
}

.email-guard__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 4.5rem;
  height: 4.5rem;
  margin-bottom: 1.25rem;
  border-radius: 50%;
  background: rgba(200, 84, 61, 0.12);
  color: var(--ck-coral);
  font-size: 2rem;
}

.email-guard__title {
  font-family: var(--ck-serif);
  font-size: 1.6rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--ck-ink);
  margin-bottom: 0.7rem;
}

.email-guard__desc {
  font-size: 0.9375rem;
  color: var(--ck-ink-2);
  line-height: 1.6;
  margin-bottom: 1.75rem;
}

.email-guard__desc strong {
  color: var(--ck-ink);
  word-break: break-all;
}

.email-guard__actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1.25rem;
}

.email-guard__btn {
  width: 100%;
  height: 3rem;
  border: 1.5px solid transparent;
  border-radius: 0.7rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease;
}

.email-guard__btn--primary {
  background: var(--ck-coral);
  color: #fff;
}
.email-guard__btn--primary:hover { background: var(--ck-coral-deep); }

.email-guard__btn--secondary {
  border-color: var(--ck-line);
  background: transparent;
  color: var(--ck-ink);
}
.email-guard__btn--secondary:hover { border-color: var(--ck-coral); color: var(--ck-coral-deep); }

.email-guard__logout {
  border: none;
  background: none;
  padding: 0.25rem;
  font-size: 0.875rem;
  color: #a08f81;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.email-guard__logout:hover { color: var(--ck-coral-deep); }

.email-guard__message {
  margin-top: 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ck-ink-2);
}
.email-guard__message.is-error { color: var(--ck-coral-deep); }

@media (max-width: 520px) {
  .email-guard { padding: 0; align-items: flex-end; }
  .email-guard__card {
    width: 100%;
    border-radius: 1.25rem 1.25rem 0 0;
    padding: 2rem 1.25rem 2.25rem;
  }
}
</style>
