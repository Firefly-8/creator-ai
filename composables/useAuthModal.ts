import { ref } from 'vue'

const isOpen = ref(false)
const initialMode = ref<'login' | 'signup'>('login')

export function useAuthModal() {
  function openLogin() {
    initialMode.value = 'login'
    isOpen.value = true
  }

  function openSignup() {
    initialMode.value = 'signup'
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  return {
    isOpen,
    initialMode,
    openLogin,
    openSignup,
    close,
  }
}
