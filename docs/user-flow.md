# 新用户使用流程（现状梳理）

> Create Keepsakes · `create.yozzytools.com` / staging `staging.creator.yozzytools.com`  
> **最后更新：2026-11-23（P0 保存/导出语义）** · 代码基点 `origin/test` `e7c9928` + 本轮 P0  
> 真相源：`pages/cards.vue`、`components/cards/CardComposer.vue`、`composables/useCardDraft.ts`、  
> `utils/pricing.ts`、`server/utils/daily-usage.ts`

---

## 0. 一句话总结

**可以匿名打开参数弹窗填场合/名字/画风；点「生成」才要求登录。**  
AI 出图有成本（注册累计 **3 次**免费生成，用完为止）。  
出图后可在画布上改字、选版式、拖位置；**保存（Keep）与下载/分享（Take）分开**。  
免费拿走的是 **1024px + 小水印**；去水印 / 2K / 300 DPI 才是付费点。

---

## 1. 入口

| 入口 | 页面 | 特征 |
|---|---|---|
| 自然搜索 | `/for/mum` 等 8 个 SEO 落地页 | CTA → `/cards?scenario=…&for=…&format=card` |
| 首页 | `/` | Invitation → `?format=invite`；Greeting card → `?format=card` |
| 直接干活 | `/cards` | 参数弹窗一步到位（无三步向导） |

格式由入口 URL 决定（`utils/cardFormats.ts`），弹窗内不可切换。

---

## 2. 主流程（连续遮罩工作区）

详见 `docs/gi-ux-adoption.md` · `docs/cards-api-mapping.md`。

```
落地页 CTA / 深链接
  → /cards?format=&scenario=（落地即开工作区，可匿名）
  → phase=params：场合 / 名字 / 详情 / 画风 / 可选照片
  → 点生成 → phase=generating（同遮罩）
       未登录 401 → AuthModal（afterAuth 续跑；表单保留）
  → phase=editor：候选 + CardComposer（改字/版式/主题色/Undo·Redo）
       「Details」可回参数相且不丢内容
  → Keep：自动存排版 + Finish；Take：带水印下载 / Share / Print / PDF
  → /image 默认 302→/cards；?legacy=1 保留旧台
```

旧 `?step=` 链接被忽略。本地草稿 `craftai_card_draft_v1`（含 format + 照片缩略图）防刷新丢失；  
`/cards?from=<id>` **优先于**本地草稿，从 My creations 重开旧卡。

---

## 3. 登录闸门

| 项 | 现状 |
|---|---|
| 时机 | 点生成 → `/api/image/generate` **401**（不是进门、也不是点 Download） |
| 弹窗 | `AuthModal` + note「everything you have already entered is kept」 |
| 回跳 | `afterAuth` → `loadUsage` + `generate`；表单保持打开 |
| 失败 | 非 401 错误只显示 `genError`，**不关弹窗**，输入保留 |

上传参考图也需登录；未登录上传 401 时降级为 t2i，不阻断。

---

## 4. 保存 vs 导出（P0）

| 动作 | 含义 | UI |
|---|---|---|
| 自动保存排版 | `PUT /api/images/:id/card`（版式+文字位置），防抖 2.5s | Keep 区状态：dirty / saving / saved / error |
| Finish & save | 客户端合成成品图 → `POST …/finalize` → 草稿变作品，更新分享页 | Keep 区主按钮；改后再 Finish 可更新 |
| Download free | 1024px + 水印 JPEG | Take 区；按钮文案标明 with mark |
| Download print | 规格尺寸、无水印（需付费权益） | 已付费时同一按钮变「Download print file」 |
| Remove watermark | 跳 `/pricing`（不改本轮计价） | Take 区权限条，非阻断弹窗 |
| Share / Print / PDF / Email | 与下载同口径（免费含水印） | Take 区次要出口 |

**没有**单独的「Save draft」按钮（避免和自动保存 / Finish 重复）。

---

## 5. 额度与付费（服务端强制）

| | Free | One card $6.99 | Monthly $19.99 | Pack $59.99 |
|---|---|---|---|---|
| 图片生成 | 累计 **3 次**（不按天重置） | 1 credit | 200 credits/月 | 20 credits |
| 下载 | 1024 + 水印 | 2K 无水印 300DPI | 同左 | 同左 |
| 音乐/文案 | 仍按日额度 | — | — | — |

真相源：`utils/pricing.ts`（`LIFETIME_SENTINEL`）+ `server/utils/daily-usage.ts`。  
一次生成固定 **1 张**。

---

## 6. 资产与分享

- `/my-assets`：Finished（永久）/ Draft（3 天）；`/my-cards` 301 跳转至此  
- 重开：`/cards?from=<id>`（回填 format / 名字 / 留言 / 版式 / 文字位置）  
- 分享：`/card/:id` 免登录；需 Finish 后分享页才显示带字成品  
- 删除有；**rename 首轮未做**

---

## 7. 已知边界（本轮不做）

- 无 GI 式模板库 / 富文本 / 贴纸 / UndoRedo / 主题色 / 照片蒙版裁剪  
- 无 GIF / RSVP / 实物印刷结算  
- 邮箱验证提示仍主要在工作台布局  
- 移动端与真实付费生成需运行验收（本轮用 mock / 契约测试）

---

## 8. 相关文件

| 文件 | 作用 |
|---|---|
| `pages/cards.vue` | 弹窗参数 + 登录闸 + 出图 + 草稿 + `?from=` + metaSaveStatus |
| `components/cards/CardComposer.vue` | Keep / Take 分区、Finish、导出权限条、PDF/打印 |
| `composables/useCardCanvas.ts` | Canvas 预览/导出/水印 |
| `composables/useCardDraft.ts` | localStorage 草稿 |
| `utils/cardFormats.ts` / `cardLayouts.ts` / `cardSpecs.ts` | 格式、版式、打印尺寸 |
| `components/auth/AuthModal.vue` + `useAuthModal.ts` | 登录与 afterAuth |
| `server/api/images/[id]/card.put.ts` / `finalize.post.ts` / `share.get.ts` | 排版存、成品落库、分享 |
| `tests/ui/cards-p0-save-export.test.ts` | 本轮 P0 守卫 |
