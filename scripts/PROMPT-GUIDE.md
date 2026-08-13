# 🎨 内部配图生成 — Prompt 指南

## 快速开始

```bash
# 一行命令快速生图
node scripts/quick-image.mjs "your prompt here"

# 使用模板生成 Logo
npm run img:logo

# 生成 Blog 配图
npm run img:blog -- --prompt "AI music generation"

# 生成社交媒体图
npm run img:social -- --prompt "New feature announcement"
```

## 模板类型

| Type | 用途 | 默认比例 | 说明 |
|------|------|----------|------|
| `logo` | 品牌标识 | 1:1 | 极简矢量风格，适合 favicon/头像 |
| `blog` | 文章封面 | 16:9 | 编辑风格，适合 blog header |
| `social` | 社交媒体 | 1:1 | 高冲击力，适合 IG/Twitter |
| `product` | 产品展示 | 4:3 | 商业摄影风格 |
| `og` | OG 图片 | 16:9 | Open Graph 社交分享 |

## Prompt 优化原理

脚本内置 MiniMax-M3 提示词优化器，流程：
1. 用户输入粗略想法（中英文均可）
2. 调用 MiniMax-M3 优化为高质量英文 prompt
3. 使用优化后的 prompt 调用 image-01 生图
4. 同时启用 `prompt_optimizer: true` 做二次优化

## Prompt 编写技巧

### Logo 类
```
✅ "A minimalist geometric logo combining sound wave and letter C"
✅ "Flat vector brand mark, purple gradient, dark background"
❌ "make a logo"  // 太模糊
❌ "logo with lots of details and text and effects"  // 太复杂
```

### Blog 配图类
✅ 包含具体场景：`"AI composing music in a futuristic studio"`
✅ 指定风格：`"editorial photography, clean composition"`
✅ 颜色提示：`"deep purple background with neon accents"`

### 通用规则
- **具体 > 抽象**：描述具体物体、场景、光线
- **风格明确**：vector / photography / 3D render / editorial
- **留白意识**：logo 类要 generous padding
- **禁止文本**：不要在 prompt 中要求生成文字

## 输出目录

所有生成的图片保存在 `scripts/output/` 目录下：
- `*.jpg` — 生成的图片
- `*_prompt.txt` — 使用的 prompt 记录（方便复用）

## 批量生成

```bash
# 批量生成不同风格的 logo
for style in "minimal" "geometric" "abstract"; do
  node scripts/quick-image.mjs "Creator.ai logo, $style style" --aspect 1:1
done
```

## 常见问题

**Q: 图片有文字怎么办？**
A: 在 prompt 中添加 "NO text, NO letters, NO watermark"

**Q: 图片质量不够高？**
A: 添加质量关键词：`"ultra high quality", "8k", "professional photography"`

**Q: 品牌色不一致？**
A: 明确指定颜色：`"purple gradient #8b7cff to #b4a9ff"`
