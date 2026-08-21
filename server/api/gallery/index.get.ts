/**
 * GET /api/gallery — 获取公开作品（Gallery）
 * 支持分页: ?page=1&limit=12&type=all|music|image
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getDB } from '../../utils/db-runtime'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, parseInt(String(query.page || '1')))
  const limit = Math.min(50, Math.max(1, parseInt(String(query.limit || '12'))))
  const type = String(query.type || 'all')
  const offset = (page - 1) * limit

  const db = getDB(event)
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database not available' })

  const items: any[] = []

  // 获取公开音乐
  if (type === 'all' || type === 'music') {
    const musicLimit = type === 'music' ? limit : Math.ceil(limit / 2)
    const musicResult = await db.prepare(
      `SELECT id, title, prompt, cover_color, cover_path, duration_ms, type, created_at
       FROM songs
       WHERE is_public = 1 AND status = 'ready'
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(musicLimit, type === 'music' ? offset : 0).all()

    if (musicResult.results) {
      for (const m of musicResult.results as any[]) {
        items.push({
          id: m.id,
          type: 'music',
          title: m.title,
          prompt: m.prompt,
          coverColor: m.cover_color,
          coverUrl: m.cover_path ? '/api/cover-art/' + m.id : null,
          durationMs: m.duration_ms,
          audioUrl: '/api/audio/' + m.id,
          createdAt: m.created_at,
        })
      }
    }
  }

  // 获取公开图片
  if (type === 'all' || type === 'image') {
    const imageLimit = type === 'image' ? limit : Math.ceil(limit / 2)
    const imageResult = await db.prepare(
      `SELECT id, title, prompt, image_path, aspect_ratio, model, created_at
       FROM generated_images
       WHERE is_public = 1 AND status = 'completed'
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(imageLimit, type === 'image' ? offset : 0).all()

    if (imageResult.results) {
      for (const img of imageResult.results as any[]) {
        items.push({
          id: img.id,
          type: 'image',
          title: img.title,
          prompt: img.prompt,
          imageUrl: img.image_path ? '/api/images/' + img.id + '/file' : null,
          aspectRatio: img.aspect_ratio,
          model: img.model,
          createdAt: img.created_at,
        })
      }
    }
  }

  // 按时间排序
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return {
    items: items.slice(0, limit),
    pagination: {
      page,
      limit,
      hasMore: items.length >= limit,
    },
  }
})
