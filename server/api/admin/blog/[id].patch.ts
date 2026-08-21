/**
 * PATCH /api/admin/blog/:id — 更新文章（管理员）
 */
import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
import { getDB } from '../../../utils/db-runtime'

export default defineEventHandler(async (event) => {
  if (!event.context.admin) throw createError({ statusCode: 401 })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  const body = await readBody(event)
  const { slug, title, excerpt, content, tags, status, metaTitle, metaDescription, readingMinutes } = body

  const db = getDB(event)
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database not available' })

  // 获取当前文章
  const current = await db.prepare(
    'SELECT status FROM blog_posts WHERE id = ?'
  ).bind(id).first<{ status: string }>()

  if (!current) throw createError({ statusCode: 404, statusMessage: 'Post not found' })

  const now = new Date().toISOString()
  const publishedAt = (status === 'published' && current.status !== 'published') ? now : null

  await db.prepare(
    `UPDATE blog_posts SET
      slug = COALESCE(?, slug),
      title = COALESCE(?, title),
      excerpt = COALESCE(?, excerpt),
      content = COALESCE(?, content),
      tags = COALESCE(?, tags),
      status = COALESCE(?, status),
      meta_title = COALESCE(?, meta_title),
      meta_description = COALESCE(?, meta_description),
      reading_minutes = COALESCE(?, reading_minutes),
      published_at = CASE WHEN ? IS NOT NULL THEN ? ELSE published_at END,
      updated_at = ?
     WHERE id = ?`
  ).bind(
    slug || null, title || null, excerpt || null, content || null,
    tags ? JSON.stringify(tags) : null, status || null,
    metaTitle || null, metaDescription || null, readingMinutes || null,
    publishedAt, publishedAt, now, id
  ).run()

  return { id, updated: true }
})
