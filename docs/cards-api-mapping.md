# 贺卡创作 · API / 模型参数映射

> 真相源：`server/api/image/generate.post.ts`、`utils/imageScenarios.ts`、`pages/cards.vue`  
> 供应商：MiniMax `/v1/image_generation`（`server/utils/minimax.ts`）

## 1. 用户控件 → 真实参数

| 用户能懂的设置 | UI 控件 | 客户端字段 | 服务端去向 | 默认 |
|---|---|---|---|---|
| 场合（生日/圣诞…） | 场合选择 | `scenario` | `buildScenarioPrompt` → MiniMax `prompt` | `birthday` |
| 画风 | 画风 chip | `style` | prompt 片段 + `meta.card.style` | `watercolor`（有参考图时仅 `i2iSafe`） |
| 格式（贺卡/邀请） | 入口 URL，不可在弹窗切 | `formatClause` | 白名单 `invite`/`card` → 固定 prompt 子句 | `card` |
| 给谁 | 名字输入 | `name` | prompt `{name}` + meta | `''` |
| 一点细节 | textarea | `extra` | prompt `{extra}` | `''` |
| 贺卡正文 | 文案选择/自填 | `message` | **只存 meta**，不进出图 prompt | 场合预设第一条 |
| 参考照片 | 上传 | `uploadId` | MiniMax `subject_reference`（i2i）；模型倾向 `image-01-live` | 无 |
| 画幅 | （工作区固定） | `aspect_ratio: '3:4'` | MiniMax `aspect_ratio` | `3:4`（卡片竖图） |
| Prompt 优化 | 关闭 | `promptOptimizer: false` | MiniMax `prompt_optimizer` | cards 固定 false |
| 一次几张 | — | `n: 1` | 服务端强制 1 | 1 |

**不会暴露的假控件**：采样步数、CFG、种子、图层、滤镜、Remove BG、Magic styles（供应商/产品均无稳定支持）。

## 2. 本地编辑（不扣生成额度）

| 动作 | API | 扣额度？ |
|---|---|---|
| 改字 / 拖位置 / 换版式 / 主题色 / Undo·Redo | 无即时 API；防抖 `PUT /api/images/:id/card` | 否 |
| 尺寸切换（5×7 / 4×6 / A6） | 仅客户端 canvas | 否 |
| Download free（1024 + 水印） | canvas 导出 | 否 |
| Finish & save | `POST …/finalize`（成品图） | 否（生成已扣过） |
| Try again / 重新生成 | `POST /api/image/generate` | **是**（1 次） |
| Write it for me | `POST /api/image/message` | 文本额度 |

## 3. 鉴权 / 额度闸口（保留）

1. 匿名可开工作区填表；点生成 → 401 → AuthModal；`afterAuth` 续跑且表单保留。  
2. `consumeQuota(uid,'image',1)` 在 MiniMax **之前**；失败 `refundQuota`。  
3. 免费累计 3 次（lifetime）；付费走 credit。  
4. 去水印 / 2K 打印走定价页，不绕过。

## 4. 与旧 `/image` 台差异

| | `/cards` 工作区 | `/image?legacy=1` |
|---|---|---|
| 场景路径 | 必选 scenario → 服务端拼 prompt | 可自由 `prompt` + `scene` |
| `styleType` / `mode` | 不发送 | 客户端曾发；服务端忽略 `mode`/`styleType` |
| UX | 遮罩连续创作 | 旧左右栏台（兼容保留） |
