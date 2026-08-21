-- 每日免费生成 + 用户行为追踪

CREATE TABLE IF NOT EXISTS daily_free_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  claim_date TEXT NOT NULL,  -- YYYY-MM-DD
  type TEXT NOT NULL DEFAULT 'music',  -- music | image
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, claim_date, type)
);
CREATE INDEX IF NOT EXISTS daily_claims_user_date_idx ON daily_free_claims(user_id, claim_date);

-- 用户统计表（缓存用，减少实时查询）
CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  total_music INTEGER NOT NULL DEFAULT 0,
  total_image INTEGER NOT NULL DEFAULT 0,
  total_cover INTEGER NOT NULL DEFAULT 0,
  total_lyrics INTEGER NOT NULL DEFAULT 0,
  last_active_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  streak_days INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS user_stats_active_idx ON user_stats(last_active_at);
