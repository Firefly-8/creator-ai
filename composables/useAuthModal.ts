import { ref } from 'vue'

const isOpen = ref(false)
const initialMode = ref<'login' | 'signup'>('login')
const redirectPath = ref<string | null>(null)

export function useAuthModal() {
  function openLogin() {
    initialMode.value = 'login'
    isOpen.value = true
  }

  function openSignup(path?: string) {
    initialMode.value = 'signup'
    redirectPath.value = path || null
    isOpen.value = true
  }

  /** 注册完成后跳回原页面（之前只有登录有，注册会丢掉 redirect） */
  function openSignupWithRedirect(path?: string) {
    openSignup(path)
  }

  function openLoginWithRedirect(path?: string) {
    initialMode.value = 'login'
    redirectPath.value = path || null
    isOpen.value = true
  }

  function clearRedirect() {
    redirectPath.value = null
  }

  function close() {
    isOpen.value = false
  }

  return {
    isOpen,
    initialMode,
    redirectPath,
    openLogin,
    openSignup,
    openLoginWithRedirect,
    openSignupWithRedirect,
    clearRedirect,
    close,
  }
}
