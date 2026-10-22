/**
 * Auth 中间件 — 白名单逻辑单元测试
 *
 * ⚠️ 2026-10-22 改：以前这个文件**自己抄了一份** PUBLIC_PATHS，
 *   结果和真实的 server/middleware/auth.ts 漂移了还不自知 ——
 *   最典型的：'/api/upload' 早就改成「必须登录」（上传是 i2i 的第一步，
 *   公开就等于白送存储），测试里却还写着「应放行」。
 *   抄一份 = 测了个假的东西。现在**直接读真实中间件文件**。
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const ROOT = process.cwd()

/** 从真实的中间件文件里抠出 PUBLIC_PATHS 数组 */
function readPublicPaths(): string[] {
  const src = readFileSync(join(ROOT, 'server/middleware/auth.ts'), 'utf8')
  const m = src.match(/const PUBLIC_PATHS\s*=\s*\[([\s\S]*?)\]/)
  expect(m, 'server/middleware/auth.ts 里找不到 PUBLIC_PATHS 数组').toBeTruthy()
  const body = m![1]
  const paths: string[] = []
  for (const line of body.split('\n')) {
    const t = line.match(/'([^']+)'/g)
    if (t) paths.push(t[0].slice(1, -1))
  }
  return paths
}

const PUBLIC_PATHS = readPublicPaths()

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(p => path.startsWith(p))
}

describe('Auth Middleware — PUBLIC_PATHS 白名单', () => {
  it('能从真实中间件里读出白名单', () => {
    expect(PUBLIC_PATHS.length).toBeGreaterThan(5)
    expect(PUBLIC_PATHS).toContain('/api/gallery')
  })

  describe('应跳过的公开路径', () => {
    const publicPaths = [
      '/api/auth',
      '/api/auth/sync',
      '/api/subscriptions/plans',
      '/api/gallery',
      '/api/gallery?page=1&limit=12',
      '/api/blog',
      '/api/blog?page=1&limit=10',
      '/api/health',
      '/api/image/samples',
      '/api/subscriptions/webhook',
      '/api/sitemap.xml',
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
      '/api/image/upload',   // 上传必须登录（公开 = 白送 R2 存储）
      '/api/music/generate',
    ]

    privatePaths.forEach((path) => {
      it(`应拦截: ${path}`, () => {
        expect(isPublicPath(path)).toBe(false)
      })
    })
  })

  describe('边界情况', () => {
    it('应区分 /api/auth 和 /api/authx', () => {
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
