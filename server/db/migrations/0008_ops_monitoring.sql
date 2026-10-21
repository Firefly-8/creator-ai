-- 运维监控：生成失败流水 + 告警状态
--
-- 用途（2026-10-21）：
--   「多个人尝试生图失败时，给所有者发告警邮件」。
--
-- 为什么单独建表而不是复用 generated_images.status='failed'：
--   1) generated_images 只记了 error_message 文本，**没有错误码** ——
--      分不清「用户 prompt 违规」和「上游挂了」，前者不该告警后者必须告警。
--   2) 它按图片记录，一个用户一次批量出 4 张会记 4 行，统计口径会歪。
--   3) 它没有时间索引，按窗口聚合会很慢。
--
-- created_ts 用 **epoch 毫秒整数**，不是 ISO 字符串：
--   ISO 字符串跟 SQLite 的 datetime() 格式（'YYYY-MM-DD HH:MM:SS'）比较会出
--   字典序错乱（'T' > ' '），时间窗口统计会算出乱七八糟的结果。
--   整数比较零歧义。
--
-- ops_alerts.last_fired_ts 同理 —— 冷却期判断用它做纯数字比较。

CREATE TABLE IF NOT EXISTS ops_generation_failures (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,            -- image/generate | image/generate-batch | music/generate | ...
  error_code INTEGER,                -- MiniMax base_resp.status_code，或 HTTP 状态码
  error_category TEXT NOT NULL,      -- user | quota | system | unknown
  error_message TEXT,
  created_at TEXT NOT NULL,
  created_ts INTEGER NOT NULL
);

-- 时间窗口聚合（告警判定走这个）
CREATE INDEX IF NOT EXISTS ops_failures_ts_idx ON ops_generation_failures(created_ts);
-- 按用户去重统计
CREATE INDEX IF NOT EXISTS ops_failures_user_ts_idx ON ops_generation_failures(user_id, created_ts);

-- 告警状态：记录每个告警 key 上次触发时间，用于冷却期去重
CREATE TABLE IF NOT EXISTS ops_alerts (
  alert_key TEXT PRIMARY KEY,        -- 例如 generation_failures
  last_fired_at TEXT NOT NULL,
  last_fired_ts INTEGER NOT NULL,
  fire_count INTEGER NOT NULL DEFAULT 0,
  last_detail TEXT,
  updated_at TEXT NOT NULL
);
