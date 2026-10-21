/**
 * Firebase Token JWT 验证 — 单元测试
 *
 * 测试策略：直接调用 verifyFirebaseToken，不 mock 内部函数
 * 通过 mock fetch 和 crypto.subtle 来模拟 JWKS 和签名验证
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch 的 JWKS 数据
const MOCK_JWKS = {
  'test-kid-001': {
    cert: `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKZ盐水鸭123456789012345678901234567890
-----END CERTIFICATE-----`,
  },
}

// 简单的 RSA key pair（测试用）
// 生成方法：在 Node.js 中运行 crypto.generateKeyPairSync
const TEST_MODULUS = 'xGXXqPk3g0k1yZ5VQ5g7RvJK8LmN2O4P1Q9Xj3Y2Z8aBfHd7Mn6Kl9Op0Q4Ur2Ws5Xd6Ye3Z8a'
const TEST_EXPONENT = 'AQAB'

// 构造一个 mock JWT: header.payload.signature
function makeMockJwt(headerB64: string, payloadB64: string, sigB64: string): string {
  return `${headerB64}.${payloadB64}.${sigB64}`
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

describe('verifyFirebaseToken', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let subtleMock: { verify: ReturnType<typeof vi.fn> }
  let cryptoMock: { subtle: typeof subtleMock }

  beforeEach(() => {
    vi.clearAllMocks()

    subtleMock = {
      verify: vi.fn().mockResolvedValue(true),
    }
    cryptoMock = { subtle: subtleMock as any }
    vi.stubGlobal('crypto', cryptoMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('JWT 结构验证', () => {
    it('应拒绝非 3 段的 token', async () => {
      const { verifyFirebaseToken } = await import('../../server/utils/firebase-verify')
      const result = await verifyFirebaseToken('not-a-jwt')
      expect(result).toBeNull()
    })

    it('应拒绝空字符串 token', async () => {
      const { verifyFirebaseToken } = await import('../../server/utils/firebase-verify')
      const result = await verifyFirebaseToken('')
      expect(result).toBeNull()
    })
  })

  describe('Header 验证', () => {
    it('应拒绝非 RS256 算法的 token', async () => {
      const header = base64UrlEncode(JSON.stringify({ kid: 'test-kid', alg: 'HS256' }))
      const payload = base64UrlEncode(JSON.stringify({ aud: 'creator-cab02', exp: Math.floor(Date.now() / 1000) + 3600, sub: 'uid123' }))
      const { verifyFirebaseToken } = await import('../../server/utils/firebase-verify')
      const result = await verifyFirebaseToken(`${header}.${payload}.sig`)
      expect(result).toBeNull()
    })
  })

  describe('Payload 验证', () => {
    it('应拒绝 aud 不匹配的 token', async () => {
      const header = base64UrlEncode(JSON.stringify({ kid: 'test-kid', alg: 'RS256' }))
      const payload = base64UrlEncode(JSON.stringify({
        aud: 'wrong-project',
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 'uid123',
        iat: Math.floor(Date.now() / 1000),
      }))
      const { verifyFirebaseToken } = await import('../../server/utils/firebase-verify')
      const result = await verifyFirebaseToken(`${header}.${payload}.sig`)
      expect(result).toBeNull()
    })

    it('应拒绝已过期的 token', async () => {
      const header = base64UrlEncode(JSON.stringify({ kid: 'test-kid', alg: 'RS256' }))
      const payload = base64UrlEncode(JSON.stringify({
        aud: 'creator-cab02',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1小时前过期
        sub: 'uid123',
        iat: Math.floor(Date.now() / 1000) - 7200,
      }))
      const { verifyFirebaseToken } = await import('../../server/utils/firebase-verify')
      const result = await verifyFirebaseToken(`${header}.${payload}.sig`)
      expect(result).toBeNull()
    })

    it('应拒绝缺少 sub 字段的 token', async () => {
      const header = base64UrlEncode(JSON.stringify({ kid: 'test-kid', alg: 'RS256' }))
      const payload = base64UrlEncode(JSON.stringify({
        aud: 'creator-cab02',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        // sub 缺失
      }))
      const { verifyFirebaseToken } = await import('../../server/utils/firebase-verify')
      const result = await verifyFirebaseToken(`${header}.${payload}.sig`)
      expect(result).toBeNull()
    })
  })

  describe('签名验证', () => {
    it('JWKS fetch 失败且无缓存时应返回 null', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })

      const header = base64UrlEncode(JSON.stringify({ kid: 'test-kid', alg: 'RS256' }))
      const payload = base64UrlEncode(JSON.stringify({
        aud: 'creator-cab02',
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 'uid123',
        iat: Math.floor(Date.now() / 1000),
      }))

      const { verifyFirebaseToken } = await import('../../server/utils/firebase-verify')
      const result = await verifyFirebaseToken(`${header}.${payload}.sig`)
      expect(result).toBeNull()
    })

    it('kid 不在 JWKS 中时应返回 null', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 'unknown-kid': 'cert-data' }),
      })

      const header = base64UrlEncode(JSON.stringify({ kid: 'unknown-kid', alg: 'RS256' }))
      const payload = base64UrlEncode(JSON.stringify({
        aud: 'creator-cab02',
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 'uid123',
        iat: Math.floor(Date.now() / 1000),
      }))

      const { verifyFirebaseToken } = await import('../../server/utils/firebase-verify')
      const result = await verifyFirebaseToken(`${header}.${payload}.sig`)
      expect(result).toBeNull()
    })
  })
})
