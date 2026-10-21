# 新用户使用流程（现状梳理）

> Create Keepsakes · `create.yozzytools.com`
> 最后更新：2026-10-21（对应 `test` 分支）
> 代码真相源：`pages/cards.vue`（向导）、`components/auth/AuthModal.vue`（登录）、
> `utils/pricing.ts`（价格与额度）、`server/utils/daily-usage.ts`（服务端额度闸门）

---

## 0. 一句话总结

**新用户可以免费走完整流程，但必须先注册 —— 注册闸门在最后一步（点「生成」那一刻），
不是进门就拦。** 走完拿到的是**带水印的 1024px 预览图**；能印的 2K 无水印版本要付费。

---

## 1. 入口：用户从哪进来

| 入口 | 页面 | 特征 |
|---|---|---|
| 自然搜索 | `/for/mum` `/for/dad` `/for/grandma` `/for/grandpa` `/for/friend` `/for/partner` `/for/teacher` `/for/pet` | 8 个「给谁做」的 SEO 落地页，各自带 FAQ + FAQPage 结构化数据 |
| 品牌/直接访问 | `/` | 首页：示例图 + FAQ + CTA |
| 内容 | `/blog` `/gallery` | 博客、公开画廊（`/api/gallery` 是公开的） |
| 直接干活 | `/cards` | 直接进向导 |

> 所有入口最终都汇到 **`/cards` 向导**这一条主路径上。

---

## 2. 主流程：三步向导（`/cards`）

```
① 选场合  →  ② 传照片 + 写名字  →  ③ 选画风 → 点生成  →  ④ 挑一张 → 加字 → 下载
                                                              ↑
                                              未登录在这里被拦（弹登录框）
```

### 步骤 1 · The occasion（选场合）
- 分组 tab：生日 / 感谢 / 节日…（`utils/imageScenarios.ts`）
- 选完决定画什么（场合 → 场景 → 画风）
- 可以从 `/cards?scenario=birthday` 直接带场景进来（SEO 入口用）
- 底部有 `Continue`，步骤写在 URL `?step=2`，刷新/后退不丢

### 步骤 2 · Photo & name（照片 + 名字）
- 传照片（可选）：支持「没有照片？用我们的一张」→ 走 `/api/image/samples`
- 写收卡人的名字 + 一句补充（"loves gardening…"）
- ⚠️ 传照片这步**不用登录**就能走完

### 步骤 3 · Style & make（画风 + 生成）
- 选画风（有参考图时只给 i2i 安全画风，强画风会改写主体特征）
- 底部按钮：`Make birthday card`（按钮上直接写还剩几张）

---

## 3. 登录闸门：注册发生在**最后一步**

点「Make card」→ 服务端 `/api/image/generate` 返回 **401** → 弹**全站共用的登录弹窗**。

| 项 | 现在的样子 |
|---|---|
| 弹窗 | `components/auth/AuthModal.vue`（顶栏 / 侧栏共用同一套） |
| 标题 | 注册态 "Keep your cards in one place" / 登录态 "Welcome back" |
| 上下文说明 | "Create an account or sign in — everything you have already entered is kept." |
| 切换方式 | **只有底部那行链接**（顶部的 Sign in / Create an account 标签页已删） |
| 登录/注册成功后 | **自动接着出图**（`useAuthModal` 的 `afterAuth` 回调），不用再点一次「Make card」 |
| 填好的内容 | 照片、名字、画风都还在页面上，不会丢 |

> 弹窗长这样：logo → 标题 → 副标题 → 说明 → Google 登录 → 邮箱密码 → 🔒 Privacy Policy → 切换链接

---

## 4. 出图之后

| 步骤 | 做了什么 |
|---|---|
| 出图 | 一次出 **1–4 张**（取 `min(4, 今天剩余额度)`，至少 1 张） |
| 挑一张 | 第 4 步「Pick the one you like」，可以随时 `Try again` |
| 写字 | 预置贺词 + `Write it for me`（AI 写） |
| 排版 | `CardComposer`：加 Message / Name / Signature，可拖位置、改字号颜色、选打印尺寸（5×7 / 4×6 / A6） |
| 下载 | 免费：**1024px + 小水印**；付费：**2K 无水印 + 300 DPI 打印规格**（5×7 / 4×6 / A6，装饰画 16×20 / A3） |
| 存档 | `My cards`（`/my-cards`）随时能再下载；点某张 → `/cards?from=<id>` 继续改（2026-10-21 修好，以前这个参数没人读，点进去只是开新卡） |

---

## 5. 免费额度与付费（服务端强制，客户端只是显示）

| | 免费 | 单张 $6.99 | 月付 $19.99（5 张） | 买断 $59.99（20 张） |
|---|---|---|---|---|
| 每天免费出图 | 邮箱未验证 **1 张** / 已验证 **2 张** | — | — | — |
| 图片额度 | 每日重置 | 1 张 | 5 张/月 | 20 张，不过期 |
| 下载 | 1024px + 水印 | 2K 无水印 300DPI | 同左 | 同左 |
| 音乐 / 文案 | 1 首 / 3 条每天 | 5 首 / 50 条每天 | 同左 | 同左 |

- **额度在服务端扣**（`server/utils/daily-usage.ts`），按**实际出图张数**扣，不是按请求数
- DB 不可用 → **直接拒绝（503）**，不降级放行
- 额度用完 → 页面出现升级引导 → `/pricing` → PayPal（一次性 Order / 订阅 Plan）
- 付费点不是「次数」，是**打印规格**（无水印 + 2K + 300 DPI）→ 免费额度再高也换不走能印的成品

---

## 6. 登录之后的样子

- 顶栏变成 **头像 + 名字**（Google 头像，没有就取名字首字母；名字取 `displayName`，
  没有就用邮箱 `@` 前那段），点开是菜单：`My cards` / `Sign out`
- 移动端汉堡菜单里也有账号入口（**以前移动端登不出去**，2026-10-21 补上）
- 深色工作台（`/dashboard` `/image` `/create` `/cover` `/music-library`）侧栏用同一套账号菜单

---

## 7. 已知卡点（按影响排序）

1. **邮箱验证的提示只在工作台布局里**
   `EmailVerificationGuard` 只挂在 `layouts/default.vue`。
   营销页（`/cards` 等）的新用户注册后**看不到「去验证邮箱」** →
   一直卡在「未验证」的 1 张/天（已验证是 2 张/天）。
   → 要么把守卫也挂到营销布局，要么在下载/额度用完时提示。

2. **注册发生在最后一步，前面所有输入都白填的风险**
   现在靠「Everything you have already entered is kept」+ 登录后自动继续来兜。
   但**关掉弹窗再回来，页面的场景/名字还在（同一个页面内）**；
   **刷新页面就丢**（状态在内存里，没存草稿）。
   → 中途离开（比如去查邮箱）回来要从头选。

3. **没有「保存草稿」**：`/cards` 的中间状态只在内存。
   移动端切后台被杀掉 → 前面两步白做。

4. **「My cards」里存的是原图，不带用户写的字**
   文字是下载时在浏览器里合成的，服务端只存了模型出的那张图。
   → 从 My cards 打开一张旧卡，能改字、能再下载，但**原来写的字没了**，得重写一遍。
   → 想让「My cards」真的能复用，要么把排版存服务端，要么把合成后的成品也存一份。

5. **免费用户下载的是预览图**（1024px + 水印）。下载按钮旁边写了
   "The free download is 1024 px with a small mark."，但**没给升级入口**
   —— 用户在这一步最想买的时候没有 CTA。

6. **新用户看不到「今天还剩几张」**
   未登录时额度信息读不出来（`/api/user/usage` 401），
   底部只显示「Free to preview. Only pay when it is right.」。
   登录之后才会显示真实剩余额度（登录成功会自动刷新）。

---

## 8. 相关文件速查

| 文件 | 作用 |
|---|---|
| `pages/cards.vue` | 三步向导 + 登录闸门 + 出图 + 打开旧卡（`?from=`） |
| `components/auth/AuthModal.vue` | 登录/注册弹窗（顶栏、侧栏共用） |
| `components/ui/UserMenu.vue` | 登录后的账号菜单（头像 + 登出） |
| `composables/useAuthModal.ts` | 弹窗共享状态：`note` / `afterAuth`（登录后自动继续出图） |
| `composables/useAuth.ts` | Firebase 登录态、注册、登出、邮箱验证 |
| `utils/pricing.ts` | **价格与额度的唯一真相源** |
| `server/utils/daily-usage.ts` | 服务端额度闸门（先扣后判、拒绝退卡） |
| `server/middleware/auth.ts` | 哪些 API 要登录（`/api/image/generate`、`/api/images` 要） |
| `utils/imageScenarios.ts` | 场合 → 场景 → 画风 → 预置贺词 |
| `scripts/check-cards-auth.mjs` | 登录闸门的行为验收（可跑本地/线上） |
| `scripts/check-usermenu.mjs` | 账号菜单的行为验收 |
| `scripts/check-faq.mjs` | FAQ 手风琴的行为验收 |
| `scripts/check-card-reopen.mjs` | 「从 My cards 打开旧卡」的行为验收 |
