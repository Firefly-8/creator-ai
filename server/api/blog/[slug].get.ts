/**
 * GET /api/blog/:slug — 获取单篇文章详情
 */
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { getDB } from '../../utils/db-runtime'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Slug is required' })

  const db = getDB(event)
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database not available' })

  const post = await db.prepare(
    `SELECT id, slug, title, excerpt, content, cover_image, tags, author_name, meta_title, meta_description, reading_minutes, view_count, published_at, created_at, updated_at
     FROM blog_posts
     WHERE slug = ? AND status = 'published'`
  ).bind(slug).first()

  if (!post) throw createError({ statusCode: 404, statusMessage: 'Post not found' })

  // 增加浏览量
  try {
    await db.prepare(
      'UPDATE blog_posts SET view_count = view_count + 1 WHERE slug = ?'
    ).bind(slug).run()
  } catch {
    // 静默失败
  }

  const p = post as any

  // 获取相关文章（基于标签匹配）
  const tags = JSON.parse(p.tags || '[]')
  let related: any[] = []
  if (tags.length > 0) {
    const relatedResult = await db.prepare(
      `SELECT id, slug, title, excerpt, tags, author_name, reading_minutes, published_at
       FROM blog_posts
       WHERE slug != ? AND status = 'published'
       ORDER BY published_at DESC
       LIMIT 3`
    ).bind(slug).all()
    related = relatedResult.results?.map((r: any) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      tags: JSON.parse(r.tags || '[]'),
      authorName: r.author_name,
      readingMinutes: r.reading_minutes,
      publishedAt: r.published_at,
    })) || []
  }

  return {
    post: {
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      coverImage: p.cover_image,
      tags: tags,
      authorName: p.author_name,
      metaTitle: p.meta_title,
      metaDescription: p.meta_description,
      readingMinutes: p.reading_minutes,
      viewCount: p.view_count,
      publishedAt: p.published_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    },
    related,
  }
})
