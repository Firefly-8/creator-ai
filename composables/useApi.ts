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
        // ⚠️ 不要用 getIdToken(true)：
        //    true = 每次都强制走一次网络刷新。Firebase SDK 本身会在
        //    token 过期/临近过期时自动刷新（getIdToken() 内部管这个），
        //    强制刷新会让**每个 API 请求**都多一次网络往返，
        //    而且刷新本身会触发 onAuthStateChanged → 死循环。
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
