/**
 * GET /api/admin/blog — 获取所有文章（管理员）
 */
import { defineEventHandler, createError } from 'h3'
import { getDB } from '../../../utils/db-runtime'

export default defineEventHandler(async (event) => {
  // 使用 admin 中间件注入的上下文
  if (!event.context.admin) throw createError({ statusCode: 401 })

  const db = getDB(event)
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database not available' })

  const result = await db.prepare(
    `SELECT id, slug, title, excerpt, tags, status, author_name, view_count, published_at, created_at, updated_at
     FROM blog_posts
     ORDER BY created_at DESC
     LIMIT 100`
  ).all()

  return {
    posts: result.results?.map((p: any) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      tags: JSON.parse(p.tags || '[]'),
      status: p.status,
      authorName: p.author_name,
      viewCount: p.view_count,
      publishedAt: p.published_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })) || [],
  }
})
