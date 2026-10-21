/**
 * Plausible Analytics + 自定义事件追踪
 * 轻量级、隐私友好、海外用户信任
 */

export function useAnalytics() {
  const config = useRuntimeConfig()
  const plausibleDomain = config.public.plausibleDomain || ''

  /**
   * 追踪自定义事件
   */
  function trackEvent(eventName: string, props?: Record<string, string | number>) {
    if (!plausibleDomain) return
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plausible = (window as any).plausible
      if (typeof plausible === 'function') {
        plausible(eventName, { props })
      }
    } catch {
      // 静默失败
    }
  }

  // ============ 业务事件 ============

  function trackGenerateStart(type: 'music' | 'image' | 'cover') {
    trackEvent('generate_start', { type })
  }

  function trackGenerateSuccess(type: 'music' | 'image' | 'cover', durationMs?: number) {
    trackEvent('generate_success', { type, duration_ms: durationMs || 0 })
  }

  function trackSignup(method: 'email' | 'google') {
    trackEvent('signup', { method })
  }

  function trackSubscription(plan: string) {
    trackEvent('subscribe', { plan })
  }

  function trackDownload(type: 'music' | 'image') {
    trackEvent('download', { type })
  }

  function trackShare(type: 'music' | 'image', platform: string) {
    trackEvent('share', { type, platform })
  }

  function trackFeedback(category: string) {
    trackEvent('feedback', { category })
  }

  return {
    trackEvent,
    trackGenerateStart,
    trackGenerateSuccess,
    trackSignup,
    trackSubscription,
    trackDownload,
    trackShare,
    trackFeedback,
  }
}
