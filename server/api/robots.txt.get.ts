/**
 * robots.txt generation
 */

export default defineEventHandler(async (event) => {
  const baseUrl = 'https://craftai.ai'
  
  const content = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /login/
Disallow: /signup/

Sitemap: ${baseUrl}/api/sitemap.xml`

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=86400')
  return content
})
