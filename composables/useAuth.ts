import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'

export function useAuth() {
  const nuxtApp = useNuxtApp()
  const user = ref<User | null>(null)
  const loading = ref(true)

  // Only set up auth listener on client side
  if (import.meta.client) {
    const auth = nuxtApp.$auth
    if (auth) {
      onAuthStateChanged(auth, (u) => {
        user.value = u
        loading.value = false
      })
    } else {
      loading.value = false
    }
  } else {
    loading.value = false
  }

  // 邮箱注册
  async function signUpWithEmail(email: string, password: string) {
    const auth = nuxtApp.$auth
    if (!auth) throw new Error('Firebase auth not initialized')
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    return credential.user
  }

  // 邮箱登录
  async function signInWithEmail(email: string, password: string) {
    const auth = nuxtApp.$auth
    if (!auth) throw new Error('Firebase auth not initialized')
    const credential = await signInWithEmailAndPassword(auth, email, password)
    return credential.user
  }

  // Google 登录
  async function signInWithGoogle() {
    const auth = nuxtApp.$auth
    if (!auth) throw new Error('Firebase auth not initialized')
    const provider = new GoogleAuthProvider()
    const credential = await signInWithPopup(auth, provider)
    return credential.user
  }

  // 登出
  async function logout() {
    const auth = nuxtApp.$auth
    if (!auth) return
    await signOut(auth)
  }

  // 获取 ID Token（供服务端验证）
  async function getIdToken() {
    return user.value?.getIdToken()
  }

  return {
    user,
    loading,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    logout,
    getIdToken,
  }
}
