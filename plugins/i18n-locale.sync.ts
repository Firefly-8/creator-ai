/**
 * i18n 语言同步插件
 * 确保 SSR 和 CSR 之间语言设置一致
 * 从 cookie 读取用户选择的语言，覆盖浏览器默认检测
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  // 通过 nuxtApp.$i18n 访问，避免 useI18n() 在插件中报错
  const i18n = nuxtApp.$i18n as any
  if (!i18n) return

  const locale = i18n.locale || i18n.global?.locale
  const setLocale = i18n.setLocale || i18n.global?.setLocale

  // 从 cookie 读取用户之前选择的语言
  const savedLocale = useCookie('craftai_locale')

  if (savedLocale.value && setLocale && savedLocale.value !== locale?.value) {
    await setLocale(savedLocale.value as string)
  }
})
