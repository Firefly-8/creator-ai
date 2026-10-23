/**
 * 需要登录时的统一处理
 *
 * 用法：const requireAuth = useRequireAuth({ note, afterAuth })
 *       if (!requireAuth()) return
 *
 * ⚠️ 为什么要 note / afterAuth：
 *    - note：告诉用户"为什么要登录"，别让他以为是随便拦的
 *    - afterAuth：登录成功后**接着做刚才那件事**（出图），
 *      不用让用户回去再点一次按钮 —— 那是漏斗上最容易掉人的地方
 */
export function useRequireAuth(options?: {
  /** 弹窗上的一句上下文说明 */
  note?: string
  /** 登录成功后接着做的事 */
  afterAuth?: () => void | Promise<void>
}): () => boolean {
  const { user } = useAuth()
  const { openLogin, setNote, setAfterAuth } = useAuthModal()

  return (): boolean => {
    if (!user.value) {
      if (options?.note) setNote(options.note)
      if (options?.afterAuth) setAfterAuth(options.afterAuth)
      openLogin()
      return false
    }
    return true
  }
}
