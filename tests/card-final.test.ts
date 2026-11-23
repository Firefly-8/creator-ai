/**
 * 成品卡 / 草稿状态单元测试（2026-11-23）
 * 锁住原型规则：成品图落库、草稿 3 天过期、作品永久。
 */
import { describe, it, expect } from 'vitest'
import {
  parseCardMeta,
  withCardMeta,
  isWork,
  isExpiredDraft,
  finalFileName,
  DRAFT_TTL_DAYS,
} from '../server/utils/card-final'

const NOW = Date.parse('2026-11-23T12:00:00Z')

describe('card-final 元数据', () => {
  it('坏数据 / 空值安全降级', () => {
    expect(parseCardMeta(null)).toEqual({})
    expect(parseCardMeta('')).toEqual({})
    expect(parseCardMeta('not json')).toEqual({})
  })

  it('withCardMeta 合并时保留已有字段', () => {
    const merged = withCardMeta('{"scene":"birthday"}', { assetType: 'work', finalPath: 'x-final.png' })
    expect(parseCardMeta(merged)).toMatchObject({
      scene: 'birthday',
      assetType: 'work',
      finalPath: 'x-final.png',
    })
  })

  it('作品判定只看 assetType', () => {
    expect(isWork({ meta_json: '{"assetType":"work"}' })).toBe(true)
    expect(isWork({ meta_json: '{"assetType":"draft"}' })).toBe(false)
    expect(isWork({ meta_json: '{}' })).toBe(false)
  })

  it('草稿过期：3 天内不过期，超过 3 天才过期', () => {
    const twoDays = new Date(NOW - 2 * 86400_000).toISOString()
    const fourDays = new Date(NOW - 4 * 86400_000).toISOString()
    expect(isExpiredDraft({ meta_json: '{}', created_at: twoDays }, NOW)).toBe(false)
    expect(isExpiredDraft({ meta_json: '{}', created_at: fourDays }, NOW)).toBe(true)
  })

  it('作品永远不过期，哪怕创建很久了', () => {
    const longAgo = new Date(NOW - 90 * 86400_000).toISOString()
    expect(isExpiredDraft({ meta_json: '{"assetType":"work"}', created_at: longAgo }, NOW)).toBe(false)
  })

  it('无效时间戳不误杀', () => {
    expect(isExpiredDraft({ meta_json: '{}', created_at: 'bad-date' }, NOW)).toBe(false)
  })

  it('成品图文件名按 id 生成，可被 final-file 端点复现', () => {
    expect(finalFileName('abc123')).toBe('abc123-final.png')
    expect(DRAFT_TTL_DAYS).toBe(3)
  })
})
