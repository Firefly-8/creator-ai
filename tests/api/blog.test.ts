/**
 * Blog API — 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

function createMockD1(countResult: any, postsResult: any) {
  const mock = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue(postsResult),
    first: vi.fn().mockResolvedValue(countResult),
  }
  return mock as unknown as D1Database
}

describe('GET /api/blog', () => {
  let handler: any

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubGlobal('DB', null) // reset
    const mod = await import('../../server/api/blog/index.get.ts')
    handler = mod.default
  })

  afterEach(() => { vi.restoreAllMocks() })

  async function fetchBlog(query: Record<string, string> = {}) {
    const url = new URL('http://localhost/api/blog')
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v))
    const event = { path: url.pathname + url.search } as any
    try {
      return await handler(event)
    } catch (e: any) {
      return { __error: e }
    }
  }

  it('默认参数 page=1, limit=10', async () => {
    const mockDb = createMockD1({ total: 0 }, { results: [] })
    vi.stubGlobal('DB', mockDb)
    const result = await fetchBlog()
    expect(result.__error).toBeUndefined()
    expect(result.pagination).toMatchObject({ page: 1, limit: 10 })
  })

  it('应正确计算 totalPages', async () => {
    const mockDb = createMockD1({ total: 47 }, { results: [] })
    vi.stubGlobal('DB', mockDb)
    const result = await fetchBlog({ limit: '10' })
    expect(result.__error).toBeUndefined()
    expect(result.pagination.total).toBe(47)
    expect(result.pagination.totalPages).toBe(5) // ceil(47/10) = 5
  })

  it('limit 上限 50', async () => {
    const mockDb = createMockD1({ total: 0 }, { results: [] })
    vi.stubGlobal('DB', mockDb)
    const result = await fetchBlog({ limit: '200' })
    expect(result.pagination.limit).toBeLessThanOrEqual(50)
  })

  it('page 下限为 1', async () => {
    const mockDb = createMockD1({ total: 0 }, { results: [] })
    vi.stubGlobal('DB', mockDb)
    const result = await fetchBlog({ page: '-1' })
    expect(result.pagination.page).toBeGreaterThanOrEqual(1)
  })

  it('无 DB 时返回 503', async () => {
    vi.stubGlobal('DB', undefined)
    const result = await fetchBlog()
    expect(result.__error).toBeDefined()
    expect(result.__error.statusCode).toBe(503)
  })

  it('返回文章列表字段映射正确', async () => {
    const mockPosts = [{
      id: '1', slug: 'test-post', title: 'Test', excerpt: 'Test excerpt',
      cover_image: '/img.jpg', tags: '["tag1"]', author_name: 'Author',
      reading_minutes: 5, published_at: '2026-08-01', created_at: '2026-08-01',
    }]
    const mockDb = createMockD1({ total: 1 }, { results: mockPosts })
    vi.stubGlobal('DB', mockDb)
    const result = await fetchBlog({ limit: '1' })
    expect(result.posts[0]).toMatchObject({
      id: '1', slug: 'test-post', title: 'Test',
      coverImage: '/img.jpg', tags: ['tag1'],
      authorName: 'Author', readingMinutes: 5,
    })
  })
})
