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

          <h2 class="email-guard__title">{{ $t('auth.verifyTitle', '验证您的邮箱') }}</h2>
          
          <p class="email-guard__desc">
            {{ $t('auth.verifyDesc', '我们已向') }} 
            <strong>{{ user?.email }}</strong> 
            {{ $t('auth.verifyDesc2', '发送了验证邮件。请查收并点击验证链接完成注册。') }}
          </p>

          <div class="email-guard__actions">
            <button
              class="email-guard__btn email-guard__btn--primary"
              :disabled="cooldown > 0 || sending"
              @click="handleResend"
            >
              <span v-if="sending">{{ $t('auth.sending', '发送中...') }}</span>
              <span v-else-if="cooldown > 0">{{ $t('auth.resendIn', '重新发送') }} ({{ cooldown }}s)</span>
              <span v-else>{{ $t('auth.resendEmail', '重新发送验证邮件') }}</span>
            </button>

            <button
              class="email-guard__btn email-guard__btn--secondary"
              :disabled="checking"
              @click="handleCheck"
            >
              <span v-if="checking">{{ $t('auth.checking', '检查中...') }}</span>
              <span v-else>{{ $t('auth.verified', '我已验证，刷新状态') }}</span>
            </button>
          </div>

          <button class="email-guard__logout" @click="handleLogout">
            {{ $t('auth.logout', '退出登录') }}
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
    message.value = $t?.('auth.verifySent', '验证邮件已发送，请查收') || '验证邮件已发送，请查收'
    isError.value = false
    startCooldown()
  } else {
    message.value = result.message || '发送失败'
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
.email-guard {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.email-guard__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(10, 9, 16, 0.95);
  backdrop-filter: blur(8px);
}

.email-guard__card {
  position: relative;
  width: 90%;
  max-width: 420px;
  padding: 2.5rem 2rem;
  background: var(--surface, #14121c);
  border: 1px solid var(--border-strong, rgba(255,255,255,0.12));
  border-radius: var(--radius-lg, 1.35rem);
  text-align: center;
}

.email-guard__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 5rem;
  height: 5rem;
  margin-bottom: 1.5rem;
  border-radius: 50%;
  background: rgba(139, 124, 255, 0.1);
  color: var(--accent, #8b7cff);
}

.email-guard__title {
  font-family: 'Sora', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ink, #f3f1fb);
  margin-bottom: 0.75rem;
}

.email-guard__desc {
  font-size: 0.9rem;
  color: var(--muted, #a39db8);
  line-height: 1.6;
  margin-bottom: 2rem;
}

.email-guard__desc strong {
  color: var(--ink, #f3f1fb);
  word-break: break-all;
}

.email-guard__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.email-guard__btn {
  width: 100%;
  height: 2.75rem;
  border: none;
  border-radius: var(--radius-pill, 999px);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.email-guard__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.email-guard__btn--primary {
  background: var(--accent, #8b7cff);
  color: #fff;
}

.email-guard__btn--primary:hover:not(:disabled) {
  background: var(--accent-deep, #6e5ce6);
  box-shadow: var(--shadow-accent, 0 10px 28px -12px rgba(110,92,230,0.7));
}

.email-guard__btn--secondary {
  background: var(--fill-soft, rgba(255,255,255,0.06));
  color: var(--ink, #f3f1fb);
  border: 1px solid var(--border-strong, rgba(255,255,255,0.12));
}

.email-guard__btn--secondary:hover:not(:disabled) {
  background: var(--fill-hover, rgba(255,255,255,0.1));
}

.email-guard__logout {
  background: none;
  border: none;
  color: var(--muted, #a39db8);
  font-size: 0.85rem;
  cursor: pointer;
  transition: color 0.2s;
}

.email-guard__logout:hover {
  color: var(--ink, #f3f1fb);
}

.email-guard__message {
  margin-top: 1rem;
  font-size: 0.85rem;
  color: var(--accent-soft, #b4a9ff);
}

.email-guard__message.is-error {
  color: var(--danger, #f07178);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
