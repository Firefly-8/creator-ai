/**
 * 文件服务访问授权 — 单元测试
 *
 * 背景（2026-10-22）：浏览器里的 <img src> / <audio src> / 下载链接
 * **带不了 Authorization 头**，所以文件服务必须支持签名 URL 授权。
 * 之前 auth 中间件在端点之前就 401 了 → 签名校验永远执行不到
 * → 页面上所有图片/音频/封面全是裂的。
 *
 * 这里覆盖两条凭证路径：
 *   1. 签名 URL（页面直接用它渲染）
 *   2. Bearer token（此时必须校验归属，防止读别人的图 = IDOR）
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { assertFileAccess } from '../../server/utils/file-access'
import { sign } from '../../server/utils/crypto'

const SECRET = 'test-signing-secret'

function makeEvent(uid?: string) {
  return {
    context: uid ? { auth: { uid } } : {},
  } as any
}

async function makeSignedQuery(id: string, type: 'audio' | 'image' | 'cover', ttlMs = 60_000) {
  const expires = Date.now() + ttlMs
  const signature = await sign(`${id}:${type}:${expires}`, SECRET)
  return { expires: String(expires), signature }
}

describe('file-access — 签名 URL 路径', () => {
  beforeEach(() => {
    vi.stubGlobal('__env__', { URL_SIGNING_SECRET: SECRET })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('有效签名 → 放行（不需要 token）', async () => {
    const query = await makeSignedQuery('img1', 'image')
    const method = await assertFileAccess(makeEvent(), { id: 'img1', type: 'image' }, query)
    expect(method).toBe('signature')
  })

  it('签名被篡改 → 403', async () => {
    const query = await makeSignedQuery('img1', 'image')
    const method = await assertFileAccess(
      makeEvent(),
      { id: 'img1', type: 'image' },
      { ...query, signature: 'tampered' }
    ).catch((e: any) => e)
    expect(method).toBeInstanceOf(Error)
    expect(method.statusCode).toBe(403)
  })

  it('过期签名 → 403', async () => {
    const query = await makeSignedQuery('img1', 'image', -1000)
    const err = await assertFileAccess(
      makeEvent(),
      { id: 'img1', type: 'image' },
      query
    ).catch((e: any) => e)
    expect(err).toBeInstanceOf(Error)
    expect(err.statusCode).toBe(403)
  })

  it('签名是给别的 id 签的 → 403（不能拿 A 的签名读 B）', async () => {
    const query = await makeSignedQuery('other-id', 'image')
    const err = await assertFileAccess(
      makeEvent(),
      { id: 'img1', type: 'image' },
      query
    ).catch((e: any) => e)
    expect(err).toBeInstanceOf(Error)
    expect(err.statusCode).toBe(403)
  })

  it('签名是给别的 type 签的 → 403', async () => {
    const query = await makeSignedQuery('img1', 'audio')
    const err = await assertFileAccess(
      makeEvent(),
      { id: 'img1', type: 'image' },
      query
    ).catch((e: any) => e)
    expect(err).toBeInstanceOf(Error)
    expect(err.statusCode).toBe(403)
  })
})

describe('file-access — Bearer token 路径', () => {
  beforeEach(() => {
    vi.stubGlobal('__env__', { URL_SIGNING_SECRET: SECRET })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('没有签名也没有 token → 401', async () => {
    const err = await assertFileAccess(makeEvent(), { id: 'img1', type: 'image' }, {}).catch((e: any) => e)
    expect(err).toBeInstanceOf(Error)
    expect(err.statusCode).toBe(401)
  })

  it('有 token 且是本人 → 放行', async () => {
    const method = await assertFileAccess(
      makeEvent('u1'),
      { id: 'img1', type: 'image', ownerId: 'u1' },
      {}
    )
    expect(method).toBe('token')
  })

  it('有 token 但不是本人 → 403（防 IDOR）', async () => {
    const err = await assertFileAccess(
      makeEvent('u2'),
      { id: 'img1', type: 'image', ownerId: 'u1' },
      {}
    ).catch((e: any) => e)
    expect(err).toBeInstanceOf(Error)
    expect(err.statusCode).toBe(403)
  })

  it('没有归属信息时不校验归属（公开资源）', async () => {
    const method = await assertFileAccess(makeEvent('u9'), { id: 'x', type: 'cover' }, {})
    expect(method).toBe('token')
  })
})
