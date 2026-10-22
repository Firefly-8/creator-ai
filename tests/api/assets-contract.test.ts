/**
 * 资产链路契约 — 单元测试
 *
 * 覆盖 2026-10-22 修的三个「用户看不见结果」的问题：
 *   1. 前端读 `res.images[]`，后端只返回 `imageUrl` 单值 → 契约对不上 → 界面空白
 *   2. 图片文件接口被 auth 中间件 401，而 <img src> 带不了 token → 全是裂图
 *   3. 没有资产入口（侧边栏里根本没有「我的作品」）
 *
 * 这些都是**静默失效**：不报错、页面照常渲染，只是空着。
 * 所以必须有测试盯着，不然改一次就复发一次。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8')
}

describe('资产链路 — 文件服务路由的鉴权模型', () => {
  it('文件服务路由必须在 auth 白名单里（否则 <img src> 永远 401）', () => {
    const src = read('server/middleware/auth.ts')
    for (const p of ['/api/images', '/api/audio', '/api/cover-art']) {
      expect(src, `白名单里缺 ${p}`).toContain(`'${p}'`)
    }
  })

  it('图片文件端点必须走 assertFileAccess（签名 或 token+归属）', () => {
    const src = read('server/api/images/[id]/file.get.ts')
    expect(src).toContain('assertFileAccess')
    expect(src).toContain("type: 'image'")
    expect(src).toContain('ownerId: row.user_id')
  })

  it('音频 / 封面端点同样走 assertFileAccess', () => {
    for (const f of ['server/api/audio/[id].get.ts', 'server/api/cover-art/[id].get.ts']) {
      const src = read(f)
      expect(src, `${f} 没用 assertFileAccess`).toContain('assertFileAccess')
      expect(src, `${f} 没校验归属`).toContain('ownerId:')
    }
  })

  it('数据接口自己校验登录（因为中间件已经放行了整个前缀）', () => {
    // 列表
    expect(read('server/api/images/index.get.ts')).toContain('if (!auth?.uid)')
    // 删除
    const del = read('server/api/images/[id].delete.ts')
    expect(del).toContain('if (!auth?.uid)')
    expect(del).toContain('getImage(id, auth.uid)') // 归属校验，防 IDOR
    // 重生成
    const re = read('server/api/images/[id]/regenerate.post.ts')
    expect(re).toContain('if (!auth?.uid)')
    expect(re).toContain('regenerateImage(id, auth.uid)')
  })
})

describe('资产链路 — 前后端契约', () => {
  it('generate 接口必须返回 images 数组', () => {
    const src = read('server/api/image/generate.post.ts')
    expect(src).toContain('images: candidates')
  })

  it('前端必须读 imageUrl（不是 url）', () => {
    const cards = read('pages/cards.vue')
    expect(cards).toContain('im.imageUrl')
    expect(cards).not.toContain('url: im.url')
  })

  it('publicImage / publicSong 必须返回签名 URL', () => {
    const images = read('server/utils/images.ts')
    expect(images).toContain('generateSignedUrl')
    // 旧写法是「裸路径直接赋值」—— 没有签名，浏览器拿到就是 401
    expect(images).not.toContain('imageUrl: img.image_path ?')
    expect(images).not.toContain('imageUrl: img.image_path ? `/api/images/')

    const jobs = read('server/utils/jobs.ts')
    expect(jobs).toContain('generateSignedUrl')
    expect(jobs).not.toContain('audioUrl: song.audio_path ?')
    expect(jobs).not.toContain('coverUrl: song.cover_path ?')
  })

  it('签名密钥要从运行时 env 读（线上 CF 不注入构建期 env）', () => {
    const storage = read('server/utils/storage.ts')
    expect(storage).toContain('URL_SIGNING_SECRET')
    // 旧的写法只看 runtimeConfig（构建期内联），线上是空的
    expect(storage).toContain('envString')
  })
})

describe('资产链路 — 资产入口', () => {
  it('侧边栏布局必须有「我的资产」入口', () => {
    const src = read('layouts/default.vue')
    expect(src).toContain('/my-assets')
  })

  it('营销站导航也要有入口', () => {
    const src = read('layouts/marketing.vue')
    expect(src).toContain('/my-assets')
    expect(src).not.toContain('/my-cards"') // 老入口已并入
  })

  it('资产页存在，且 old 的 /my-cards 会跳过去', () => {
    expect(read('pages/my-assets.vue')).toContain('My creations')
    expect(read('pages/my-cards.vue')).toContain("navigateTo('/my-assets'")
  })

  /**
   * 入口要铺在「用户会想起来找作品」的所有地方：
   * 侧栏 / 账号菜单 / 首页 / 公开画廊 / dashboard / 生成页 / 音乐库
   */
  it('关键页面都要有资产入口', () => {
    const entryPoints: [string, string][] = [
      ['layouts/default.vue', '侧边栏'],
      ['layouts/marketing.vue', '营销站导航'],
      ['pages/index.vue', '首页'],
      ['pages/gallery/index.vue', '公开画廊'],
      ['pages/dashboard/index.vue', '工作台首页'],
      ['pages/cards.vue', '贺卡生成页'],
      ['pages/image.vue', 'AI 图片工作台'],
      ['pages/music-library.vue', '音乐库'],
    ]
    for (const [file, label] of entryPoints) {
      expect(read(file), `${label}（${file}）缺资产入口`).toContain('/my-assets')
    }
  })

  it('账号菜单里也要有（手机上侧栏是收起来的）', () => {
    // default 布局原本是 :links="[]"，等于账号菜单里什么都没有
    const src = read('layouts/default.vue')
    expect(src).not.toContain(':links="[]"')
    expect(src).toContain('accountLinks')
  })
})
