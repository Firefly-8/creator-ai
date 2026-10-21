# 成品卡实现笔记 —— 踩过的坑

> 2026-10-20 / Create Keepsakes
> 这些都是**实测出来的**，不是猜的。每一条都附了复现方式和证据。

---

## 一、模型在画面里写字必翻车 ⚠️ 最高优先级

**现象**：showcase 第一批 12 张底图里出现
- `person-grandpa`：`Happy 70th Runthdscket`（生日贺卡上的假字）
- `scene-thankyou-parent`：歪歪扭扭的 `get well soon`

**根因（两个，都验证过）**：
1. 提示词里出现了 `card` 一词 → 模型理解为「画一张卡片」，于是自作主张在卡上写字
2. 没加任何「不要文字」的约束

**修法**（已落到 `utils/imageScenarios.ts`）：
```ts
export const NO_TEXT_CLAUSE =
  ', no text, no lettering, no words, no numbers, no captions, no signage, no watermark, no signature, no logo'
```
每个场景 prompt 自动追加 ✅（`tests/utils/image-scenarios.test.ts` 有断言守住）

**推论**：**文字必须由我们排版，模型一个字都不能画。**
竞品 Orylia 把「名字和数字绝对正确」当核心卖点（"Kids notice when the number is wrong"），
我们现在有技术依据了 —— 模型画的数字就是会错。

---

## 二、参考图会压制画风（i2i 与 t2i 必须分开）

**实测**：5 个画风 × t2i/i2i 对照

| 画风 | t2i | i2i | 结论 |
|---|---|---|---|
| photo / watercolor / oil | ✅ | ✅ | 两边都稳 |
| oil-pastel / paper-cut | ✅ | ✅ | 两边都稳 |
| vintage-postcard | ✅ 完美 | ⚠️ 只半生效 | **t2i 专用** |
| impressionist | ✅ | ⚠️ **主体漂移**（参考图里的狗换了一只） | **t2i 专用** |
| sepia | ✅ 完美 | ❌ 完全失效（模型理解成「加暗角」） | **t2i 专用** |

**落地**：`ImageStyleDef.i2iSafe` 标记 + `stylesForScenario(scenario, hasReference)`
有参考图时只给安全画风。测试里有硬断言守住。

**产品含义**：i2i 场景（老照片翻新 / 全家福 / 宠物）**不能给用户强画风选项**，
否则他们的妈妈会变成另一个人。这是差评和退款的主要来源。

---

## 三、成品版式规范：图上字下

**为什么不用「上方标题」**：
- 有人物的底图会把人物画满画面上方，标题直接压脸（实测 grandma 那张）
- 模型天然把主体画在画面中下部，**底部才是稳定留白区**
- Moonpig / Silly Robot 的成品也基本是图上字下

**最终版式**（`scripts/compose-card.mjs` 与 `composables/useCardCanvas.ts` 保持一致）：
```
┌─────────────────┐
│                 │  画面（占上 74%）
│   主体          │  cover + position: attention（保证主体不被裁）
│                 │
├─────────────────┤  ← 16% 短渐变过渡
│  Margaret       │  名字（Playfair Display Bold，珊瑚色）
│  ─────          │  细分隔线
│  消息（Lora）    │  祝贺语
│  The Family     │  签名（Caveat 手写体）
└─────────────────┘
```
- 文字区是**纸面**（`#fdfaf4`）+ 顶部短渐变，不是大段渐变把画面洗白
- 文字**自底向上堆叠**（游标式），不能用固定坐标 —— 消息行数会变，固定坐标必然重叠

---

## 四、sharp 合成器的三个坑（server / 脚本侧）

> ⚠️ 客户端 Canvas 不受影响（`ctx.font = "42px Lora"` 是标准 CSS）。
> 但服务端合成/静态图生成要用 sharp，这里三个坑都踩了。

### 坑 1：`text` 输入**没有 `size` 参数**
- 字号只能靠 **dpi** 控制：pango 固定 12pt 基准 ⇒ `实际像素 = 12 × dpi / 72`
- **要拿到 N 像素字号 ⇒ `dpi = N × 6`**
- font 描述里写 `'42px Lora'` / `'42 Lora'` 都**无效**（字号被忽略）

### 坑 2：**绝对不能同时给 `width` 和 `height`**
- 一旦定义了 `height`，sharp 会**忽略 dpi** 并把文字自动缩放填满 height
- 后果：42px 的消息被放大到 200px，一个词占满整行
- 正确做法：只给 `width`（换行宽度），`height` 留空

### 坑 3：`create` 输入必须显式指定输出格式
```js
sharp({ create: {...} }).png().composite([...]).png().toBuffer()  // ✅
sharp({ create: {...} }).composite([...]).toBuffer()               // ❌ Input buffer contains unsupported image format
```

### 附带：pango markup 转义
pango 把 `text` 当 Pango markup 解析，用户消息里的 `&` `<` `>` 会直接抛
`text: invalid markup in text`。**必须转义成实体**。
（"Emma & Tom" 就炸过一次。）

---

## 五、shell 传参把消息按空格切词

```bash
# ❌ ${@:2} 展开时丢了引号，消息被切成 word，只传进第一个词
run() { node compose.mjs --bg "$1" --out "$2" ${@:3} ; }

# ✅ shift + "$@"
run() { local n="$1"; shift; node compose.mjs --bg "$n" --out "$n.webp" "$@" ; }
```
**症状**：成品上消息只剩一个词（"Eighty" 而不是整句）。
**排查方式**：`CK_DEBUG=1` 打印每层尺寸，一眼看出 layer 宽度从 1132 变成 124。

---

## 六、字体资产

- Google Fonts **可变字体**要用 fontTools 实例化成静态 ttf（librsvg 不吃可变轴）
- Caveat 的 `wght` 轴只允许 400/700，实例化 500/600 会报 `Cannot find Axis Values`
- 变量字体是**静态 ttf**（不是 woff2）—— fontconfig 不认 woff2
- 下载源：`https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/<family>/<Family>%5Bwght%5D.ttf`
  （`raw.githubusercontent.com` 在沙箱里连不上，jsdelivr 通）
- 脚本：`scripts/build-fonts.py`

---

## 七、字体自托管，不引 Google Fonts ⚠️ 合规

引用 `fonts.googleapis.com` 会把用户 IP 传给 Google —— 德国法院已多次判此类外链违反 GDPR。
我们主打英国 + 欧盟，所以**必须自托管**（`public/fonts/` + `assets/css/brand-fonts.css`）。
字体是 OFL 协议，许可文件一并放在 `public/fonts/OFL-*.txt`。

---

## 八、静态资源体积

showcase 成品原图 1500×2100 JPEG 12 张 = 5.2MB，太重。
转成 900px 宽 WebP 质量 84 后 = 1.2MB（**降 77%**）。
samples（参考图兜底）1024px WebP = 0.65MB。
⚠️ og:image **不能**用 WebP（Facebook/Twitter 兼容差），单独出一张 1200×630 JPG。

---

## 九、结论清单（可以当规范用）

1. 模型一个字都不许画 —— 文字全部外部排版
2. 有参考图时只给 i2i 安全画风（7 种），其余 3 种是 t2i 专用
3. 成品版式：图上字下，纸面 + 短渐变，文字自底向上堆叠
4. 提示词里不出现 `card`
5. 字体自托管（GDPR）
6. 静态图一律 WebP，og 图例外
7. 场景 prompt 自动带 `NO_TEXT_CLAUSE`，测试守住
