import { ref } from 'vue'

const isOpen = ref(false)
const initialMode = ref<'login' | 'signup'>('login')
const redirectPath = ref<string | null>(null)
/**
 * 弹窗上的一句上下文说明
 * 例：用户在向导最后一步点「生成」被要求登录 →
 *     「Create an account or sign in. Everything you have entered is kept.」
 * 空字符串 = 不显示（默认行为，别的页面不受影响）
 */
const note = ref('')
/**
 * 登录成功后的回调（一次性）
 * 用在「登录完接着做刚才那件事」的场景：登录 → 继续出图，不用再点一次按钮。
 * ⚠️ 必须用 consumeAfterAuth() 取用 —— 取走即清空，
 *    否则之后别的页面再弹登录框时会误触发上一次的回调。
 */
const afterAuth = ref<null | (() => void | Promise<void>)>(null)

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

  /** 设置弹窗上的上下文说明 */
  function setNote(text: string) {
    note.value = text || ''
  }

  function clearNote() {
    note.value = ''
  }

  /** 设置「登录成功后要做的事」 */
  function setAfterAuth(fn: (() => void | Promise<void>) | null) {
    afterAuth.value = fn
  }

  /** 取走回调并清空 —— 保证只触发一次 */
  function consumeAfterAuth(): (() => void | Promise<void>) | null {
    const fn = afterAuth.value
    afterAuth.value = null
    return fn
  }

  function clearAfterAuth() {
    afterAuth.value = null
  }

  function close() {
    isOpen.value = false
  }

  return {
    isOpen,
    initialMode,
    redirectPath,
    note,
    openLogin,
    openSignup,
    openLoginWithRedirect,
    openSignupWithRedirect,
    clearRedirect,
    setNote,
    clearNote,
    setAfterAuth,
    consumeAfterAuth,
    clearAfterAuth,
    close,
  }
}
