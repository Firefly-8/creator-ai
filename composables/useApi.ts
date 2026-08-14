/**
 * API 客户端 — 自动附加 Firebase Token
 * 所有 API 请求通过此 composable 发送
 * 
 * 使用示例:
 * const { get, post, del } = useApi()
 * const data = await get('/api/auth/me')
 * await post('/api/music/generate', { prompt: '...' })
 */

export function useApi() {
  const nuxtApp = useNuxtApp()

  async function getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    try {
      const auth = nuxtApp.$auth
      if (auth?.currentUser) {
        const token = await auth.currentUser.getIdToken()
        if (token) headers['Authorization'] = `Bearer ${token}`
      }
    } catch { /* ignore */ }
    return headers
  }

  async function get<T = any>(url: string): Promise<T> {
    return $fetch<T>(url, { headers: await getHeaders() })
  }

  async function post<T = any>(url: string, body?: any): Promise<T> {
    return $fetch<T>(url, { method: 'POST', body, headers: await getHeaders() })
  }

  async function del<T = any>(url: string): Promise<T> {
    return $fetch<T>(url, { method: 'DELETE', headers: await getHeaders() })
  }

  async function upload<T = any>(url: string, formData: FormData): Promise<T> {
    const headers = await getHeaders()
    delete headers['Content-Type'] // 让浏览器自动设置 multipart boundary
    return $fetch<T>(url, { method: 'POST', body: formData, headers })
  }

  return { get, post, del, upload, getHeaders }
}
