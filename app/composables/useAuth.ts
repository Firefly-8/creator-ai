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
  const { $auth } = useNuxtApp()
  const user = ref<User | null>(null)
  const loading = ref(true)

  // 监听登录状态
  onAuthStateChanged($auth, (u) => {
    user.value = u
    loading.value = false
  })

  // 邮箱注册
  async function signUpWithEmail(email: string, password: string) {
    const credential = await createUserWithEmailAndPassword($auth, email, password)
    return credential.user
  }

  // 邮箱登录
  async function signInWithEmail(email: string, password: string) {
    const credential = await signInWithEmailAndPassword($auth, email, password)
    return credential.user
  }

  // Google 登录
  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider()
    const credential = await signInWithPopup($auth, provider)
    return credential.user
  }

  // 登出
  async function logout() {
    await signOut($auth)
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
