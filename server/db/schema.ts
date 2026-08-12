/**
 * CraftAI 数据库 Schema — Cloudflare D1
 * 使用 Drizzle ORM
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ============ 用户表 ============
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatar: text('avatar'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// ============ OAuth 账户表 ============
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  provider: text('provider').notNull(), // google | github | email
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken: text('refresh_token'), // 加密存储
  accessToken: text('access_token'), // 加密存储
  expiresAt: integer('expires_at'),
}, (table) => ({
  userIdx: index('accounts_user_idx').on(table.userId),
}))

// ============ 会话表 ============
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index('sessions_user_idx').on(table.userId),
  tokenIdx: index('sessions_token_idx').on(table.token),
}))

// ============ 订阅表 ============
export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  plan: text('plan').notNull().default('free'), // free | creator | pro
  status: text('status').notNull().default('active'), // active | canceled | expired
  paypalSubscriptionId: text('paypal_subscription_id'),
  currentPeriodStart: text('current_period_start'),
  currentPeriodEnd: text('current_period_end'),
  creditsRemaining: integer('credits_remaining').default(10),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index('subscriptions_user_idx').on(table.userId),
}))

// ============ 生成记录表 ============
export const generations = sqliteTable('generations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(), // music | image | lyrics | cover
  prompt: text('prompt'), // 加密存储
  resultUrl: text('result_url'),
  model: text('model').notNull(),
  creditsUsed: integer('credits_used').default(1),
  status: text('status').notNull().default('completed'), // pending | processing | completed | failed
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index('generations_user_idx').on(table.userId),
  createdIdx: index('generations_created_idx').on(table.createdAt),
}))

// ============ API Keys 表（未来开放 API） ============
export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  keyHash: text('key_hash').notNull(),
  name: text('name'),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index('api_keys_user_idx').on(table.userId),
}))

// ============ 导出类型 ============
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
export type Generation = typeof generations.$inferSelect
export type NewGeneration = typeof generations.$inferInsert
