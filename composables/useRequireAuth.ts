export function useRequireAuth(): () => boolean {
  const { user } = useAuth()
  const { openLogin } = useAuthModal()

  return (): boolean => {
    if (!user.value) {
      openLogin()
      return false
    }
    return true
  }
}
