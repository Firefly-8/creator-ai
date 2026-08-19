import { defineEventHandler, getQuery, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const { getDB } = await import('../../utils/db-runtime')
  const d1 = getDB(event)
  if (!d1) throw createError({ statusCode: 500, statusMessage: 'DB not available' })

  const query = getQuery(event)
  const search = (query.search as string || '').trim()
  const limit = Math.min(parseInt(query.limit as string) || 50, 100)

  let sql = 'SELECT u.id, u.email, u.name, u.created_at, s.plan, s.credits_remaining, (SELECT COUNT(*) FROM user_privileges up WHERE up.user_id = u.id) as privilege_count FROM users u LEFT JOIN subscriptions s ON s.user_id = u.id WHERE 1=1'
  const params: any[] = []

  if (search) {
    sql += ' AND (u.email LIKE ? OR u.name LIKE ?)'
    params.push('%' + search + '%', '%' + search + '%')
  }

  sql += ' ORDER BY u.created_at DESC LIMIT ?'
  params.push(limit)

  const result = await d1.prepare(sql).bind(...params).all()
  return { items: result.results || [] }
})
