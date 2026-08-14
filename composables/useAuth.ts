/**
 * Firebase 认证 + 用户同步 + 邮箱验证状态
 */
import { ref, computed } from 'vue'

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'

// 追踪注册来源：用于判断是否需要邮箱验证
// sessionStorage 在页面刷新后仍然保留，关闭标签页后清除
const REGISTRATION_KEY = 'creator_pending_verification'

function markPendingVerification() {
  if (import.meta.client) sessionStorage.setItem(REGISTRATION_KEY, '1')
}

function clearPendingVerification() {
  if (import.meta.client) sessionStorage.removeItem(REGISTRATION_KEY)
}

export function useAuth() {
  const nuxtApp = useNuxtApp()
  const user = ref<User | null>(null)
  const loading = ref(false)
  const authReady = ref(false)
  const emailVerified = ref(false)
  const justRegistered = ref(false) // 刚注册完（等待验证）

  // 是否需要显示邮箱验证守卫：
  // 1. 用户通过邮箱密码注册/登录
  // 2. 邮箱尚未验证
  const verifying = computed(() => {
    if (!user.value) return false
    if (emailVerified.value) return false
    return justRegistered.value || !!user.value.providerData?.some(p => p.providerId === 'password')
  })

  // 同步用户到 D1
  async function syncUser(firebaseUser: User) {
    try {
      const token = await firebaseUser.getIdToken()
      await $fetch('/api/auth/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (err) {
      console.error('[Auth] Sync failed:', err)
    }
  }

  // 刷新邮箱验证状态
  async function refreshVerificationStatus() {
    const auth = nuxtApp.$auth
    if (!auth?.currentUser) return
    await auth.currentUser.reload()
    emailVerified.value = auth.currentUser.emailVerified || false
    user.value = auth.currentUser
    if (auth.currentUser.emailVerified) {
      clearPendingVerification()
      justRegistered.value = false
    }
  }

  // 重新发送验证邮件
  async function resendVerificationEmail() {
    const auth = nuxtApp.$auth
    if (!auth?.currentUser) return { success: false, message: 'No user' }
    if (auth.currentUser.emailVerified) return { success: false, message: 'Already verified' }
    
    try {
      await sendEmailVerification(auth.currentUser)
      return { success: true, message: 'Verification email sent' }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to send' }
    }
  }

  if (import.meta.client) {
    const auth = nuxtApp.$auth
    if (auth) {
      onAuthStateChanged(auth, (u) => {
        user.value = u
        emailVerified.value = u?.emailVerified || false

        // 如果邮箱已验证，清除标记
        if (u?.emailVerified) {
          clearPendingVerification()
          justRegistered.value = false
        } else if (import.meta.client && sessionStorage.getItem(REGISTRATION_KEY)) {
          // 页面刷新后，如果 sessionStorage 中有标记，恢复 justRegistered 状态
          justRegistered.value = true
        }

        authReady.value = true
        if (u) syncUser(u)
      })
    } else {
      authReady.value = true
    }
  }

  // 邮箱注册
  async function signUpWithEmail(email: string, password: string) {
    const auth = nuxtApp.$auth
    if (!auth) throw new Error('Firebase auth not initialized')
    loading.value = true
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      // 发送验证邮件
      if (credential.user) {
        await sendEmailVerification(credential.user)
        markPendingVerification()
        justRegistered.value = true
      }
      await syncUser(credential.user)
      return credential.user
    } finally {
      loading.value = false
    }
  }

  // 邮箱登录
  async function signInWithEmail(email: string, password: string) {
    const auth = nuxtApp.$auth
    if (!auth) throw new Error('Firebase auth not initialized')
    loading.value = true
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      await syncUser(credential.user)
      return credential.user
    } finally {
      loading.value = false
    }
  }

  // Google 登录
  async function signInWithGoogle() {
    const auth = nuxtApp.$auth
    if (!auth) throw new Error('Firebase auth not initialized')
    loading.value = true
    try {
      const provider = new GoogleAuthProvider()
      const credential = await signInWithPopup(auth, provider)
      await syncUser(credential.user)
      return credential.user
    } finally {
      loading.value = false
    }
  }

  // 登出
  async function logout() {
    const auth = nuxtApp.$auth
    if (!auth) return
    await signOut(auth)
    clearPendingVerification()
    justRegistered.value = false
    emailVerified.value = false
  }

  // 获取 ID Token
  async function getIdToken(): Promise<string | null> {
    return user.value?.getIdToken() || null
  }

  return {
    user,
    loading,
    authReady,
    emailVerified,
    verifying,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    logout,
    getIdToken,
    refreshVerificationStatus,
    resendVerificationEmail,
  }
}
