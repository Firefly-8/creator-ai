/**
 * better-auth API 路由
 * 处理所有认证相关请求
 * 使用 drizzle-orm/d1 适配器
 */

import { defineEventHandler, createError } from 'h3'
import { drizzle } from 'drizzle-orm/d1'

export default defineEventHandler(async (event) => {
  const d1Binding = (globalThis as any).DB || (event.context as any)?.cloudflare?.env?.DB

  if (!d1Binding) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Database binding not available',
    })
  }

  // 创建 drizzle D1 实例
  const db = drizzle(d1Binding)

  const { getAuth } = await import('../../utils/auth')
  const auth = getAuth(db)

  const request = new Request(event.node.req.url || '', {
    method: event.node.req.method,
    headers: event.node.req.headers as HeadersInit,
    body: event.node.req.method !== 'GET' ? event.node.req : undefined,
  })

  const response = await auth.handler(request)

  response.headers.forEach((value, key) => {
    setResponseHeader(event, key, value)
  })

  setResponseStatus(event, response.status)
  return response.body
})
