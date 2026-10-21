/**
 * POST /api/admin/blog — 创建文章（管理员）
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { nanoid } from 'nanoid'
import { getDB } from '../../../utils/db-runtime'

export default defineEventHandler(async (event) => {
  if (!event.context.admin) throw createError({ statusCode: 401 })

  const body = await readBody(event)
  const { slug, title, excerpt, content, tags, status, metaTitle, metaDescription, readingMinutes } = body

  if (!slug || !title) {
    throw createError({ statusCode: 400, statusMessage: 'slug and title are required' })
  }

  const db = getDB(event)
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database not available' })

  const id = nanoid(12)
  const now = new Date().toISOString()
  const publishedAt = status === 'published' ? now : null

  await db.prepare(
    `INSERT INTO blog_posts (id, slug, title, excerpt, content, tags, status, author_name, meta_title, meta_description, reading_minutes, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, slug, title, excerpt || '', content || '',
    JSON.stringify(tags || []), status || 'draft', 'CraftAI Team',
    metaTitle || null, metaDescription || null, readingMinutes || 5,
    publishedAt, now, now
  ).run()

  return { id, slug, status: status || 'draft' }
})
