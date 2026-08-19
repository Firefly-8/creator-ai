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
