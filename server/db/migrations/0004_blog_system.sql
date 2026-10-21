-- Blog CMS 系统 — SEO 获客引擎

CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  tags TEXT NOT NULL DEFAULT '[]',  -- JSON array
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | published | archived
  author_id TEXT,
  author_name TEXT NOT NULL DEFAULT 'CraftAI Team',
  meta_title TEXT,
  meta_description TEXT,
  reading_minutes INTEGER DEFAULT 5,
  view_count INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON blog_posts(status);
CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_tags_idx ON blog_posts(tags);

-- 插入默认文章
INSERT INTO blog_posts (id, slug, title, excerpt, content, tags, status, author_name, meta_title, meta_description, reading_minutes, published_at, created_at, updated_at)
VALUES
('post_001', 'getting-started', 'Getting Started with AI Music Generation', 'Learn how to create your first AI-generated song in minutes. From writing prompts to choosing styles — a complete beginner guide.', '# Getting Started with AI Music Generation

AI music generation has never been easier. With CraftAI, you can create professional-quality songs in seconds — no musical experience required.

## Step 1: Describe Your Song

Start by writing a prompt that describes the genre, mood, and style of music you want. Be specific for better results:

- **Genre**: pop, rock, hip-hop, electronic, classical, jazz
- **Mood**: upbeat, melancholic, energetic, peaceful
- **Style**: describe instruments, tempo, vocal style

## Step 2: Choose Your Mode

CraftAI offers three modes:
- **Custom**: Write your own lyrics and style prompt
- **Simple**: AI writes the lyrics for you
- **Instrumental**: No vocals, pure music

## Step 3: Generate and Download

Click Generate and wait 1-3 minutes. Once complete, preview your song and download it instantly.

## Tips for Better Results

1. Use descriptive adjectives (upbeat, dark, dreamy)
2. Mention specific instruments (piano, guitar, synth)
3. Reference well-known artists for style guidance
4. Experiment with different BPM settings

Start creating your first song today!', '["ai-music", "tutorial", "beginner"]', 'published', 'CraftAI Team', 'Getting Started with AI Music Generation | CraftAI Blog', 'Learn how to create your first AI-generated song in minutes. Complete beginner guide with tips and best practices.', 5, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'),

('post_002', 'ai-image-prompts', 'How to Write Effective AI Image Prompts', 'Master the art of prompt engineering for AI image generation. Tips, examples, and common mistakes to avoid.', '# How to Write Effective AI Image Prompts

The quality of your AI-generated images depends heavily on the quality of your prompts. Here is how to write prompts that produce stunning results.

## The Anatomy of a Great Prompt

A good prompt includes:
- **Subject**: What you want to see (a cat, a mountain landscape)
- **Style**: The artistic style (photorealistic, anime, oil painting)
- **Lighting**: How it is lit (golden hour, studio lighting, dramatic)
- **Composition**: The framing (close-up, wide angle, aerial view)
- **Details**: Colors, textures, mood

## Examples

**Weak**: "a cat"
**Strong**: "A fluffy orange tabby cat sitting on a windowsill, warm afternoon sunlight streaming through the window, photorealistic, 8K detail, shallow depth of field"

## Common Mistakes to Avoid

1. Being too vague or generic
2. Overloading with too many subjects
3. Forgetting to specify the style
4. Ignoring lighting and atmosphere

## Using CraftAI Prompt Optimizer

Our built-in prompt optimizer automatically enhances your descriptions for better results. Just write your idea and let AI do the heavy lifting.

Try it now and see the difference!', '["ai-image", "tutorial", "prompt-engineering"]', 'published', 'CraftAI Team', 'How to Write Effective AI Image Prompts | CraftAI Blog', 'Master the art of prompt engineering for AI image generation. Tips, examples, and common mistakes to avoid.', 7, '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z', '2026-08-20T00:00:00Z'),

('post_003', 'music-marketing', 'Using AI Music for Content Marketing', 'Discover how creators and marketers use AI-generated music for videos, podcasts, and social media content.', '# Using AI Music for Content Marketing

AI-generated music is transforming content marketing. Here is how creators are leveraging tools like CraftAI to enhance their content.

## Why AI Music for Marketing?

1. **Cost-effective**: No need to hire composers or buy expensive licenses
2. **Unique**: Create original music that stands out
3. **Fast**: Generate tracks in minutes, not days
4. **Customizable**: Adjust mood, tempo, and style to match your brand

## Use Cases

### YouTube Videos
Background music that matches the tone of your content without copyright concerns.

### Podcasts
Custom intro/outro music and transitions that give your podcast a professional feel.

### Social Media
Short, catchy tracks optimized for Instagram Reels, TikTok, and YouTube Shorts.

### Presentations
Background music for pitch decks and product demos that keeps audiences engaged.

## Best Practices

- Match the music mood to your content tone
- Keep it subtle — let your message be the star
- Use consistent music across episodes/series for brand recognition
- Test different tracks and measure audience response

Start creating custom music for your content today with CraftAI.', '["ai-music", "marketing", "content-creation"]', 'published', 'CraftAI Team', 'Using AI Music for Content Marketing | CraftAI Blog', 'Discover how creators and marketers use AI-generated music for videos, podcasts, and social media content.', 6, '2026-08-21T00:00:00Z', '2026-08-21T00:00:00Z', '2026-08-21T00:00:00Z');
