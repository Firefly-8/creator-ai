/**
 * Dynamic sitemap.xml generation
 * Includes all public pages + blog posts for SEO
 */
import { getDB } from '../utils/db-runtime'

export default defineEventHandler(async (event) => {
  const baseUrl = 'https://creator.yozzytools.com'

  const routes = [
    { path: '/', priority: 1.0, changefreq: 'daily' },
    { path: '/pricing', priority: 0.9, changefreq: 'weekly' },
    { path: '/create', priority: 0.8, changefreq: 'weekly' },
    { path: '/image', priority: 0.8, changefreq: 'weekly' },
    { path: '/blog', priority: 0.7, changefreq: 'daily' },
    { path: '/about', priority: 0.5, changefreq: 'monthly' },
    { path: '/contact', priority: 0.5, changefreq: 'monthly' },
    { path: '/privacy', priority: 0.3, changefreq: 'monthly' },
    { path: '/terms', priority: 0.3, changefreq: 'monthly' },
    { path: '/login', priority: 0.3, changefreq: 'monthly' },
    { path: '/signup', priority: 0.4, changefreq: 'monthly' },
    { path: '/ai-music-generator', priority: 0.7, changefreq: 'weekly' },
    { path: '/ai-image-generator', priority: 0.7, changefreq: 'weekly' },
  ]

  // 获取已发布文章
  const db = getDB(event)
  if (db) {
    try {
      const blogResult = await db.prepare(
        "SELECT slug, updated_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC"
      ).all()
      if (blogResult.results) {
        for (const post of blogResult.results as any[]) {
          routes.push({
            path: `/blog/${post.slug}`,
            priority: 0.6,
            changefreq: 'monthly',
            lastmod: post.updated_at,
          })
        }
      }
    } catch {
      // 忽略 blog 表不存在的情况
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${routes.map(r => `  <url>
    <loc>${baseUrl}${r.path}</loc>
    <lastmod>${(r as any).lastmod || today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return xml
})
