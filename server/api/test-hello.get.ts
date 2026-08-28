import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  return { 
    hello: 'world',
    timestamp: new Date().toISOString(),
    path: event.path,
    method: event.method,
  }
})
