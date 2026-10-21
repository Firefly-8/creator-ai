/**
 * GET /api/blog — 获取已发布文章列表
 * 支持分页: ?page=1&limit=10
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getDB } from '../../utils/db-runtime'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, parseInt(String(query.page || '1')))
  const limit = Math.min(50, Math.max(1, parseInt(String(query.limit || '10'))))
  const offset = (page - 1) * limit

  const db = getDB(event)
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database not available' })

  // 获取已发布文章总数
  const countResult = await db.prepare(
    "SELECT COUNT(*) as total FROM blog_posts WHERE status = 'published'"
  ).first<{ total: number }>()

  // 获取文章列表
  const posts = await db.prepare(
    `SELECT id, slug, title, excerpt, cover_image, tags, author_name, reading_minutes, published_at, created_at
     FROM blog_posts
     WHERE status = 'published'
     ORDER BY published_at DESC
     LIMIT ? OFFSET ?`
  ).bind(limit, offset).all()

  return {
    posts: posts.results?.map((p: any) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      coverImage: p.cover_image,
      tags: JSON.parse(p.tags || '[]'),
      authorName: p.author_name,
      readingMinutes: p.reading_minutes,
      publishedAt: p.published_at,
      createdAt: p.created_at,
    })) || [],
    pagination: {
      page,
      limit,
      total: countResult?.total || 0,
      totalPages: Math.ceil((countResult?.total || 0) / limit),
    },
  }
})
