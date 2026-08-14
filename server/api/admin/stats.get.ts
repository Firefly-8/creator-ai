import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const d1 = (globalThis as any).DB as D1Database
  if (!d1) throw createError({ statusCode: 500, statusMessage: 'DB not available' })

  const userCount = await d1.prepare('SELECT COUNT(*) as count FROM users').first()
  const feedbackCount = await d1.prepare('SELECT COUNT(*) as count FROM feedback').first()
  const openFeedback = await d1.prepare("SELECT COUNT(*) as count FROM feedback WHERE status = 'open'").first()
  const feedbackBySource = await d1.prepare('SELECT source, COUNT(*) as count FROM feedback GROUP BY source').all()
  const recentUsers = await d1.prepare('SELECT id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT 5').all()

  return {
    stats: {
      totalUsers: userCount?.count || 0,
      totalFeedback: feedbackCount?.count || 0,
      openFeedback: openFeedback?.count || 0,
    },
    feedbackBySource: feedbackBySource.results || [],
    recentUsers: recentUsers.results || [],
  }
})
