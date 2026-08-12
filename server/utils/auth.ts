/**
 * better-auth 配置
 * 支持邮箱 + Google/GitHub OAuth
 * 使用 Drizzle 适配器 (兼容 D1)
 */

import { betterAuth } from 'better-auth'
import { drizzle } from 'better-auth/adapters/drizzle'

// Auth 实例缓存
let authInstance: any = null

/**
 * 创建/获取 Auth 实例
 * @param db Drizzle DB 实例 (drizzle-orm/d1)
 */
export function getAuth(db: any) {
  if (authInstance) return authInstance

  const config = useRuntimeConfig()

  authInstance = betterAuth({
    secret: config.appSecret || 'dev-secret-change-me',
    database: db,
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      google: {
        clientId: config.googleClientId || process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: config.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || '',
      },
      github: {
        clientId: config.githubClientId || process.env.GITHUB_CLIENT_ID || '',
        clientSecret: config.githubClientSecret || process.env.GITHUB_CLIENT_SECRET || '',
      },
    },
    session: {
      expiresIn: 7 * 24 * 60 * 60, // 7 天
      updateAge: 24 * 60 * 60, // 1 天更新一次
    },
  })

  return authInstance
}

export type Auth = ReturnType<typeof getAuth>
