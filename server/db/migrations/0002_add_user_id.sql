-- Phase 1: 添加 user_id 字段，实现数据隔离
-- 为 songs, generated_images, jobs 表增加 user_id

-- songs 表
ALTER TABLE songs ADD COLUMN user_id TEXT NOT NULL DEFAULT 'legacy';
CREATE INDEX IF NOT EXISTS songs_user_created ON songs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS songs_user_status ON songs(user_id, status);

-- generated_images 表
ALTER TABLE generated_images ADD COLUMN user_id TEXT NOT NULL DEFAULT 'legacy';
CREATE INDEX IF NOT EXISTS images_user_created ON generated_images(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS images_user_status ON generated_images(user_id, status);

-- jobs 表
ALTER TABLE jobs ADD COLUMN user_id TEXT NOT NULL DEFAULT 'legacy';
CREATE INDEX IF NOT EXISTS jobs_user_status ON jobs(user_id, status);
CREATE INDEX IF NOT EXISTS jobs_user_created ON jobs(user_id, created_at DESC);

-- 修复 subscriptions 表 credits_remaining（-1 = 无限）
-- 已有默认值 10，需要改为 -1（免费模式无限额度）
-- SQLite 不支持 ALTER COLUMN，但新插入时用 -1 即可
