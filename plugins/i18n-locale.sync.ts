/**
 * i18n 语言同步插件
 * 确保 SSR 和 CSR 之间语言设置一致
 * 从 cookie 读取用户选择的语言，覆盖浏览器默认检测
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  const { locale, setLocale } = useI18n()
  
  // 从 cookie 读取用户之前选择的语言
  const savedLocale = useCookie('craftai_locale')
  
  if (savedLocale.value && savedLocale.value !== locale.value) {
    await setLocale(savedLocale.value as string)
  }
})
