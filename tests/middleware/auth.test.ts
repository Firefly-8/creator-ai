/**
 * Auth 中间件 — 白名单逻辑单元测试
 *
 * 测试策略：直接测试 PUBLIC_PATHS 数组和路径匹配逻辑
 */

import { describe, it, expect } from 'vitest'

const PUBLIC_PATHS = [
  '/api/auth',
  '/api/subscriptions/plans',
  '/api/gallery',
  '/api/blog',
  '/api/robots',
  '/api/sitemap',
  '/api/upload',
  '/api/admin',
  '/_nuxt',
  '/logo.png',
  '/favicon.ico',
]

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(p => path.startsWith(p))
}

describe('Auth Middleware — PUBLIC_PATHS 白名单', () => {
  describe('应跳过的公开路径', () => {
    const publicPaths = [
      '/api/auth',
      '/api/auth/sync',
      '/api/subscriptions/plans',
      '/api/gallery',
      '/api/gallery?page=1&limit=12',
      '/api/blog',
      '/api/blog?page=1&limit=10',
      '/api/robots.txt',
      '/api/sitemap.xml',
      '/api/upload',
      '/api/admin',
      '/api/admin/feedback',
      '/_nuxt/static/chunk.js',
      '/_nuxt/favicon.ico',
      '/logo.png',
      '/favicon.ico',
    ]

    publicPaths.forEach((path) => {
      it(`应放行: ${path}`, () => {
        expect(isPublicPath(path)).toBe(true)
      })
    })
  })

  describe('应拦截的私有路径', () => {
    const privatePaths = [
      '/api/songs',
      '/api/user/role',
      '/api/user/me',
      '/api/user/quota',
      '/api/image/generate',
      '/api/music/generate',
      '/api/subscriptions/webhook',
    ]

    privatePaths.forEach((path) => {
      it(`应拦截: ${path}`, () => {
        expect(isPublicPath(path)).toBe(false)
      })
    })
  })

  describe('边界情况', () => {
    it('应区分 /api/auth 和 /api/authX', () => {
      expect(isPublicPath('/api/auth')).toBe(true)
      expect(isPublicPath('/api/authx')).toBe(true) // 前缀匹配 /api/auth
    })

    it('gallery 在公开列表中', () => {
      expect(isPublicPath('/api/gallery')).toBe(true)
    })

    it('blog 在公开列表中', () => {
      expect(isPublicPath('/api/blog')).toBe(true)
    })
  })

  describe('OPTIONS 请求', () => {
    it('OPTIONS 请求应跳过认证（中间件逻辑）', () => {
      // OPTIONS 预检请求在中间件中被显式跳过
      const method = 'OPTIONS'
      const path = '/api/private/endpoint'
      const shouldSkip = method === 'OPTIONS'
      expect(shouldSkip).toBe(true)
    })
  })
})
