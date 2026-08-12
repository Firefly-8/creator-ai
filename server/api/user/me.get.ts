/**
 * 获取当前用户信息
 */

import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  // TODO: 从 better-auth 会话获取用户信息
  // const session = await getSession(event)
  
  // 临时返回示例
  return {
    user: null,
    subscription: null,
    quotas: {
      free: { music: 10, image: 20, lyrics: 10, cover: 5 },
      creator: { music: 100, image: 200, lyrics: 100, cover: 50 },
      pro: { music: 300, image: 500, lyrics: 300, cover: 100 },
    },
  }
})
