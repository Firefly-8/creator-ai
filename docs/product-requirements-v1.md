# Create Keepsakes — 产品需求确认书 v1

> 状态：**待逐项确认** ｜ 日期：2026-10-20 ｜ 配套文档：`plan-overhaul-senior-cards-landscape.md`（战略层）
> 本文档只讲**做什么**，不讲怎么实现。实现细节在配套计划里。

---

## 0. 一个重要修正：成品合成不需要 ffmpeg.wasm

原计划用 ffmpeg.wasm 做成品合成。**梳理完商业设计后，我建议砍掉它**，理由：

| 维度 | ffmpeg.wasm 客户端导出 | 纯客户端 Canvas 合成 |
|---|---|---|
| 体积 | 要下 **31MB** core（还得放 R2，因为 CF Pages 单文件上限 25MB） | 0 KB |
| 内存 | 1500×2100 = 12.6MB/帧，墙画 2400×3000 = 28.8MB/帧，wasm 堆有 OOM 风险 | 同尺寸，但浏览器 canvas 是原生内存，稳定得多 |
| 跨域 | `@ffmpeg/core-mt` 还要配 COOP/COEP 响应头 | 无 |
| 文字质量 | freetype 引擎级 | 浏览器字体，清晰；跨设备微差（可接受） |
| 手写签名 | 要自己转 PNG 再 overlay | Path2D 直接描边，天然支持 |
| **付费墙** | 导出在客户端 = **导出免费**，只能靠"生成"收费 | 同样导出免费，**但付费点更清晰**（见下） |

**关键：付费墙不靠"导出"，靠"生成分辨率 + 水印"。**

```
免费：生成 1024px 预览 + canvas 导出带水印
付费：生成 2K 无水印 + canvas 导出 300 DPI 打印规格（1500×2100 / 2400×3000）
```

这样：
- 服务端 MiniMax 调用可控（生成才是真正花钱的地方）✅
- "300 DPI 可打印" 本身就是付费理由 ✅（竞品 Orylia 明确写 "print-ready 2K"）
- 客户端零重依赖 ✅
- **不需要 R2 托管 31MB wasm、不需要 COOP/COEP** ✅

> ⚠️ 唯一代价：不同设备的系统字体渲染略有差异。贺卡场景完全可接受。
> ⚠️ 备选：若将来要做"语音祝福 / 视频贺卡"（GiftSong 模式），再引入 ffmpeg.wasm 做音视频合成 —— 那时它才是对的工具。

---

## A. 定位

| 项 | 内容 |
|---|---|
| 品牌 | **Create Keepsakes** |
| 域名 | create.yozzytools.com |
| 一句话 | Personalised cards and canvas prints for the people you love |
| 主战场 | **A 层（代做型）** —— 子女/孙辈为父母祖父母做东西 |
| 流量入口 | **B 层（自助型）** —— 中老年人自己给朋友做 |
| 差异点 | ① 中老年画风库 ② 成品可打印 ③ 细分"人"的场景 ④ AI 帮写祝福语 |
| 不做 | 实体印刷履约、复杂自由排版、订阅自动续费、IAA |

---

## B. 落地页骨架（8 个区块）

来源：Silly Robot Cards（结构最完整）+ Orylia（工具型转化最好）。**逐条标注了我们要抄什么。**

| # | 区块 | 内容 | 抄自 |
|---|---|---|---|
| B1 | **Hero** | H1「A card made just for them.」/「Made for the people you love」<br>副标：Their photo. Their favourite things. That joke only you get.<br>主 CTA：[Create their card]<br>价格锚点：**From $3.99 · preview free**<br>社会证明：★★★★★ Trustpilot 徽章<br>**右侧放一张真实成品卡示例**（带一句" THEIR INSIDE JOKE"） | Silly Robot |
| B2 | **三步流程** | 「Three little steps. A much more personal card.」<br>① Tell us about them ② Make it theirs ③ Make their day | Silly Robot |
| B3 | **按"人"分类入口** ⭐ | 🐾 The pet obsessive / ⛳ The hobby fanatic / 💬 Your favourite weirdo<br>每人配一句人话（"Dad loves tea and crosswords. Biscuit is the real boss."） | Silly Robot |
| B4 | **季节性区块** | 「A little less generic this Christmas」+ [Make a Christmas card] | Silly Robot |
| B5 | **为什么选我们** | 4 条：名字数字拼写绝对正确 / 真人真脸不模板 / 300 DPI 可打印 / 照片不训练不留存 | Orylia |
| B6 | **评价区** | 「Personal means more.」+ Trustpilot 真实评价轮播 | Silly Robot |
| B7 | **FAQ**（6–8 条） | 价格 / 多久能好 / 能不能改 / 能不能只发电子版 / 照片安全吗 / 打印多大 | Silly Robot |
| B8 | **底部 CTA** | 「They'll know who made it.」+ [Create their card] | Silly Robot |

### B3 的详细设计（这是最关键的一块）
按"人"而不是按"节日"组织入口，因为中老年的搜索/思维路径是「给**奶奶**做张生日卡」：

```
For Mum        For Dad       For Grandma      For Grandpa
For a Friend   For a Partner  For a Teacher    For Neighbours
For a Pet      For Myself
```

每张卡片 = 一个真实句子（不是"母亲节贺卡"这种品类词）：
> "A card for the mum who never asks for anything. She deserves a proper one."

---

## C. 创作流程（3 步）

来源：Orylia（工具本体 + 样例兜底）+ tools.town（风格配人话）+ Homiwork（异步生成不阻塞）

```
┌─ Step 1  What are you celebrating? ─────────────────────┐
│  6 组 23 个场景大卡片（Birthdays & Milestones / Family &  │
│  Life / Everyday Kindness / Holidays / Wall Art /        │
│  Photos & Pets）                                          │
│  卡片上：英文场景名 + 一句人话 + 图标                     │
│  ★ 卡片上不放价格，只放"这是什么"                          │
└──────────────────────────────────────────────────────────┘
                         ↓
┌─ Step 2  Make it theirs ────────────────────────────────┐
│  ① 选画风（chip，每个配一句人话）                        │
│  ② 需要照片的场景 → 上传（带样例兜底 + 压缩提示）         │
│  ③ 填称呼（可选，但给了效果更好）                          │
│  ④ 选一句祝贺语 或 让 AI 写 或 自己写                       │
│     ★ "a line or two renders most reliably"              │
└──────────────────────────────────────────────────────────┘
                         ↓
┌─ Step 3  Make their day ────────────────────────────────┐
│  生成中（不阻塞，可继续开新任务 + 后台通知）               │
│  → 结果网格（4 张）→ 选一张 → 进成品编辑器                 │
│  → 下载（PNG/JPEG）或分享链接                            │
└──────────────────────────────────────────────────────────┘
```

### C 的关键细节
- **样例兜底**："No photo handy? Try a sample" —— 降低第一步门槛（Orylia）
- **空状态提示**："Upload a photo to get started"（Orylia）
- **按钮带成本**：付费场景的按钮上标价格（Orylia 的 "Create Birthday Card 54c"），成本前置、不做黑箱
- **异步生成不阻塞**：不排队等待，可继续操作（Omiwork）
- **风格配人话**（tools.town）：不要只写 "Watercolour"，要写 "Soft watercolour florals in gentle pastels"
- **诚实声明**：写清限制（Orylia："所有人必须在这张照片里"）→ 建立信任

---

## D. 成品编辑器（"加字 + 签名"）

用户说的"生图后绘制一层签名或祝贺词"。

| 能力 | 说明 | 优先级 |
|---|---|---|
| **祝贺词** | 三个来源：预设语 / AI 生成 / 自己写。显示在卡片上 | P0 |
| **打字签名** | 字体选择（衬线 / 手写体 / 无衬线）+ 字号 + 颜色 | P0 |
| **手写签名** | 手指/鼠标画签名 → 描边 → 叠加 | P1 |
| **实时预览** | Canvas 预览，文字可拖动、改字号 | P0 |
| **尺寸选择** | 贺卡 5×7 / 4×6 / A6（300 DPI）；墙画 16×20 / A3（150 DPI） | P0 |
| **导出** | PNG（无损，打印用）+ JPEG（体积小，分享用） | P0 |
| **加边框/装饰** | 模板化的留白与描边 | P2 |
| **自由排版** | 拖拽任意元素 | ❌ 不做 |

**为什么尺寸要现在定**：5×7" @300dpi = 1500×2100，是"能拿去打印"和"只能发手机"的分界线。竞品 Orylia 明确写 "A 3:4 portrait card at 2K prints cleanly as a 5x7"。

---

## E. 现有站点模块 → 处置清单

### E.1 要重写

| 模块 | 现状 | 改成 |
|---|---|---|
| `pages/index.vue` | "AI Music & Image Studio" hero + 3 个 feature + daily-free banner | **B 节的 8 区块落地页** |
| `pages/pricing.vue` | 音乐站 free/creator/pro（credits 10/300） | **单张 $3.99 / 订阅 $9.99 含 5 张 / 买断 $19.99 含 20 张** + 信任页元素（退款保证 / 照片不训练 / 30 天删除） |
| `pages/ai-image-generator.vue` | SEO 落地页 | 改为**场景落地页模板**（每个场景一个页面，见 G 节） |
| `pages/tools/index.vue` | 工具索引 | 改为**场景 / 画风 / 尺寸**三维索引页（SEO 长尾入口） |
| `pages/gallery/index.vue` | 画廊 | 改为**成品分享墙**（带水印的公开分享 = 裂变） |
| `pages/create.vue` | 创作入口 | 改为 C 节 Step 1 的场景选择页 |

### E.2 保留并复用（不动）

| 模块 | 复用点 |
|---|---|
| `components/ui/*`（15 个） | Button / Segmented / Modal / ShareMenu / LanguageSwitcher / CookieConsent / FeedbackModal — **全部直接用** |
| `components/StudioWorkspace.vue` | 工作台布局 |
| `components/GenerationStage.vue` | 生成中状态 |
| `pages/library.vue` | 我的作品（成品历史） |
| `pages/dashboard/index.vue` | 额度 / 订阅状态 |
| `pages/blog` `about` `contact` `privacy` `terms` | 保留（隐私政策要重写，见 G） |
| `pages/admin/index.vue` + `server/api/admin/*` | 后台（要加额度管理） |
| `server/api/gallery` `feedback` `user/daily-free` `images/:id/regenerate` | 成品分享 / 反馈 / 免费额度 / 重生成 |
| 10 语种 i18n | 保留（生图相关文案重写为英文） |
| Plausible analytics | 保留（要加生图漏斗事件） |

### E.3 降级保留（不投入，但别删）

音乐相关全部：`pages/song` `pages/cover.vue` `pages/ai-music-generator.vue` `AppPlayer` `AudioEditor` `SongResultRail` `PresetMarquee` `server/api/music/*` `cover/*` `lyrics`

**理由**：生产站 0 首歌 0 用户，删了零成本；留着也不花钱，且万一方向要回退还能用。只是不占主导航、不做 SEO、不投放。

### E.4 新建

| 模块 | 说明 |
|---|---|
| `pages/cards.vue` | **主产品页**（C 节流程），原 `/image` 降级为高级模式入口 |
| `components/CardComposer.vue` | 成品编辑器（D 节） |
| `composables/useCardCanvas.ts` | Canvas 预览 + 导出 |
| `utils/cardSpecs.ts` | 尺寸规格（已建） |
| `utils/imageScenarios.ts` | 场景库（已建，23 场景 / 10 画风） |
| `server/api/image/message.post.ts` | AI 帮写祝贺语 |
| `server/api/image/credits.get.ts` | 额度查询/扣减 |
| `server/api/image/samples.get.ts` | 样例图（"Try a sample"） |
| PayPal Orders v2 一次性支付 | 现在只有订阅，没有一次性买断链路 |

---

## F. SEO 落地页矩阵（长尾流量）

Silly Robot 的 SEO 结构是它最大的资产 —— 它的页脚有 **80+ 个长尾链接**。我们照抄这个结构：

| 维度 | 示例页面 | 数量 |
|---|---|---|
| **by person** | birthday-card-for-mum / for-dad / for-grandma / for-grandpa / for-husband / for-wife / for-best-friend / for-teacher | 8 |
| **by occasion** | christmas / thanksgiving / mothers-day / fathers-day / grandparents-day / retirement / sympathy / thank-you / just-because | 9 |
| **by milestone** | 30th / 40th / 50th / 60th / 70th / 80th birthday card | 6 |
| **by interest** | dog-lover / cat-lover / gardening / golf / fishing / cooking / travel / wine | 8 |
| **by product** | wall-art / canvas-prints / eCard / printable / 5x7-card | 5 |
| **by style** | watercolor-card / oil-painting-card / vintage-postcard / paper-cut / oil-pastel | 5 |

合计 **~41 个落地页**。每个页面 = 同一套组件 + 一份文案/图片，不单独开发。
**注意**：这类页面必须真写文案（Google 对 thin content 的判定越来越严），不能只换标题。

---

## G. 合规与信任（必须有）

| 项 | 依据 |
|---|---|
| 照片 30 天自动删除 | Silly Robot / Orylia 都在首页写 |
| "我们不用你的照片训练模型" | Orylia 明确写 "never used to train models" |
| 100% 重做保证 | Silly Robot "100% happiness guarantee" |
| 生成前显示成本 | Orylia 按钮上标 credits |
| 姓名/数字绝对正确 | Orylia 核心卖点 |
| 隐私政策重写（照片处理、删除权、GDPR/CCPA） | 新定位下旧政策不适用 |
| **AI 生成内容披露**（欧盟 AI Act / 部分州法） | Etsy 已强制披露；我们做美国市场也要留口子 |
| 商用授权说明 | 竞品都按"个人使用 vs 商业使用"分档 |

---

## H. 需要你确认的 12 个决策点

| # | 问题 | 我的建议 |
|---|---|---|
| 1 | **成品导出免费还是付费？** | 导出免费（canvas），**付费点在"生成 2K 无水印 + 300 DPI"** |
| 2 | 真的砍掉 ffmpeg.wasm？ | 砍（省 31MB + 省 COOP/COEP + 省 OOM 风险），将来做语音/视频贺卡再引 |
| 3 | 免费额度给多少？ | 每天 1 张（带水印，1024px）—— 够传播，不够用 |
| 4 | 单张 $3.99 / 订阅 $9.99 含 5 张 / 买断 $19.99 含 20 张 —— 确认？ | 确认（已按竞品锚点算过） |
| 4b | **2026-10-21 提价**：单张 $6.99 / 订阅 $19.99 含 5 张 / 买断 $59.99 含 20 张 | 确认。原梯度买断包 $1.00/张比单张便宜 75%，单张卖不动；且付费额度当时是「无限生成」，不修额度就是白送。真相源 = `utils/pricing.ts` |
| 5 | 订阅要不要"额度滚存"？ | **要**（不滚存会被骂） |
| 6 | 一次性买断用 PayPal Orders v2 还是 Stripe？ | PayPal（海外老年用户更认；Stripe 需海外主体） |
| 7 | 场景库 23 个够不够？先上哪几个？ | 先上**生日 / 大寿 / 父母节 / 圣诞 / 感谢 / 退休 / 老照片翻新** 7 个（覆盖 80% 需求） |
| 8 | 画风库 10 种，其中 5 种**还没实测** | 上线前必须补测（oil-pastel / vintage-postcard / paper-cut / impressionist / sepia） |
| 9 | 首页要不要保留音乐站的入口？ | **不要**（音乐站降级到页脚），首页全给贺卡 |
| 10 | 是否要**实体印刷履约**（Printful 等）？ | 本轮**不做**，但成品导出格式要预留 5×7 出血位 |
| 11 | 老照片翻新 / 全家福 / 宠物 这 3 个 i2i 场景优先吗？ | 优先（i2i 能力已验证，是差异点） |
| 12 | 10 语种 i18n 保留吗？ | 保留，但**先只做英文**，其他语种文案质量不够反而拖 SEO |

---

## I. 执行顺序（确认后）

| 阶段 | 内容 | 依赖 |
|---|---|---|
| **P0** | 新的 MiniMax key → 补测 5 个画风 → 验证「名字数字准确」+ 300 DPI 导出 | **卡在 key** |
| **P1** | 首页重写（8 区块）+ `/cards` 创作页 + 场景库接进后端 | — |
| **P2** | 成品编辑器（canvas 预览 + 祝贺词 + 打字签名 + 尺寸 + 导出） | — |
| **P3** | 定价页 + PayPal 订阅/买断 + 额度系统 + 免费额度 | — |
| **P4** | SEO 落地页矩阵（前 10 个页面先上）+ sitemap | — |
| **P5** | 信任页（隐私政策重写 / 保证 / 照片删除）+ 落地页上线 | — |

**每阶段验收**：P0 出 3 张成品样张（贺卡 / 墙画 / 翻新）且文字正确、尺寸达标；P2 能从生成走到下载一张 1500×2100 的 PNG。
