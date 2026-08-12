-- CraftAI 初始数据库迁移
-- Cloudflare D1

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar TEXT,
  email_verified INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- OAuth 账户表
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER
);
CREATE INDEX IF NOT EXISTS accounts_user_idx ON accounts(user_id);

-- 会话表
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token);

-- 订阅表
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  paypal_subscription_id TEXT,
  current_period_start TEXT,
  current_period_end TEXT,
  credits_remaining INTEGER DEFAULT 10,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions(user_id);

-- 生成记录表
CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  prompt TEXT,
  result_url TEXT,
  model TEXT NOT NULL,
  credits_used INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS generations_user_idx ON generations(user_id);
CREATE INDEX IF NOT EXISTS generations_created_idx ON generations(created_at);

-- API Keys 表
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  key_hash TEXT NOT NULL,
  name TEXT,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS api_keys_user_idx ON api_keys(user_id);

-- 歌曲表 (本地开发兼容)
CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  lyrics TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT 'music-3.0',
  type TEXT NOT NULL DEFAULT 'generate',
  status TEXT NOT NULL DEFAULT 'generating',
  duration_ms INTEGER NOT NULL DEFAULT 0,
  audio_path TEXT,
  cover_path TEXT,
  cover_color TEXT NOT NULL DEFAULT '#0f766e',
  error_message TEXT,
  parent_id TEXT,
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_songs_created ON songs(created_at DESC);

-- 任务表 (本地开发兼容)
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  progress TEXT NOT NULL DEFAULT '',
  song_id TEXT,
  error_message TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- 图片生成表 (本地开发兼容)
CREATE TABLE IF NOT EXISTS generated_images (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  prompt TEXT NOT NULL DEFAULT '',
  prompt_final TEXT NOT NULL DEFAULT '',
  scene TEXT NOT NULL DEFAULT 'general',
  model TEXT NOT NULL DEFAULT 'image-01',
  mode TEXT NOT NULL DEFAULT 't2i',
  aspect_ratio TEXT NOT NULL DEFAULT '1:1',
  style_type TEXT,
  image_path TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  error_message TEXT,
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_images_created ON generated_images(created_at DESC);

-- 歌曲版本表
CREATE TABLE IF NOT EXISTS song_versions (
  id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL REFERENCES songs(id),
  version INTEGER NOT NULL,
  audio_path TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
