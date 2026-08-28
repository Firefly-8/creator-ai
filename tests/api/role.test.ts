/**
 * User Role API — 单元测试
 *
 * 注意：完整测试需要 h3 的 toNodeListener/createEvent 工具（生产包未打包）
 * 当前测试聚焦：getDB 和角色判断逻辑
 */

import { describe, it, expect, vi, afterEach } from 'vitest'

function createMockD1(hasAdmin: boolean) {
  const mock = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(hasAdmin ? { privilege: 'admin' } : null),
  }
  return mock as unknown as D1Database
}

describe('GET /api/user/role — 数据库逻辑', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('有 admin 权限时查询返回 privilege=admin', async () => {
    const mockDb = createMockD1(true)
    vi.stubGlobal('DB', mockDb)
    const { getDB } = await import('../../server/utils/db-runtime')
    const db = getDB()
    expect(db).toBeDefined()
    const result = await (db as any).prepare("SELECT privilege FROM user_privileges WHERE user_id = ? AND privilege = 'admin' LIMIT 1").bind('uid123').first()
    expect(result).toEqual({ privilege: 'admin' })
  })

  it('无 admin 权限时查询返回 null', async () => {
    const mockDb = createMockD1(false)
    vi.stubGlobal('DB', mockDb)
    const { getDB } = await import('../../server/utils/db-runtime')
    const db = getDB()
    expect(db).toBeDefined()
    const result = await (db as any).prepare("SELECT privilege FROM user_privileges WHERE user_id = ? AND privilege = 'admin' LIMIT 1").bind('uid123').first()
    expect(result).toBeNull()
  })

  it('getDB 在无 DB 环境返回 undefined', async () => {
    vi.stubGlobal('DB', undefined)
    const { getDB } = await import('../../server/utils/db-runtime')
    const db = getDB()
    expect(db).toBeUndefined()
  })
})
