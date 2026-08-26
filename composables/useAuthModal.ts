import { ref } from 'vue'

const isOpen = ref(false)
const initialMode = ref<'login' | 'signup'>('login')
const redirectPath = ref<string | null>(null)

export function useAuthModal() {
  function openLogin() {
    initialMode.value = 'login'
    isOpen.value = true
  }

  function openSignup() {
    initialMode.value = 'signup'
    isOpen.value = true
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
    clearRedirect,
    close,
  }
}
