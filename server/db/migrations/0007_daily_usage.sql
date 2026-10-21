-- 每日生成额度计数（服务端强制的真闸门）
--
-- 为什么需要这张表（2026-10-21）：
--   之前「每日免费次数」只存在于 /api/user/daily-free 这个旁路 API ——
--   前端 dashboard 有个「领取」按钮，但**生成接口根本不查它**，
--   所以领不领都能生成，唯一生效的只有 KV 的 100 次/小时限流
--   （= 一天 2400 次）。白嫖口子全开。
--
-- 现在改成：生成前在服务端查这张表并原子自增，超额直接拒绝。
-- 计数是「按用户 × 按天」，用户删 cookie、重装、清缓存都重置不了。
--
-- text_count 覆盖「AI 写文案」类请求（/api/image/message、/api/lyrics）——
-- 它们也烧 MiniMax 额度，但不该跟图片生成抢同一个额度池。

CREATE TABLE IF NOT EXISTS daily_usage (
  user_id TEXT NOT NULL,
  usage_date TEXT NOT NULL,        -- YYYY-MM-DD（UTC）
  image_count INTEGER NOT NULL DEFAULT 0,
  music_count INTEGER NOT NULL DEFAULT 0,
  text_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS daily_usage_date_idx ON daily_usage(usage_date);
