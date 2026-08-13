import { watch } from 'vue'

export default defineNuxtRouteMiddleware((to, _from) => {
  const protectedPaths = ['/create', '/image', '/cover', '/library', '/dashboard']
  const isProtected = protectedPaths.some(p => to.path.startsWith(p))
  if (!isProtected) return

  // On server side, skip (will be handled client-side)
  if (import.meta.server) return

  const { user, loading } = useAuth()

  // If still loading auth state, wait briefly
  if (loading.value) {
    return new Promise((resolve) => {
      const unwatch = watch(loading, (val) => {
        if (!val) {
          unwatch()
          if (!user.value) {
            const { openLogin } = useAuthModal()
            openLogin()
            resolve(false)
          } else {
            resolve(true)
          }
        }
      })
      // Timeout fallback - if auth takes too long, still open modal
      setTimeout(() => {
        unwatch()
        if (!user.value) {
          const { openLogin } = useAuthModal()
          openLogin()
          resolve(false)
        } else {
          resolve(true)
        }
      }, 3000)
    })
  }

  if (!user.value) {
    const { openLogin } = useAuthModal()
    openLogin()
    return false
  }
})
