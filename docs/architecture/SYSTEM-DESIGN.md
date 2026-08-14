# Creator AI — 系统技术架构设计

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (Nuxt 3 SPA)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Firebase │  │  Auth    │  │ 生成页面  │  │  用户资产页   │  │
│  │   SDK    │  │  Modal   │  │ create   │  │  library      │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │
│       │              │              │                │           │
│       └──────────────┴──────────────┴────────────────┘           │
│                           │ HTTP + ID Token                      │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                    Cloudflare Pages (SSR + API)                  │
│                           │                                      │
│  ┌────────────────────────┴────────────────────────────┐        │
│  │              Nitro Server (API Routes)               │        │
│  │                                                      │        │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │        │
│  │  │ Firebase     │  │  生成 API     │  │ 资产 CRUD  │ │        │
│  │  │ Auth Guard   │  │  (异步任务)   │  │  API       │ │        │
│  │  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │        │
│  │         │                  │                 │        │        │
│  │         ▼                  ▼                 ▼        │        │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │        │
│  │  │  D1 ORM     │  │ MiniMax API  │  │ R2 Storage │ │        │
│  │  │  Layer      │  │ Client       │  │ Signed URL │ │        │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                  │
│  外部依赖: Firebase Auth | MiniMax API | PayPal (暂不接入)        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. 密钥与配置

### 生成的密钥
```
APP_SECRET=9af36066211a7d64cc8af641443dd3ce84d9a06aa8a48015693e971fddc89744
ENCRYPTION_MASTER_KEY=95622c79f6343fe0fb47501c2b65a8f558e976dacb2020ad39467c0637bf4d50
URL_SIGNING_SECRET=42d10731c29f20e57df31e9b4427f6873e1a3a86c4bcf32ed100c846a47e661a
```

### MiniMax API Key
```
MINIMAX_API_KEY=sk-cp-odC_-CsaXTP-5ILfav83TfTfgsJ0Z1bjvorahK3DHXeI4sE3_Dm5WFPud0Dvc64JYHgYIOfzMGKNj-wdePUtZjFnMt1fcwim3nUkDNfpB_Sz5mIKsHgkZn4
```

---

## 3. 数据库表结构（修正版）

### 3.1 users — 用户表
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- Firebase UID
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar TEXT,
  email_verified INTEGER DEFAULT 0,
  locale TEXT DEFAULT 'en',         -- 用户语言偏好
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 accounts — OAuth 账户关联
```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,           -- google | email
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,               -- 加密存储
  access_token TEXT,                -- 加密存储
  expires_at INTEGER,
  UNIQUE(provider, provider_account_id)
);
CREATE INDEX accounts_user_idx ON accounts(user_id);
```

### 3.3 subscriptions — 订阅（免费版统一处理）
```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',  -- free | creator | pro
  status TEXT NOT NULL DEFAULT 'active',
  paypal_subscription_id TEXT,
  current_period_start TEXT,
  current_period_end TEXT,
  credits_remaining INTEGER DEFAULT -1,  -- -1 = 无限（免费模式）
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX subscriptions_user_idx ON subscriptions(user_id);
```

### 3.4 songs — 音乐作品（修正：增加 user_id）
```sql
CREATE TABLE songs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  prompt TEXT NOT NULL DEFAULT '',       -- 加密
  lyrics TEXT NOT NULL DEFAULT '',       -- 加密
  model TEXT NOT NULL DEFAULT 'music-3.0',
  type TEXT NOT NULL DEFAULT 'generate', -- generate | cover | edit
  status TEXT NOT NULL DEFAULT 'pending',-- pending | processing | ready | failed
  duration_ms INTEGER DEFAULT 0,
  audio_path TEXT,                       -- R2 key
  cover_path TEXT,                       -- R2 key
  cover_color TEXT DEFAULT '#8b7cff',
  error_message TEXT,
  parent_id TEXT REFERENCES songs(id),   -- 版本关联
  meta_json TEXT DEFAULT '{}',           -- 加密
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX songs_user_created ON songs(user_id, created_at DESC);
CREATE INDEX songs_status ON songs(status);

-- 歌曲版本表
CREATE TABLE song_versions (
  id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  audio_path TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX song_versions_song_idx ON song_versions(song_id);
```

### 3.5 generated_images — 图片作品（修正：增加 user_id）
```sql
CREATE TABLE generated_images (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  prompt TEXT DEFAULT '',            -- 加密
  prompt_final TEXT DEFAULT '',      -- 加密（优化后）
  scene TEXT DEFAULT 'general',
  model TEXT DEFAULT 'image-01',
  mode TEXT DEFAULT 't2i',           -- t2i | i2i
  aspect_ratio TEXT DEFAULT '1:1',
  style_type TEXT,
  image_path TEXT,                   -- R2 key
  status TEXT DEFAULT 'pending',     -- pending | processing | ready | failed
  error_message TEXT,
  meta_json TEXT DEFAULT '{}',       -- 加密
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX images_user_created ON generated_images(user_id, created_at DESC);
CREATE INDEX images_status ON images(status);
```

### 3.6 jobs — 异步任务（修正：增加 user_id）
```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                -- music | image | cover | lyrics
  status TEXT NOT NULL DEFAULT 'queued', -- queued | processing | done | error
  progress TEXT DEFAULT '',
  song_id TEXT REFERENCES songs(id),
  image_id TEXT REFERENCES generated_images(id),
  error_message TEXT,
  payload_json TEXT DEFAULT '{}',    -- 加密
  result_json TEXT,                  -- 加密
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX jobs_user_status ON jobs(user_id, status);
CREATE INDEX jobs_song_idx ON jobs(song_id);
CREATE INDEX jobs_image_idx ON jobs(image_id);
CREATE INDEX jobs_status ON jobs(status);
```

### 3.7 generations — 生成记录（审计/统计用）
```sql
CREATE TABLE generations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                -- music | image | lyrics | cover
  prompt TEXT,                       -- 加密
  result_type TEXT,                  -- song | image（指向对应表）
  result_id TEXT,                    -- 对应 songs.id 或 generated_images.id
  model TEXT NOT NULL,
  credits_used INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX generations_user_idx ON generations(user_id, created_at DESC);
```

---

## 4. 核心流程设计

### 4.1 注册/登录流程

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌────────┐
│ 前端    │     │ Firebase │     │  CF API  │     │  D1    │
└────┬────┘     └────┬─────┘     └────┬─────┘     └───┬────┘
     │               │                │                │
     │ 1. signInWithEmail/Google      │                │
     │──────────────>│                │                │
     │               │                │                │
     │ 2. Firebase User + ID Token    │                │
     │<──────────────│                │                │
     │               │                │                │
     │ 3. POST /api/auth/sync         │                │
     │   Authorization: Bearer <token>│                │
     │────────────────────────────────>│               │
     │               │                │                │
     │               │ 4. verifyToken │                │
     │               │<───────────────│                │
     │               │                │                │
     │               │ 5. UID + email │                │
     │               │───────────────>│                │
     │               │                │                │
     │               │                │ 6. INSERT/UPDATE users
     │               │                │ 7. INSERT subscriptions (free)
     │               │                │────────────────>
     │               │                │                │
     │               │                │ 8. user profile
     │               │                │<────────────────
     │ 9. { user, subscription }      │                │
     │<────────────────────────────────│               │
     │               │                │                │
```

**关键设计**：
- 前端 Firebase 登录后，立即调用 `POST /api/auth/sync` 同步用户到 D1
- 后端用 Firebase Admin SDK（或 JWKS 公钥）验证 ID Token
- 新用户自动创建 `subscriptions` 记录（plan=free, credits=-1 无限）
- 登录态靠 Firebase SDK 管理，后端每次请求验证 Token

### 4.2 Token 验证中间件

```typescript
// server/middleware/01-auth.ts
export default defineEventHandler(async (event) => {
  // 白名单路径
  const publicPaths = ['/api/auth', '/api/plans', '/api/robots', '/api/sitemap']
  if (publicPaths.some(p => event.path.startsWith(p))) return
  
  // 提取 Token
  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) throw createError({ statusCode: 401 })
  
  // 验证 Firebase Token（使用公钥缓存）
  const decoded = await verifyFirebaseToken(token)
  if (!decoded) throw createError({ statusCode: 401 })
  
  // 注入用户上下文
  event.context.auth = {
    uid: decoded.uid,
    email: decoded.email,
  }
})
```

### 4.3 音乐生成流程

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌────────┐     ┌──────────┐
│ 前端    │     │  CF API  │     │ MiniMax  │     │  D1    │     │   R2    │
└────┬────┘     └────┬─────┘     └────┬─────┘     └───┬────┘     └────┬────┘
     │               │                │                │               │
     │ 1. POST /api/music/generate    │                │               │
     │   { prompt, lyrics, model }    │                │               │
     │   Authorization: Bearer <token>│                │               │
     │──────────────>│                │                │               │
     │               │                │                │               │
     │               │ 2. 验证 Token → 获取 uid        │               │
     │               │ 3. checkQuota(free, music)      │               │
     │               │ 4. INSERT songs (status=processing)             │
     │               │ 5. INSERT jobs (type=music)     │               │
     │               │────────────────>               │               │
     │               │                │                │               │
     │ 6. { jobId, songId, status: "processing" }     │               │
     │<──────────────│                │                │               │
     │               │                │                │               │
     │               │ 7. POST /v1/music_generation    │               │
     │               │   { prompt, lyrics }            │               │
     │               │────────────────>               │               │
     │               │                │                │               │
     │ 8. 轮询 /api/jobs/:jobId        │                │               │
     │──────────────>│                │                │               │
     │               │                │                │               │
     │               │ 9. 返回 audio_url              │               │
     │               │<────────────────               │               │
     │               │                │                │               │
     │               │ 10. fetch(audio_url) → Blob     │               │
     │               │───────────────────────────────────────────────>│
     │               │                │                │               │
     │               │ 11. writeFile('audio', filename, blob)         │
     │               │───────────────────────────────────────────────>│
     │               │                │                │               │
     │               │ 12. UPDATE songs SET status=ready, audio_path   │
     │               │ 13. UPDATE jobs SET status=done, result_json    │
     │               │ 14. INSERT generations                          │
     │               │────────────────>               │               │
     │               │                │                │               │
     │ 15. SSE/poll → status=ready, audioUrl            │               │
     │<──────────────│                │                │               │
     │               │                │                │               │
```

### 4.4 图片生成流程

类似音乐生成，区别：
- 调用 `POST /v1/image_generation`
- 返回 `image_urls` 或 `image_base64`
- 下载到 R2 的 `images/` 目录
- 写 `generated_images` 表

### 4.5 用户资产查询流程

```
前端 → GET /api/songs?page=1&limit=20
     → Authorization: Bearer <token>
     → 后端验证 token → 获取 uid
     → SELECT * FROM songs WHERE user_id=? ORDER BY created_at DESC
     → 每条记录生成签名 URL（audioUrl, coverUrl）
     → 返回 { songs: [...], total, page }
```

### 4.6 下载/播放流程

```
前端 → GET /api/songs/:id 获取歌曲信息（含 downloadUrl）
     → downloadUrl = /api/audio/:id?token=<signed_token>
     → GET /api/audio/:id?token=xxx
     → 后端验证签名 → 从 R2 读取文件
     → 返回 ReadableStream + Content-Disposition: attachment
```

---

## 5. API 设计

### 5.1 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/sync` | Firebase 登录后同步用户到 D1 |
| GET | `/api/auth/me` | 获取当前用户信息 + 订阅 |

### 5.2 音乐

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/music/generate` | 提交音乐生成任务 |
| GET | `/api/songs` | 获取当前用户的歌曲列表 |
| GET | `/api/songs/:id` | 获取单首歌曲详情 |
| DELETE | `/api/songs/:id` | 删除歌曲 + R2 文件 |
| POST | `/api/songs/:id/regenerate` | 重新生成 |
| POST | `/api/songs/:id/versions` | 创建版本 |

### 5.3 图片

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/image/generate` | 提交图片生成任务 |
| GET | `/api/images` | 获取当前用户的图片列表 |
| GET | `/api/images/:id` | 获取单张图片详情 |
| DELETE | `/api/images/:id` | 删除图片 + R2 文件 |
| POST | `/api/images/:id/regenerate` | 重新生成 |

### 5.4 文件服务

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/audio/:id` | 流式播放/下载音频 |
| GET | `/api/cover-art/:id` | 获取封面图 |
| GET | `/api/images/:id/file` | 流式获取图片文件 |

### 5.5 任务

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/jobs/:id` | 查询任务状态 |
| GET | `/api/jobs/:id/events` | SSE 实时推送任务进度 |

### 5.6 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/subscriptions/plans` | 获取订阅计划列表（公开） |
| POST | `/api/subscriptions/create` | 创建订阅（预留） |
| POST | `/api/upload` | 上传文件到 R2 |

---

## 6. 前端状态管理

### 6.1 Composables

```typescript
// composables/useAuth.ts
// - Firebase 登录/注册/登出
// - 登录后自动调 /api/auth/sync
// - 提供 user, loading, authReady

// composables/useAuthModal.ts
// - 控制登录弹窗开关

// composables/useRequireAuth.ts
// - 按钮级鉴权，未登录弹出登录框

// composables/useJobStream.ts
// - SSE 监听任务进度

// composables/useLibrary.ts
// - 用户资产列表（歌曲/图片）
// - 分页、删除、重新生成
```

### 6.2 关键页面流程

```
/create (生成页)
  → 填写 prompt → 点击生成
  → useRequireAuth() 检查登录
  → 调 POST /api/music/generate 或 /api/image/generate
  → 获取 jobId → 跳 /library 或显示进度
  → SSE 监听完成 → 显示结果

/library (资产页)
  → 加载时调 GET /api/songs + GET /api/images
  → 展示卡片列表
  → 点击播放/下载
  → 删除按钮调 DELETE API

/dashboard (仪表盘)
  → 调 GET /api/auth/me 获取用户信息
  → 调 GET /api/songs?limit=5 获取最近作品
  → 展示统计数据
```

---

## 7. 安全设计

### 7.1 认证安全
- Firebase ID Token 验证（JWKS 公钥，带缓存）
- Token 过期由 Firebase SDK 自动刷新
- 每个 API 请求都验证 Token 并注入 uid

### 7.2 数据隔离
- 所有查询必须带 `WHERE user_id=?`
- 删除操作先验证所有权
- 文件服务验证签名 URL（15 分钟有效期）

### 7.3 数据加密
- 敏感字段（prompt, lyrics, meta）AES-GCM 加密存 D1
- 密钥来自 `ENCRYPTION_MASTER_KEY`
- R2 文件路径不暴露，通过签名 URL 访问

### 7.4 防滥用
- 免费用户有月度额度限制（可配置）
- 生成请求频率限制（KV 计数）
- 文件大小限制（上传 ≤ 10MB）

---

## 8. 改动清单

### 数据库
- [ ] 新建 migration `0002_add_user_id.sql`（给 songs/images/jobs 加 user_id）
- [ ] 删除旧的 `generations` 表（改为新的设计）
- [ ] 更新 `subscriptions` 表（credits_remaining = -1 表示无限）

### 后端
- [ ] 新建 `server/middleware/01-auth.ts`（Firebase Token 验证）
- [ ] 新建 `server/utils/firebase-verify.ts`（JWKS 公钥验证）
- [ ] 新建 `server/api/auth/sync.post.ts`（用户同步）
- [ ] 修改 `server/api/auth/me.get.ts`（返回真实用户数据）
- [ ] 重写 `server/api/music/generate.post.ts`（实际调用 MiniMax）
- [ ] 重写 `server/api/image/generate.post.ts`（实际调用 MiniMax）
- [ ] 修改 `server/utils/jobs.ts`（所有查询加 user_id 过滤）
- [ ] 修改 `server/utils/images.ts`（所有查询加 user_id 过滤）
- [ ] 新增 `server/api/audio/[id].get.ts` 中生成签名 URL
- [ ] 移除或简化请求签名中间件（改用 Token 验证）

### 前端
- [ ] 修改 `useAuth.ts`（登录后调 /api/auth/sync）
- [ ] 修改 `useAuthModal.ts`（同步后刷新用户状态）
- [ ] 修改 `pages/library.vue`（接通真实 API）
- [ ] 修改 `pages/dashboard.vue`（接通真实 API）
- [ ] 修改 `pages/create.vue`（接通真实生成 API）
- [ ] 修改 `pages/image.vue`（接通真实生成 API）
- [ ] 修改 `pages/cover.vue`（接通真实生成 API）
- [ ] 所有 API 请求添加 Authorization Header
- [ ] 修改 `layouts/default.vue`（根据登录态显示用户信息）

### 配置
- [ ] 更新 `.env`（填入生成的密钥和 MiniMax Key）
- [ ] 更新 `wrangler.toml`（添加 secrets 配置）
- [ ] 更新 `nuxt.config.ts`（Firebase 配置使用 env fallback）
