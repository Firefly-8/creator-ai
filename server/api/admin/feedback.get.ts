import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const d1 = (globalThis as any).DB as D1Database
  if (!d1) throw createError({ statusCode: 500, statusMessage: 'DB not available' })

  const query = getQuery(event)
  const source = query.source as string | undefined
  const status = query.status as string | undefined

  let sql = 'SELECT f.*, u.email as user_email, u.name as user_name FROM feedback f LEFT JOIN users u ON f.user_id = u.id WHERE 1=1'
  const params: any[] = []

  if (source) { sql += ' AND f.source = ?'; params.push(source) }
  if (status) { sql += ' AND f.status = ?'; params.push(status) }

  sql += ' ORDER BY f.created_at DESC LIMIT 100'
  const result = await d1.prepare(sql).bind(...params).all()
  return { items: result.results || [] }
})
