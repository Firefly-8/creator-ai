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
  quotas: {
    free: { music: number; image: number; lyrics: number; cover: number }
    creator: { music: number; image: number; lyrics: number; cover: number }
    pro: { music: number; image: number; lyrics: number; cover: number }
  }
  usage: {
    music: QuotaStatus
    image: QuotaStatus
    lyrics: QuotaStatus
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

  function canGenerate(type: 'music' | 'image' | 'lyrics' | 'cover'): boolean {
    if (!quotaData.value) return true // 未加载时允许，服务端会拦截
    return quotaData.value.usage[type]?.allowed ?? true
  }

  function getRemaining(type: 'music' | 'image' | 'lyrics' | 'cover'): number {
    if (!quotaData.value) return -1
    return quotaData.value.usage[type]?.remaining ?? 0
  }

  function getUsage(type: 'music' | 'image' | 'lyrics' | 'cover'): QuotaStatus | null {
    if (!quotaData.value) return null
    return quotaData.value.usage[type]
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
