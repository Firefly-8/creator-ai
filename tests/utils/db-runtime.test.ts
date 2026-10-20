/**
 * DB 运行时解析 — 单元测试
 *
 * 覆盖 Cloudflare Pages (Nitro cloudflare-pages preset) 的三条取值路径，
 * 以及历史上踩过的坑：globalThis.__env 少写一个下划线导致永远取不到 DB。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { DB_BINDING_NAME, getDB, resolveDB, requireDB } from '../../server/utils/db-runtime'

function createMockD1() {
  return { prepare: vi.fn() } as unknown as D1Database
}

describe('db-runtime — resolveDB', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as any).DB
    delete (globalThis as any).__env__
    delete (globalThis as any).__env
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as any).DB
    delete (globalThis as any).__env__
    delete (globalThis as any).__env
  })

  it('优先从 event.context._platform.cloudflare.env 取（最可靠路径）', () => {
    const mock = createMockD1()
    const event = {
      context: { _platform: { cloudflare: { env: { DB: mock } } } },
    } as any

    const result = resolveDB(event)
    expect(result.available).toBe(true)
    expect(result.source).toBe('event-context')
    expect(result.db).toBe(mock)
  })

  it('能从 globalThis.__env__ 取到（注意是两个下划线）', () => {
    const mock = createMockD1()
    vi.stubGlobal('__env__', { DB: mock })

    const result = resolveDB()
    expect(result.available).toBe(true)
    expect(result.source).toBe('global-env')
    expect(result.db).toBe(mock)
  })

  it('globalThis.__env（单下划线，历史拼写错误）不应被识别', () => {
    const mock = createMockD1()
    vi.stubGlobal('__env', { DB: mock })

    const result = resolveDB()
    expect(result.available).toBe(false)
    expect(result.source).toBe('none')
  })

  it('回退到已缓存的 globalThis.DB', () => {
    const mock = createMockD1()
    vi.stubGlobal('DB', mock)

    const result = resolveDB()
    expect(result.available).toBe(true)
    expect(result.source).toBe('global-cache')
    expect(result.db).toBe(mock)
  })

  it('什么都不存在时返回 none，getDB 返回 undefined', () => {
    const result = resolveDB()
    expect(result.available).toBe(false)
    expect(result.source).toBe('none')
    expect(result.db).toBeUndefined()
    expect(getDB()).toBeUndefined()
  })

  it('命中 event context 后会写入 globalThis.DB 缓存', () => {
    const mock = createMockD1()
    const event = {
      context: { _platform: { cloudflare: { env: { DB: mock } } } },
    } as any

    resolveDB(event)
    expect((globalThis as any).DB).toBe(mock)
  })
})

describe('db-runtime — requireDB', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as any).DB
    delete (globalThis as any).__env__
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as any).DB
    delete (globalThis as any).__env__
  })

  it('取不到时抛出带排查指引的错误', () => {
    expect(() => requireDB()).toThrowError(/D1 database not available/)
    expect(() => requireDB()).toThrowError(new RegExp(DB_BINDING_NAME))
  })

  it('取到时返回实例', () => {
    const mock = createMockD1()
    vi.stubGlobal('DB', mock)
    expect(requireDB()).toBe(mock)
  })
})
