# AI Constraints & Workflow Rules

## Deployment Policy

**ALL changes MUST be pushed to the test/staging environment first.**

- Default branch for development: `test`
- Production branch: `master` — **DO NOT push/merge to master unless explicitly instructed**
- Staging URL: https://staging.creator.yozzytools.com
- Production URL: https://creator.yozzytools.com

### Workflow
1. Make changes locally
2. Push to `test` branch → auto-deploys to staging
3. Verify on staging
4. Only when user explicitly says "merge to production" → merge test → master

## Version Numbering

Current version: **1.0.0**

Rules:
- Format: `MAJOR.MINOR.PATCH`
- MAJOR: Breaking changes or major feature releases
- MINOR: New features, significant changes
- PATCH: Bug fixes, minor updates
- Update version in `package.json` when releasing

## Environment Variables

**Important**: CF Pages `deployment_configs.env_vars` are RUNTIME variables (injected into Pages Functions), NOT build-time variables.

For client-side env vars (like Firebase config), use fallback values in `nuxt.config.ts`:
```ts
firebaseApiKey: process.env.FIREBASE_API_KEY || 'fallback_value'
```

## Project Structure

- Nuxt 3 + Cloudflare Pages preset
- Build output: `dist/` directory
- srcDir: root (not `app/`)
- Firebase for auth
- better-auth for session management

---

## 关键依赖版本（2026-08-17 更新）

| 包 | 版本 | 说明 |
|---|---|---|
| nuxt | 3.21.11 | 必须为此版本，不要升级或降级 |
| @nuxtjs/i18n | 8.5.6 | Nuxt 3 兼容版本，v10 需要 Nuxt 4 |
| unhead | 2.1.17 | Nuxt 3.21.11 内置版本 |

## 已知问题与修复

### 1. i18n v8 的 unhead 导入
`@nuxtjs/i18n` v8.5.6 导入 `getActiveHead` 从 `unhead`，但 unhead v2 中该函数在 `unhead/legacy` 中。
已通过 `postinstall` 脚本自动修复：`package.json` 中的 `postinstall` 脚本会 patch `node_modules/@nuxtjs/i18n/dist/runtime/composables/index.js`。

### 2. Nitro minify 导致 SSR 崩溃
Nitro 的 minify（esbuild）会导致生产构建 SSR 渲染失败（`p9 is not a function`）。
修复：`nuxt.config.ts` 中设置 `nitro.minify: false`。

### 3. $t 在 script setup 中的用法
i18n v8 不会通过 `useNuxtApp().$t` 暴露 `$t`。
正确用法：`const { t: $t } = useI18n()`

### 4. locale 文件格式
i18n v8 使用 `{ variable }` 插值语法，不是 `{{ variable }}`。

### 5. 关键插件不能删除
以下插件是应用运行的基础：
- `plugins/firebase.client.ts` — Firebase 初始化
- `plugins/api-client.ts` — API 认证注入
- `plugins/admin-redirect.ts` — 后台域名跳转

## 构建命令

```bash
# 本地开发
npx nuxt dev --port 5175

# 生产构建
npm run build

# 本地预览生产构建
npx wrangler pages dev dist --port 5175
```


---

## Cloudflare Pages 项目管理（API 配置）

> **重要**：CF Pages 的项目配置（deployment_configs）需要通过 Cloudflare API 修改，wrangler.toml 仅用于本地开发。

### API 访问方式

通过 Cloudflare API 管理 Pages 项目配置：

```bash
# 获取项目配置
curl -s -H "Authorization: Bearer $CF_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/9fb668990196a42386f3544fa69d5b76/pages/projects/PROJECT_NAME"

# 更新 deployment_configs（必须包含完整的 production 和 preview 配置）
curl -s -X PATCH -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/accounts/9fb668990196a42386f3544fa69d5b76/pages/projects/PROJECT_NAME" \
  -d '{"deployment_configs": {...}}'

# 触发部署
curl -s -X POST -H "Authorization: Bearer $CF_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/9fb668990196a42386f3544fa69d5b76/pages/projects/PROJECT_NAME/deployments"
```

### 测试环境（craftai-staging）正确配置

| 配置项 | 值 |
|--------|-----|
| D1 数据库 | `8e812571-57b0-4232-bfc4-13264dc9e420` (craftai-db-staging) |
| KV 命名空间 | `4ebb1e030d274e2dbf35ab559d602649` |
| R2 存储桶 | craftai-storage |
| compatibility_date | 2025-01-01 |
| compatibility_flags | `nodejs_compat` |

### 生产环境（craftai）正确配置

| 配置项 | 值 |
|--------|-----|
| D1 数据库 | `bb60e6ae-597c-4cd7-a958-46942f5dffec` (craftai-db) |
| KV 命名空间 | `910cd6d2350548e2a662098ca1e910ba` |
| R2 存储桶 | craftai-storage |
| compatibility_date | 2025-06-01 |

### 常见配置陷阱

1. **D1 绑定指向错误数据库**：测试环境误绑生产库会导致数据混乱
2. **缺少 nodejs_compat**：Web Crypto API 外的大多数 Node.js 模块需要此标志
3. **更新配置后必须重新部署**：仅 push 代码不会触发配置更新
4. **API 更新会覆盖所有 env_vars**：PATCH 请求必须包含完整的环境变量列表

---

## 管理后台（Admin）

### 访问地址
- 生产：https://admin.yozzytools.com
- 测试：https://staging.creator.yozzytools.com/admin

### 认证方式
- PBKDF2-SHA256 密码哈希（Web Crypto API）
- Session token 存储在 cookie `admin_session`

### 默认账号

| 用户名 | 密码 | 显示名 |
|--------|------|--------|
| admin | admin123 | Administrator |

### 安全注意事项
- `server/utils/admin/auth.ts` 中的 `importKey` 必须使用**密码**作为 key material
- 2026-08-19 修复：之前错误地使用静态字符串+salt，导致任意密码都能通过验证

---

## 2026-08-19 修复记录

### SSR 500 修复
1. 修复 7 文件中损坏的 import 引号：多余双引号包裹路径
2. 修复 `db-runtime.ts` 函数签名语法错误（缺少 `)` 和返回类型）
3. 修正 `server/api/admin/` 下文件的相对路径层级（`../../` → `../../../`）

### Admin 密码验证安全漏洞
- **问题**：`verifyPassword` 中 `importKey` 使用静态字符串而非密码，导致任意密码都能登录
- **修复**：将密码作为 `crypto.subtle.importKey` 的 key material
- **影响**：所有已有密码哈希无效，需重新生成并更新数据库

### 测试环境配置修复
- **问题**：craftai-staging 项目 D1 绑定指向生产库，缺少 nodejs_compat
- **修复**：通过 CF API 更新 deployment_configs

---

## 推送前检查流程（必须执行）

**每次推送前必须运行 `bash scripts/pre-push-check.sh`，通过后才允许推送。**

检查项：
1. **构建检查** — `npm run build` 必须通过
2. **SSR 渲染检查** — 本地 wrangler 预览首页必须返回 HTTP 200（不是 500）
3. **插件上下文检查** — async 插件中不得调用 composable（useI18n/useCookie/useAuthModal 等）
4. **i18n key 检查** — 模板中使用的 key 必须存在于 en.json

### 常见陷阱（已踩坑记录）

| 陷阱 | 原因 | 修复 |
|------|------|------|
| `useI18n()` 在 async 插件中报错 | async 破坏 setup 上下文 | 移除 async 或用 nuxtApp.$i18n |
| `localePath is not a function` | useI18n() 不返回 localePath | 使用 `useLocalePath()` composable |
| SSR 500 `"message":"26"` | i18n 插件冲突 | 移除自定义 locale 同步，依赖内置 cookie 检测 |
| staging 500 | CF Pages 配置被覆盖（D1/KV 指向生产） | 推送后检查 CF API 配置 |
| auth 401 循环 | token 未刷新 | `getIdToken(true)` 强制刷新 |

### 推送流程
1. 完成代码修改
2. 运行 `bash scripts/pre-push-check.sh`
3. 确认所有检查通过
4. 告知用户变更摘要
5. 等待用户确认"推送"
6. 执行 git push
7. 验证 staging 环境（curl -I https://staging.creator.yozzytools.com）

---

## 静态资源约定（2026-10-20 起）⚠️

**静态资源（字体 / 品牌成品图 / 样例图 / 社交图）不放 `public/`，一律走 R2 直链。**

| 项 | 值 |
|---|---|
| 公开桶 | `craftai-assets`（**独立于私有桶 `craftai-storage`**） |
| 域名 | `https://assets.yozzytools.com`（R2 自定义域） |
| 常量 | `utils/assets.ts` → `ASSET_BASE` / `assetUrl()` |
| 目录 | `fonts/` `showcase/` `samples/` `source/` `og-image.jpg` |
| CORS | 桶级规则 `Access-Control-Allow-Origin: *`（**跨域 @font-face 必须有**） |
| 缓存 | 字体 `max-age=31536000, immutable`；图片 `max-age=604800` |

**为什么**：
1. 放进应用包 → 每次部署重传 3.3MB，占 Pages 文件配额
2. 这些资源跨环境共享（与生产/预发布无关），只需上传一次
3. R2 可单独配 cache-control 和 CORS

**⚠️ 绝对不能**把用户生成的内容放进 `craftai-assets`（那是公开桶）——
用户图片只在私有桶 `craftai-storage`。

**例外：应用图标类资源留在 `public/`**（`logo.png` / `logo-512.png` / `favicon.ico`）。
favicon 必须同源才可靠，logo 要被 `og:image` 和导航栏引用，体积只有几十 KB ——
这类属于「应用本身」，不属于「内容资源」。

**改文案/换图后的重建流程**：
```bash
node scripts/build-assets.mjs         # 底图 → 叠排版 → WebP → 上传 showcase/
node scripts/build-static-assets.mjs  # 字体实例化 + 样例 + 社交图 → 上传
```
两个脚本都支持 `--dry-run`（只构建到 `.assets/` 不上传）。
底图（无文字的生成图）在 R2 的 `source/` 下，仓库不存。

**换 R2 域名时**要同时改三处：`utils/assets.ts`、
`assets/css/brand-fonts.css`（@font-face 的 url() 里不能用 CSS 变量，只能写死）、
`pages/index.vue` 的 preload link。

---

## 成品卡片排版规范（2026-10-20）

**图上字下**。详见 `docs/implementation-notes-cards.md`，关键三条：
1. **模型一个字都不许画** —— prompt 自动带 `NO_TEXT_CLAUSE`（实测会写出 "Happy 70th Runthdscket"）
2. 有参考图（i2i）时只给 `i2iSafe` 画风（强画风会改写主体特征）
3. sharp 合成：`text` 无 `size` 参数（靠 `dpi = 字号 × 6`），**不能同时给 width 和 height**

---

## ⚠️ 三个让排查绕远路的坑（2026-10-20 全部踩过）

### 1. `useI18n()` 的 `t` 在客户端可能不是函数
Nuxt 的 auto-import 把 `useI18n` 解析到了 **vue-i18n 原始实现**
（`.nuxt/imports.d.ts`），不是 @nuxtjs/i18n 的 runtime 包装版。
原始版在客户端、尤其在**自动导入的 UI 组件**里拿不到 provide 的 i18n instance，
返回的 `t` 不是函数 → 组件一渲染就抛 `n.t is not a function` → **整页 500**。

- **SSR 完全正常**，只在 hydration 后炸 ⇒ 极难查
- `error.vue` 的 h1 是**硬编码的 "404"**，看起来像路由 404，实际 statusCode 是 500
- ✅ 一律用 `composables/useT.ts`（内部走 `useNuxtApp().$i18n.t`，全局 composer，一定可靠）
- ❌ 不要在 `components/ui/*` 这类自动导入组件里用 `useI18n().t`

### 2. 改 `.vue` 的 style 块时别用 `str.replace("</style>", ...)`
Python 的 `str.replace` 会**替换所有出现**，把文件里唯一的 `</style>` 换掉 →
原有 style 块没闭合 → 后面的 `<script setup>` 全被当成 CSS → 组件脚本不执行 → 500。
**用带锚点的正则或按行插入。** 已有 `tests/nuxt-templates.test.ts` 守住标签配对。

### 3. `useHead()` 只能在 setup 顶层调用
它依赖 `inject` 拿 head 实例，写在 `onMounted` 回调里同样会炸。

---

## 🔍 验证 prod 行为：跑构建产物，别等部署

```bash
npm run cf:build
npx wrangler pages dev dist --port 3222 --ip 127.0.0.1
# 然后用 playwright 访问 http://127.0.0.1:3222/<route>
```
**为什么重要**：`nuxt dev` 正常、prod bundle 炸的情况很常见
（auto-import 解析、minify、tree-shaking 只在 build 产物里才现形）。
跑产物 1 分钟就能复现，比 push + 等部署 + 等 CDN 缓存快 5 分钟以上。

配套工具：
- `scripts/audit-pages.mjs` —— 逐页截图 + 提取风格信号（背景色/是否新风格/标题）
- `scripts/shot-auth-modal.mjs` —— 弹窗类组件的截图验收
