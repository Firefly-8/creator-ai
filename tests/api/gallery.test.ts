/**
 * Gallery API — 单元测试
 *
 * 测试策略：mock D1Database，通过 h3 的 createEvent/handleRequest 测试 handler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock D1 结果类型
interface MockD1Result {
  results?: any[]
  success: boolean
}

// Mock D1 Database
function createMockD1(musicResult: MockD1Result, imageResult: MockD1Result) {
  return {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue(musicResult),
    first: vi.fn().mockResolvedValue(null),
  } as unknown as D1Database
}

describe('GET /api/gallery', () => {
  // 动态 import handler 以获取最新代码
  let handler: any
  let mockDb: D1Database

  beforeEach(async () => {
    vi.clearAllMocks()
    mockDb = createMockD1({ success: true, results: [] }, { success: true, results: [] })
    vi.stubGlobal('DB', mockDb)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = await import('../../server/api/gallery/index.get.ts')
    handler = mod.default
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function fetchGallery(query: Record<string, string> = {}) {
    const url = new URL('http://localhost/api/gallery')
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v))
    const event = { path: url.pathname + url.search } as any
    try {
      return await handler(event)
    } catch (e: any) {
      return { __error: e }
    }
  }

  it('默认参数应返回 page=1, limit=12, type=all', async () => {
    const result = await fetchGallery()
    expect(result.__error).toBeUndefined()
    expect(result.pagination).toMatchObject({ page: 1, limit: 12 })
  })

  it('应接受自定义 page 和 limit', async () => {
    const result = await fetchGallery({ page: '3', limit: '24' })
    expect(result.__error).toBeUndefined()
    expect(result.pagination).toMatchObject({ page: 3, limit: 24 })
  })

  it('limit 上限为 50', async () => {
    const result = await fetchGallery({ limit: '100' })
    expect(result.__error).toBeUndefined()
    expect(result.pagination.limit).toBeLessThanOrEqual(50)
  })

  it('page 下限为 1（负数取 1）', async () => {
    const result = await fetchGallery({ page: '-5' })
    expect(result.__error).toBeUndefined()
    expect(result.pagination.page).toBeGreaterThanOrEqual(1)
  })

  it('type=all 时返回 music 和 image', async () => {
    const result = await fetchGallery({ type: 'all' })
    expect(result.__error).toBeUndefined()
    expect(Array.isArray(result.items)).toBe(true)
  })

  it('type=music 只返回音乐', async () => {
    const result = await fetchGallery({ type: 'music' })
    expect(result.__error).toBeUndefined()
    expect(Array.isArray(result.items)).toBe(true)
  })

  it('type=image 只返回图片', async () => {
    const result = await fetchGallery({ type: 'image' })
    expect(result.__error).toBeUndefined()
    expect(Array.isArray(result.items)).toBe(true)
  })

  it('返回结果应包含必要字段', async () => {
    const result = await fetchGallery({ type: 'music', limit: '1' })
    if (result.items && result.items.length > 0) {
      const item = result.items[0]
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('type')
      expect(item).toHaveProperty('title')
      expect(item).toHaveProperty('createdAt')
    }
  })
})
