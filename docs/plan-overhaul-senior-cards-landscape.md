# CraftAI 改版方案 v2：面向海外中老年人群的「贺卡 + 风景装饰画」工具站

> 状态：**待用户拍板** ｜ 日期：2026-10-20 ｜ 取代 v1（v1 假设目标是"国内中老年"，作废）

---

## 0. 先纠错：v1 我写错了什么

上一轮我直接按「国内中老年」写了代码，这些假设**全部作废**：

| v1 写进代码的 | 问题 |
|---|---|
| 中文场景库：年画 / 国画 / 书法配图 / 活动海报 / 祝福图 | 国内审美，海外中老年不吃这套 |
| 场景称呼「老妈」「写上谁的名字」 | 中文、且是中国家庭语感 |
| 「早安图」类日常问候 | **微信特有的国内文化，海外没有对等场景** |
| 界面文案全中文 | 目标用户是海外 |
| 画风含 nianhua / chinese-painting / anime | 前两个是国内审美，anime 是年轻人向 |

**保留下来的技术资产**（与人群无关，已实测有效）：

- MiniMax i2i 链路：`subject_reference: [{type:'character', image_file:'data:image/...;base64,...'}]` + `image-01-live` + `prompt_optimizer=false` ✅
- 8 种画风词实测生效：photo / watercolor / oil / anime / chinese-painting / nianhua / cartoon / vintage-color ✅
- CF Pages + D1 + R2 部署链路、分支隔离、密钥管理 ✅
- `sharp` 已安装 → **服务端图像合成可行**（这是做"成品"的关键前提）

---

## 1. 已验证的事实基础

| 事实 | 来源 | 对方案的影响 |
|---|---|---|
| 生产站 **1 个用户、0 首歌、1 张失败图、3 篇 blog** | 生产 D1 查询 | 零流量资产 → 改定位无包袱，不用纠结老用户 |
| 站已有 10 语种 i18n、Plausible、Firebase Auth、D1/R2/PayPal 订阅骨架 | 代码 | 基础设施够用，只需重写内容层 |
| `sharp` 在 node_modules | package.json | 服务端能做「图 + 文字」合成成品 |
| **海外贺卡竞品全部做"卡片成品"**（加字 + 可打印尺寸），不是裸图 | 竞品调研 | 只出裸图 = 和 Canva 免费层对打，必输 |
| 头部玩法：**一次性买断**（HeadshotPro $29–35，21 万笔）；订阅制被骂（Photo AI 2.1★） | 竞品调研 | 变现不该做订阅 |
| 中老年审美画风 = watercolor / oil pastel / vintage postcard / paper cut | Christmas Card Factory（4 种风格） | 画风库要按这个方向扩 |
| 装饰画市场：Etsy canvas wall art $412M（2024），风景占 28%，16×20" 是 58% bestseller 的 hero size，$45–55 甜蜜点，300 DPI | 市场数据 | 风景要做成"可打印尺寸"才有溢价 |
| 印刷品定价参考：A4 艺术微喷 £10.95，16×12" 画布 £70，加名字 +£5，加日期 +£2 | 真实价目表 | 成品规格和加价点有据可依 |
| **MiniMax key 现已失效**（20 分钟前还好好的，现在 `login fail`） | 本轮实测 | 线上生图现在大概率是坏的，**功能验证前需要新 key** |

---

## 2. 目标群体：「海外中老年人」不是一个市场，是三层

必须先选主战场，否则场景和定价会拧巴。

| 层 | 谁在操作 | 谁付钱 | 收礼人 | 客单 | 复购 | 证据强度 |
|---|---|---|---|---|---|---|
| **A. 代做型** | 子女/孙辈 | 子女/孙辈 | 父母/祖父母 | $25–55 | 节日峰值 | ★★★ 头部产品都在这（HeadshotPro 21 万笔） |
| **B. 自助贺卡型** | 中老年自己 | 中老年自己 | 朋友/亲戚 | $3–10 | 节日峰值 | ★★ 需求真实但客单低、免费替代品多 |
| **C. 自用装饰画型** | 中老年自己 | 中老年自己 | 自己家 | $21–55 | 低 | ★★ 真实但要有"可打印成品"能力 |

### 我的推荐

**主战场 = A（为中老年人做礼物），B 做流量入口。**

理由：
1. **付费者 ≠ 使用者**是这类产品的关键结构。A 层里，付钱的是"想送礼物但不知道送什么、也没时间做"的子女 —— 工具直接解决「选择困难」，痛点极硬。
2. 上一轮方案（GiftSong 拆解）验证过同一个结构：「送礼」类目需求最硬。
3. B 层作为免费入口：让中老年自己也能做贺卡发群/发 Facebook，既是流量也是口碑，还能反向验证 B 层单独是否成立。
4. C 层依赖"可打印成品"能力，等成品链路跑通后再开。

> ⚠️ 这一条**需要你拍板**（见 §8 决策点 1）。我按你的表述（"目标群体是海外中老年人"）默认了 A+B 组合，如果你确定只做"中老年人自己做"，我按 B 单独重排场景和定价。

---

## 3. 场景：分三条线，各自有不同的物理约束

### 3.1 贺卡线（场合驱动）—— 需要「加字」

海外中老年贺卡的场合清单（按商业价值排序）：

| 场合 | 时间窗 | 备注 |
|---|---|---|
| Christmas | 9–12 月 | 全年最大，竞品最密 |
| Birthday / Milestone（60/70 周年） | 全年 | 数字要准确 → 数字必须外部排版，不能让模型画 |
| Anniversary | 全年 | |
| Thank You | 全年 | |
| Get Well / Sympathy | 全年 | 情绪敏感，审美要克制 |
| Retirement | 全年 | 细分场景，海外有专门的 retirement card 产品 |
| Grandparents Day（9 月） | 9 月 | 美国/英国都有 |
| Mother's Day / Father's Day | 5 月 / 6 月 | 母亲节是全年第二高峰 |
| Wedding / New Home / New Baby / Graduation | 全年 | 送年轻亲戚，不是"给中老年" |

### 3.2 风景装饰画线（场所驱动）—— 需要「可打印尺寸」

- 我的家乡 / 老屋 / 小镇
- 度假地 / 旅行纪念
- 花园 / 院子 / 四季
- 教堂 / 社区 / 广场

产出定位：**可打印装饰画**（16×20" hero，300 DPI），而不是社交图。

### 3.3 人物纪念线（人物驱动）—— i2i 已有能力

- 老照片翻新上色（黑白 → 彩色）
- 家族合照重绘
- 老年艺术写真（把父母做成油画/水墨肖像）
- 宠物纪念（海外养宠比例高，$15–50 区间，Etsy 单品最高 320 周销）

---

## 4. 画风库：砍掉国内的，补上海外中老年验证过的

| 画风 | 现状 | 处理 |
|---|---|---|
| photo 照片 | ✅ 实测有效 | 保留 |
| watercolor 水彩 | ✅ 实测有效 | 保留（Christmas Card Factory 同款） |
| oil 油画 | ✅ 实测有效 | 保留 |
| vintage-color 老照片上色 | ✅ 实测有效 | 保留 |
| cartoon 卡通 | ✅ 实测有效 | 保留（孙辈向贺卡可用） |
| chinese-painting 国画 | ✅ 有效但国内审美 | ❌ 移出海外库 |
| nianhua 年画 | ✅ 有效但国内审美 | ❌ 移出海外库 |
| anime 动漫 | ✅ 有效但年轻人向 | ⚠️ 移到"孙辈风格"子集 |
| **oil pastel 油彩棒** | 未测 | ➕ 新增（竞品在用） |
| **vintage postcard 复古明信片** | 未测 | ➕ 新增（竞品在用） |
| **paper cut 剪纸** | 未测 | ➕ 新增（竞品在用） |
| **impressionist 印象派** | 未测 | ➕ 新增（风景线主力） |
| **sepia 棕调** | 未测 | ➕ 新增（老照片线） |

> 5 个新增画风**必须先实测**再标 `proven`，不能凭词表上线。

---

## 5. 关键工程缺口：成品（这节决定方案成不成立）

海外所有贺卡竞品的交付物都是**"加好字、能打印的成品"**，不是裸图。三个硬需求：

### 5.1 模型不能可靠渲染文字
→ 文字必须**外部排版**。我会实测验证 MiniMax 的文字渲染能力并留证。
→ 附带好处：生日/周年数字绝对准确（竞品都强调这点，因为模型画数字会错）

### 5.2 成品规格
- 贺卡：5×7"（美式标准）、A6（欧式）、4×6"，300 DPI，竖版
- 装饰画：16×20"（Etsy 58% bestseller hero size）、A3，300 DPI
- MiniMax `image-01` 支持自定义 width/height（512–2048，8 的倍数）→ **但 `image-01-live` 不支持** → 有参考图的场景要换策略

### 5.3 合成实现路径 —— ffmpeg.wasm 导出 + Canvas 实时预览（双通道）

**先纠错**：我最初判断「ffmpeg.wasm 官方 core 是 minimal build、不含 `drawtext`，用不了」——**实测打脸了**。

已实测（`@ffmpeg/core@0.12.10` 的 wasm 直接加载，跑 `-filters`）：

| 滤镜 | 状态 | 贺卡用途 |
|---|---|---|
| `drawtext`（libfreetype） | ✅ 已注册 | 加祝贺词 / 签名，支持描边、阴影、颜色 |
| `drawbox` | ✅ | 文字底色块 |
| `overlay` | ✅ | 叠加手写签名 PNG、边框装饰 |
| `scale` / `pad` / `crop` / `format` | ✅ | 精确控制输出尺寸（300 DPI） |
| `subtitles` / `ass`（libass） | ✅ | **ASS 字幕可做自动换行 + 精确定位**，是文字排版的正解 |
| `color` / `chromahold` | ✅ | 纯色底图 |

同时实测确认：**字体可以写进 wasm 虚拟 FS**（`FS.writeFile('/fonts/serif.ttf', bytes)`）—— 这是 drawtext 能工作的前提。

> 官方 core 共 486 个滤镜。`@ffmpeg/ffmpeg` 0.12.x 的 JS API 走 worker 路径，浏览器里才是真实运行环境。

#### 双通道架构

| 通道 | 技术 | 负责 | 理由 |
|---|---|---|---|
| **预览** | Canvas 2D | 实时拖动文字、改字号、换位置 | ffmpeg 每次 exec 都要解码 + 渲染，几百 ms 起，**做不了实时交互** |
| **导出** | ffmpeg.wasm | 最终成品（PNG/JPEG，300 DPI） | freetype/libass 的渲染质量是引擎级；尺寸精确；可复现 |

预览和导出用**同一套字体文件**（ttf 前端打包 + 同时写入 wasm FS），保证所见即所得。

#### 三个必须提前处理的工程点

1. **首屏绝不加载 core。** `@ffmpeg/core` 的 wasm ≈ 31MB（实测 `dist/umd/ffmpeg-core.wasm` = 32,232,419 字节）。
   → 用动态 `import()`，**用户点「下载成品」时才加载**，加载期间显示进度条。
   → 目标人群是中老年 + 移动端弱网，首屏挂 31MB 是自杀。

2. **内存 / 尺寸上限要实测。**
   5×7" @300dpi = 1500×2100，单帧 RGBA ≈ 12.6MB，加上 ffmpeg 解码缓冲，wasm 堆要够。
   → **P0 必测项**：真实浏览器里跑 1500×2100 的 drawtext，确认不 OOM。
   → 若不够：降采样到 1500×2100 之前先 `scale` 到 1024×1434 处理文字再放大（文字矢量重绘更清晰），或换 `@ffmpeg/core-mt`（多线程，需 SharedArrayBuffer）。

3. **`@ffmpeg/core-mt` 需要 COOP/COEP 响应头**（SharedArrayBuffer 要求）。
   → Cloudflare Pages 侧要配 `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`。
   → 单线程 core 无此要求，先按单线程做，多线程作为备选。

#### 功能拆解

| 能力 | 实现 |
|---|---|
| 祝贺词 | MiniMax 生成 + 场合预设语 + 用户可改（"不知道写什么"是中老年第一痛点） |
| 打字签名 | 字体选择（script / serif / 手写体）+ 字号 + 颜色 → drawtext |
| 手写签名 | pointer 轨迹 → 导出透明 PNG → `overlay` 叠加 |
| 版式 | 贺卡模板预设（边框/留白/文字位置），Canvas 预览可拖动 |
| 尺寸 | 5×7"、A6、4×6"（贺卡）；16×20"、A3（装饰画），300 DPI |
| 导出 | PNG（无损，适合打印）+ JPEG（体积小，适合分享） |

> 🎯 **ffmpeg.wasm 的未来主场**：如果之后做「贺卡 + 语音祝福」（GiftSong 模式）或视频分享卡，音视频合成正是它的强项。本期先只用它做图片成品导出。

---

## 6. 竞品拆解 + 品牌命名

### 6.1 品类标杆：Moonpig（必须记住这个）

| 项 | 数据 |
|---|---|
| 成立 | 2000 年，25 年历史，英国贺卡与礼品巨头 |
| 规模 | 送出 **4.5 亿张卡**、1.58 亿束花 |
| 品牌使命 | "make card-sending more personal" |
| 14 个个性化功能 | 含 **AI handwriting tool**（AI 手写工具）、**AI Stickers**（prompt 生成贴纸加进卡里） |
| 上新动作 | 2026 刚上 AI Stickers（用 prompt 生成专属贴纸） |

**对我们的意义（两条）**：
1. ✅ 「**AI 帮人选/写卡片文字**」和「**AI 生成元素加到成品里**」都是被 25 年巨头验证过的核心增值点 —— 我们的"祝贺词生成 + 手写签名"不是拍脑袋，是复刻 Moonpig 的成功路径。
2. ⚠️ Moonpig 强在**实体履约**（印刷 + 配送 + 供应链）。我们这轮**不做履约**，只做数字成品 —— 所以我们打不过它的"卡片质感"，只能靠**定制度 + 速度 + 价格**赢。

### 6.2 竞品流程拆解（可直接抄的部分）

| 站点 | 流程 | 定价 | 值得抄的 |
|---|---|---|---|
| **Silly Robot Cards** | ① 选 idea/风格 → ② 加照片+名字+爱好+笑话 → ③ 印刷 or 电子卡 | 免费创作预览；印刷 from **£3.99**；eCard from **£0.99** | **"免费做，付费才寄"** 的转化设计；Trustpilot 4.4★ 挂在首页；照片 30 天删除；"100% happiness guarantee" |
| **Orylia.ai** | ① 传 1 张照片 → ② 打字+选 9 种风格 → ③ 生成下载 | 48 credits/次；新号 200 credits + 每天 50 | **"名字和数字拼写绝对正确"当核心卖点**（"Kids notice when the number is wrong"）；3:4 竖版"prints cleanly as a 5x7" |
| **tools.town** | ① 传照片 → ② 选风格（每种配 1 句人话描述）→ ③ 下载 PNG/A4 PDF | 首张免费，之后 ₹99/10 张 | 风格卡片**每种配一句人话**（"Soft watercolor florals… gentle pastel keepsake"）—— 中老年最需要这个 |
| **Homiwork** | 选场合专页 → 选主题 → 传照片 → 填祝福语 → 生成 | 按质量档：Standard 22 / Advanced 28 / Professional 34 / 4K 42 credits | **把「文字渲染质量」做成付费档差异**（Professional=2K+清晰文字，"Great for posters, cards, and designs with readable text"）→ 直接印证我们「文字必须外部排版」的判断 |
| **Moonpig** | 14 个个性化功能，含 AI 手写工具 + AI 贴纸 | £3-4 实体卡 | 「不知道写什么」用 AI 解决，是刚需 |
| **Jenova** | ① 说明场合和收件人 → ② 拿到**成品卡而非模板** → ③ 调整 → ④ 有照片再加照片 | 免费额度 + 付费 from $20/月 | **"卡片上的文字会有意保持简短"**；默认 4:5 竖版 |

**我们自己的 3 步流程（综合上述）**：

```
Step 1  选场合（13 个场合大卡片，按"给谁"而非"什么节日"分组）
          ↓
Step 2  选画风 + 传照片 + 填名字/祝福语（一屏内完成，0 输入也能出图）
          ↓
Step 3  生成 → 预览 → 加字/签名 → 下载（PNG/JPEG，300 DPI）
```

**信任元素（照抄这几条，缺一不可）**：
- 照片 30 天自动删除 + "我们不用你的照片训练模型"
- 100% 重做保证（"Not happy? We'll make it right"）
- 首张免费 / 免费预览，付费才导出高分辨率
- 社会证明挂首页（Moonpig 挂 4.5 亿张，HeadshotPro 挂 21 万笔）

### 6.3 市场基本盘（已验证）

| 数据 | 来源 |
|---|---|
| 美国人每年买 **65 亿张**贺卡，**90%** 家庭买贺卡 | 贺卡协会 |
| 全球贺卡市场 2025 = **198 亿美元** | Grand View Research |
| 仅圣诞就占美国 **15 亿张**购买量，母亲节紧随 | 同上 |
| **千禧一代按消费金额是最大的贺卡买家** | 同上 |
| 58% 电子贺卡用户选可定制图片/消息/动画的；53%+ 用手机访问 | 2025 行业报告 |
| 普通美国家庭每年买约 30 张贺卡 | — |

> 💡 "千禧一代是最大买家" = **A 层（代做型）主战场再次被数据坐实**。

### 6.4 品牌命名

**硬约束**：
1. 域名固定 `create.yozzytools.com` → **首词必须是 Create**
2. **不含 "AI"** —— 竞品全都不含（Silly Robot Cards / Paper & Pine / Orylia / Homiwork / Moonpig）。"AI" 对中老年是减分项，对送礼人群无所谓。**"Create" 是人类最本能的动词，正好替代 AI 做品牌人格。**
3. 传达"珍贵 / 要留下来 / 送礼"，不能只是"生成图片"
4. 2 个词最好，口播要顺（"I made it on ___"）

**已排除（撞名）**：
- `Create Your Gift` —— eGift.com 已有 "Create Your Gift Card" 按钮文案，通用短语 SEO 拼不过
- `Create My Gift` —— 印度激光雕刻礼品公司 createmygift.in
- `Keepsake` 系 —— 已被 Notion Press 相册 App、澳洲企业礼品系列、UAE 定制工作室、restarted.io、jellybeanstreet 等占满，词根已死

### 6.5 推荐品牌

> ## **Create Keepsakes**
> ### *Personalised cards and canvas prints for the people you love*

**为什么是它**：

| 维度 | 评价 |
|---|---|
| 与域名咬合 | `create.yozzytools.com` → 首词就是 Create ✅ |
| **业务关联** | **Keepsakes 是上位业务词** —— 贺卡 + 装饰画 + 人物纪念，全都叫 keepsake。比 "Keep" 精确，比 "Cards" 覆盖更全 ✅ |
| 商标安全 | **断开了 "Create Cards" 连续组合**（避开 Create Cards LLC 的 Class 016 注册商标）✅ |
| 情绪 | "Keepsake" 自带"要留下来"的珍重感 ✅ |
| 撞名 | 同类别（AI 贺卡服务）无同名 ✅ |
| Logo | `CREATE` 大字 + `KEEPSAKES` 小字，3 词好排版 ✅ |
| 口号 | *Cards, canvases and keepsakes for the people you love* |

**备选**：
- **Create a Keepsake Card** —— 更明确指向贺卡，但 4 词偏长
- **Create Keepsake Studio** —— 高级感更强（参考 Paper & Pine Studio），但"Studio"弱化了成品感

> 💡 **为什么不用 "Create Cards"**（用户原始提案）：见下方雷区表 —— 它在美国有**同类别**注册商标。

### 6.5.1 ⚠️ 命名雷区（已查实，务必看）

| 雷区 | 事实 | 风险 |
|---|---|---|
| **Create Cards LLC** | **USPTO Serial #97085849 "C C CREATECARDS"**，2022-11-29 REGISTERED，**Class 016（信纸/贺卡/印刷品）**，Vineyard UT | 🔴 **最高** —— 正是我们的类别。"Create Cards" / "Create Cards & Canvases" 语音高度相似，同类别混淆风险真实 |
| **Creatacard™** | **American Greetings 注册商标**（旗下 Blue Mountain / Carlton Cards / Paper Rebel），2022 与 Alicia Keys 联名圣诞系列 | 🔴 高 |
| `create-wish.com` | 免费名字贺卡站，覆盖全球节日 | 🟡 中 |
| `createe-cards.com` | 2000 年代老牌电子贺卡站 | 🟡 中 |
| `Create Your Gift` | eGift.com 的按钮文案 | 🟡 中（通用短语，SEO 拼不过） |
| `Create My Gift` | 印度激光雕刻礼品公司 createmygift.in | 🟡 中 |
| `Keepsake` 系 | Notion Press 相册 App / 澳洲企业礼品系列 / UAE 工作室 / restarted.io / jellybeanstreet… | 🟢 低（类别不同，均非"AI 贺卡服务"） |

**商标自查方法**（正式定名前必做，我无法替代法律判断）：
1. USPTO 商标检索：https://tmsearch.uspto.gov → 查 "Create Keepsakes" / "Create Keepsake" / "Create a Keepsake Card"
2. 同时查 EUIPO（欧盟）/ UKIPO（英国）—— 目标用户在英美欧
3. 重点看 **Class 016（纸制品/印刷品）+ Class 41（在线服务）**
4. 若 "Create Keepsakes" 也被占 → 退到 **"Create a Keepsake Card"** 或加后缀（Create Keepsakes Studio / The Keepsake Co）

### 6.5.2 行业标杆的启示：我们的差异化不在「签名」

American Greetings 的 **Creatacard** 早就把「加照片 + **签名** + 可打印」做成了标配功能，还有 **AI Stickers**（prompt 生成贴纸）。

**结论**：
- ✅ 我们的「手写签名 / 打字签名」是**入场券**，不是护城河 —— 必须有，但别当卖点宣传
- ❌ 真正的差异化在别处：
  1. **画风库**（我们 8 种实测过的中老年画风：watercolor / oil pastel / vintage postcard / paper cut…竞品多是通用模板）
  2. **成品打印质量**（300 DPI + 5×7"/A6/16×20" 标准尺寸 + ffmpeg 矢量级文字渲染）
  3. **细分场景**（老照片翻新 / 纪念相册 / 退休 / 周年 / 老家风景 —— 竞品只做 occasion，不做"人"）
  4. **AI 帮写祝福语**（Moonpig 的 AI handwriting tool 验证过这个刚需）

### 6.6 站点形态

- 域名：`create.yozzytools.com`（不变）
- 品牌：**Create & Keep**
- 老音乐站（CraftAI）：**降级保留**但不占主导航 —— 生产站零流量，无存量包袱；音乐功能不删（不花钱），只是不推
- `nuxt.config.ts` 需要改：`title` / `og:site_name` / `appName` / logo / favicon / schema.org name
- 现有 `locales/*.json` 10 语种保留，但**生图相关的界面文案重写为英文**

## 7. 变现：单张 + 订阅 双轨

### 7.1 竞品价格锚点（已验证）

| 产品 | 价格 | 形态 |
|---|---|---|
| Just Christmas Cards | £1.49/张 | 单张 |
| Christmas Card Factory | $3 起 / 10 张装 $12 | 数字 + 印刷套装 |
| Silly Robot Cards | $3.99/张，100 张包 $1.45/张 | 印刷卡 |
| BigDayCard | $9.99 一次性/卡 | 单张 |
| AI Christmas Photo | $9.90/100 积分，$19.90/300 | 积分包（永不过期） |
| AI Holiday Cards | $27 / 30 张 | 一次性包 |
| HeadshotPro | $29–59 / 30–70 张 | 一次性包 |
| Photo AI | $19/月订阅 | 订阅，**2.1★（被骂）** |

### 7.2 定价表（建议）

| 方案 | 价格 | 额度 | 折合单张 | 说明 |
|---|---|---|---|---|
| Free | $0 | 每天 1 张 | — | 带轻水印，拉新 + B 层传播 |
| **单张** | **$3.99** | 1 张 | $3.99 | 冲动消费，零决策门槛 |
| **订阅（月）** | **$9.99** | **5 张/月** | **$2.00**（省 50%） | 比单张×3 划算得多，✅ 符合要求 |
| 订阅（年） | $79 | 5 张/月 | $1.32 | 再打 34%，锁定留存 |
| **一次性买断包** | **$19.99** | 20 张，永久有效 | $1.00 | **兜底**，给"一年做 3 张但不想被订阅"的人 |

**为什么必须保留"一次性买断"这一档**：海外中老年最反感订阅自动续费，"忘记取消被扣款"是差评重灾区。这一档能显著压低退款率和差评率 —— 而且**一年只做 3 张的人恰恰是这个产品的主力人群**。

### 7.3 订阅的 5 条设计红线（不做就会被骂）

1. **未用额度必须滚存** —— 消除"我付了钱没用完"的怨气（Photo AI 跌到 2.1★ 的核心原因之一）
2. **随时可取消，取消后仍可用到期末**
3. **超出额度可加购单张**，不必等下个月
4. **绝不自动升级**（no surprise upgrade）
5. **价格页写清"取消随时生效"** —— 中老年最怕隐藏扣款

### 7.4 成本侧

MiniMax `image-01` 单张成本约 $0.01–0.04，$2.00/张 的订阅价毛利率 > 90%。**订阅是亏本买留存，单张才是主要利润来源** —— 但低门槛单张带来的转化，才是订阅的漏斗入口。

### 7.5 现有代码要改的

`server/api/subscriptions/plans.get.ts` 现在是音乐站的模型（free/creator/pro，credits 10/300），要换成图片站的「张数」模型；`daily_free_claims` 表可复用（`type='image'`）。PayPal 订阅骨架已在，但**一次性买断包需要新增 Orders v2 链路**（现有代码只有订阅制，没有一次性支付）。

### 7.6 关于 IAA

v1 倾向 IAA，**本方案不做**：贺卡/装饰画是低频窄场景，广告 eCPM 撑不起；且中老年用户对广告 intrusive 容忍度低。先做透单次/订阅变现，IAA 留给未来做流量型内容站。

---

## 8. 需要你拍板的事

**已确认**：
- ✅ 主战场 **A+B**（代做为主、自助为流量入口）
- ✅ 变现「单张 + 订阅」双轨（~~$3.99 单张 / $9.99 月含 5 张 / $19.99 买断 20 张~~）
  → **2026-10-21 已提价**：$6.99 单张 / $19.99 月含 5 张 / $59.99 买断 20 张
  （理由：原梯度里买断包只要 $1.00/张，比单张便宜 75%，单张根本卖不动；
    且 PayPal $35/笔提现费摊在 $3.99 上太重。价格真相源 = `utils/pricing.ts`）
- ✅ 成品要做：加祝贺词 / 签名
- ✅ 渲染方案：**ffmpeg.wasm 导出 + Canvas 实时预览**（双通道，见 §5.3）
- ✅ 品牌名：**Create Keepsakes**（域名 create.yozzytools.com 不变；备选 Create a Keepsake Card）
- ⚠️ 品牌名需过一遍 USPTO/EUIPO/UKIPO 商标检索（Class 016 + 41），见 §6.5.1
- ✅ 域名固定 `create.yozzytools.com`

**仍需拍板 / 待办**：

1. **新的 MiniMax API Key** —— 我手上这份 20 分钟前还好好的、现在被 MiniMax 拒了（`login fail`）；CF 里加密存的那份能正常解密，但解出来的多半是同一个已失效的 key。**P0 验证前需要你给新的。**
2. **商标初筛** —— `Create & Keep` 全网无同名产品（已查），但**正式推广前仍需查 US/EU/UK 商标库**，这是唯一可能推翻这个名字的变量。

---

## 9. 执行顺序（拍板后）

| 阶段 | 内容 | 产出 |
|---|---|---|
| **P0 验证**（1 天） | ① 新的 MiniMax key 打通；② 实测 5 个新画风；③ **浏览器里验证 ffmpeg.wasm 成品链路**（5×7"@300dpi = 1500×2100 出图 + drawtext 排版 + overlay 手写签名 + 导出，确认不 OOM）；④ 实测模型文字渲染并留证（证明文字必须外部排版） | 技术可行性结论 + 成品样张 |
| **P1 重做内容层**（2–3 天） | 海外场景库（贺卡 13 + 风景 5 + 人物 4）、画风库重整、英文界面、prompt 模板全部重写 | 新的 `utils/imageScenarios.ts` |
| **P2 成品链路**（3–5 天） | ffmpeg.wasm 导出器（懒加载 core）+ Canvas 实时预览：贺卡版式（边框/文字/署名）、手写签名板、打印尺寸导出、300 DPI PNG/JPEG | 可下载的成品 |
| **P3 前端**（2–3 天） | 选场合 → 填称呼/选照片 → 预览 → 成品；零学习成本，大字大按钮 | `/cards` 或改造 `/image` |
| **P4 部署验收** | 推 test → CF 自动部署 → staging 端到端验证 → 合并 master | 线上可用 |
| **P5 变现** | 一次性买断 + 信任页（退款保证 / 不训练 / 自动删图 / 社会证明） | 可收款 |

**每阶段的验收标准**：P0 出 3 张成品样张（贺卡 / 装饰画 / 翻新）且文字正确、尺寸达标；P4 线上完成「上传 → 选场景 → 出成品 → 下载」全链路。

---

## 10. 不在本轮范围

- 实体印刷履约（Printful/Etsy 铺货）—— 留接口不实现
- 订阅制 —— 已明确不做
- canvas 海报引擎（复杂拼贴/多图排版）—— 用 sharp 模板化替代，不做自由编辑
- 音乐站功能重做 —— 降级保留，不投入
- 站内音乐功能与新定位的取舍 —— 交给品牌决策
