-- Gallery 公开作品 + 分享功能

--  songs 表增加 is_public 字段
ALTER TABLE songs ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS songs_public_idx ON songs(is_public, created_at DESC);

-- generated_images 表增加 is_public 字段
ALTER TABLE generated_images ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS images_public_idx ON generated_images(is_public, created_at DESC);
