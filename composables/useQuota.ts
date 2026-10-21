/**
 * 客户端额度检查
 * 在生成前检查额度，不足时引导升级
 */

import type { Ref } from 'vue'

interface QuotaStatus {
  allowed: boolean
  remaining: number
  limit: number
  used: number
  plan: string
}

interface QuotaResponse {
  plan: string
  paid: boolean
  credits: number | null
  limits: {
    free: { music: number; image: number; text: number }
    paid: { music: number; image: number; text: number }
  }
  usage: {
    music: QuotaStatus
    image: QuotaStatus
    text: QuotaStatus
    cover: QuotaStatus
  }
}

export function useQuota() {
  const { user } = useAuth()
  const quotaData = ref<QuotaResponse | null>(null)
  const loading = ref(false)

  async function fetchQuota() {
    if (!user.value) return
    loading.value = true
    try {
      const { useApi } = await import('./useApi')
      const { get } = useApi()
      quotaData.value = await get<QuotaResponse>('/api/user/quota')
    } catch (err) {
      console.error('[Quota] Failed to fetch:', err)
    } finally {
      loading.value = false
    }
  }

  function canGenerate(type: 'music' | 'image' | 'text' | 'cover'): boolean {
    if (!quotaData.value) return true // 未加载时允许，服务端会拦截
    const q = quotaData.value.usage[type]
    if (!q) return true
    if (q.remaining === null) return true // 不限
    return q.remaining > 0
  }

  function getRemaining(type: 'music' | 'image' | 'text' | 'cover'): number {
    if (!quotaData.value) return -1
    return quotaData.value.usage[type]?.remaining ?? 0
  }

  function getUsage(type: 'music' | 'image' | 'text' | 'cover'): QuotaStatus | null {
    if (!quotaData.value) return null
    return quotaData.value.usage[type] ?? null
  }

  function refresh() {
    return fetchQuota()
  }

  return {
    quotaData,
    loading,
    fetchQuota,
    canGenerate,
    getRemaining,
    getUsage,
    refresh,
  }
}
