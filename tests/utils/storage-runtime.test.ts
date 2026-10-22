/**
 * R2 运行时解析 — 单元测试
 *
 * 覆盖 Cloudflare Pages (Nitro cloudflare-pages preset) 的取值路径，
 * 以及 2026-10-22 修掉的那个坑：
 * 老代码只读 `globalThis.STORAGE`，而 Nitro 从不往这个键上写东西
 * → 出图接口 500 "R2 binding not available"，但绑定其实一直都在。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  R2_BINDING_NAME,
  getR2,
  requireR2,
  resolveR2,
} from '../../server/utils/storage-runtime'

function createMockBucket() {
  return {
    get: vi.fn(),
    put: vi.fn(),
    head: vi.fn(),
    delete: vi.fn(),
  } as unknown as R2Bucket
}

function clearGlobals() {
  vi.unstubAllGlobals()
  delete (globalThis as any).STORAGE
  delete (globalThis as any).__R2_BUCKET__
  delete (globalThis as any).__env__
  delete (globalThis as any).__env
}

describe('storage-runtime — resolveR2', () => {
  beforeEach(clearGlobals)
  afterEach(clearGlobals)

  it('优先从 event.context._platform.cloudflare.env 取（最可靠路径）', () => {
    const mock = createMockBucket()
    const event = {
      context: { _platform: { cloudflare: { env: { STORAGE: mock } } } },
    } as any

    const result = resolveR2(event)
    expect(result.available).toBe(true)
    expect(result.source).toBe('event-context')
    expect(result.bucket).toBe(mock)
  })

  it('也能从 event.context.cloudflare.env 取（nitro 把 _platform 摊平到 context）', () => {
    const mock = createMockBucket()
    const event = {
      context: { cloudflare: { env: { STORAGE: mock } } },
    } as any

    const result = resolveR2(event)
    expect(result.available).toBe(true)
    expect(result.source).toBe('event-context')
    expect(result.bucket).toBe(mock)
  })

  it('能从 globalThis.__env__ 取到（Nitro 在 CF Pages 每次 fetch 入口赋值）', () => {
    const mock = createMockBucket()
    vi.stubGlobal('__env__', { STORAGE: mock })

    const result = resolveR2()
    expect(result.available).toBe(true)
    expect(result.source).toBe('global-env')
    expect(result.bucket).toBe(mock)
  })

  it('globalThis.__env（单下划线，历史拼写错误）不应被识别', () => {
    const mock = createMockBucket()
    vi.stubGlobal('__env', { STORAGE: mock })

    const result = resolveR2()
    expect(result.available).toBe(false)
    expect(result.source).toBe('none')
  })

  it('回退到已缓存的 globalThis.STORAGE', () => {
    const mock = createMockBucket()
    vi.stubGlobal('STORAGE', mock)

    const result = resolveR2()
    expect(result.available).toBe(true)
    expect(result.source).toBe('global-cache')
    expect(result.bucket).toBe(mock)
  })

  it('什么都不存在时返回 none，getR2 返回 undefined', () => {
    const result = resolveR2()
    expect(result.available).toBe(false)
    expect(result.source).toBe('none')
    expect(result.bucket).toBeUndefined()
    expect(getR2()).toBeUndefined()
  })

  it('命中 event context 后会写入 globalThis.STORAGE 缓存', () => {
    const mock = createMockBucket()
    const event = {
      context: { _platform: { cloudflare: { env: { STORAGE: mock } } } },
    } as any

    resolveR2(event)
    expect((globalThis as any).STORAGE).toBe(mock)
  })

  it('env 里没有 STORAGE 键时不误判成可用', () => {
    const event = {
      context: { _platform: { cloudflare: { env: { DB: {} } } } },
    } as any

    const result = resolveR2(event)
    expect(result.available).toBe(false)
    expect(result.source).toBe('none')
  })
})

describe('storage-runtime — requireR2', () => {
  beforeEach(clearGlobals)
  afterEach(clearGlobals)

  it('取不到时抛出带排查指引的错误', () => {
    expect(() => requireR2()).toThrowError(/R2 binding not available/)
    expect(() => requireR2()).toThrowError(new RegExp(R2_BINDING_NAME))
  })

  it('取到时返回实例', () => {
    const mock = createMockBucket()
    vi.stubGlobal('STORAGE', mock)
    expect(requireR2()).toBe(mock)
  })
})

describe('storage-runtime — 回归守卫', () => {
  it('server/utils/storage.ts 不得直读 globalThis.STORAGE（这正是 500 的根因）', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'server/utils/storage.ts'),
      'utf-8'
    )
    expect(src).not.toMatch(/globalThis\s+as any\)\.STORAGE/)
    expect(src).not.toMatch(/globalThis\s+as any\)\.__R2_BUCKET__/)
  })

  it('预热插件存在（让没有 event 的工具函数也能拿到 R2）', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'server/plugins/r2-init.ts'),
      'utf-8'
    )
    expect(src).toContain("hooks.hook('request'")
    expect(src).toContain('resolveR2')
  })
})
