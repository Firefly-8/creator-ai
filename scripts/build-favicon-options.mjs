#!/usr/bin/env node
/**
 * favicon 候选方案生成 + 对比页
 *
 * 背景：现行 favicon（珊瑚方块+白信封+探出爱心）已比旧版可辨，
 * 用户想再看几个方向。一次出 5 个方案，同一个 HTML 里在
 * 64/32/16px、亮/暗 tab 两种背景下并排对比，选定后把对应 SVG
 * 换进 scripts/build-logo.mjs 的 markSvg() 即可。
 *
 * 产出：scripts/output/favicon-options/*.png + designs/greetings-island/favicon-方案对比.html
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import opentype from 'opentype.js'

const CREAM = '#fbf7f1'
const CORAL = '#c8543d'
const CORAL_DEEP = '#a53f2c'
const INK = '#2a2420'
const PAPER = '#fffdfa'
const BEIGE = '#f3e4d3'

const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'

// 信封 + 探出爱心（V1/V5 共用的内心形）
function envelopeHeart() {
  return `
  <rect x="172" y="368" width="680" height="440" rx="44" fill="${PAPER}"/>
  <path d="M204 400 L512 636 L820 400 Z" fill="${BEIGE}"/>
  <g transform="translate(320 116) scale(16)">
    <path d="${HEART_PATH}" fill="${CORAL}"/>
  </g>`
}

const OPTIONS = {
  // V1 现行方案：珊瑚圆角方块 + 白信封 + 探出爱心
  v1_current: {
    name: 'V1 · 现行（信封+探出爱心）',
    note: '信封=贺卡品类，爱心=情感钩子。元素最多，16px 下信封轮廓仍在但细节丢失。',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="228" fill="${CORAL}"/>${envelopeHeart()}
</svg>`,
  },
  // V2 单一大爱心：把「一句话说完」推到极致
  v2_heart: {
    name: 'V2 · 单一大爱心',
    note: '整个 icon 只有一个符号，16px 下轮廓最完整、最不容易糊。竞品（单棕榈树徽章）验证过「单一具象图形」的 16px 生存率。代价：信封品类线索没了。',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="228" fill="${CORAL}"/>
  <g transform="translate(512 512) scale(27) translate(-12 -12.2)">
    <path d="${HEART_PATH}" fill="${PAPER}"/>
  </g>
</svg>`,
  },
  // V3 信封为主 + 爱心邮票：品类第一、情感第二
  v3_stamp: {
    name: 'V3 · 信封+爱心邮票',
    note: '信封占满（品类直给），爱心缩成右上角一张「邮票」（贴邮票=寄信，语义也通）。层次多但都是直角几何，小尺寸不容易糊成一团。',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="228" fill="${CORAL}"/>
  <rect x="132" y="332" width="760" height="500" rx="48" fill="${PAPER}"/>
  <path d="M172 372 L512 640 L852 372 Z" fill="${BEIGE}"/>
  <rect x="640" y="180" width="220" height="220" rx="28" fill="${PAPER}" stroke="${BEIGE}" stroke-width="18" stroke-dasharray="30 22"/>
  <g transform="translate(672 212) scale(6.5)">
    <path d="${HEART_PATH}" fill="${CORAL}"/>
  </g>
</svg>`,
  },
  // V4 Pacifico 花押字 C：与字标同源
  v4_letter: {
    name: 'V4 · 手写花押字 C',
    note: '用品牌字标同款 Pacifico 字体写一个白色 "C"，favicon 与顶栏字标视觉同源（大厂常见做法：Slack 的 #、Notion 的 N）。个人手感强，但 "C" 与贺卡品类无直接关联。',
    svg: null, // 下面用 opentype 生成
  },
  // V5 圆形徽章：竞品同构（圆形徽章+单一图形）
  v5_badge: {
    name: 'V5 · 圆形徽章（竞品同构）',
    note: 'Greetings Island = 圆形徽章+单一具象图形。圆形在 tab 里比方块更「跳」，奶油内芯+珊瑚环对比强。信封爱心保留。',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <circle cx="512" cy="512" r="512" fill="${CORAL}"/>
  <circle cx="512" cy="512" r="392" fill="${CREAM}"/>
  <g transform="translate(322 300) scale(15)">
    <path d="${HEART_PATH}" fill="${CORAL}"/>
  </g>
  <rect x="352" y="560" width="320" height="210" rx="36" fill="${PAPER}" stroke="${INK}" stroke-width="16"/>
  <path d="M376 584 L512 700 L648 584 Z" fill="${BEIGE}" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
</svg>`,
  },
}

// V4：Pacifico "C" → 白色矢量路径（复用 build-wordmark 缓存的 TTF）
{
  const { readFile } = await import('node:fs/promises')
  const buf = await readFile('scripts/output/fonts-cache/Pacifico-Regular.ttf')
  const pacifico = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
  const p = pacifico.getPath('C', 0, 0, 100)
  const b = p.getBoundingBox()
  // 归一到 0,0 起点，缩放到 ~680px 高，居中放
  const d = p.commands.map((c) => {
    const r = (v) => v == null ? '' : String(Math.round((v - b.x1) * 100) / 100)
    const ry = (v) => v == null ? '' : String(Math.round((v - b.y1) * 100) / 100)
    switch (c.type) {
      case 'M': return `M${r(c.x)} ${ry(c.y)}`
      case 'L': return `L${r(c.x)} ${ry(c.y)}`
      case 'Q': return `Q${r(c.x1)} ${ry(c.y1)} ${r(c.x)} ${ry(c.y)}`
      case 'C': return `C${r(c.x1)} ${ry(c.y1)} ${r(c.x2)} ${ry(c.y2)} ${r(c.x)} ${ry(c.y)}`
      case 'Z': return 'Z'
      default: return ''
    }
  }).join('')
  const w = b.x2 - b.x1
  const h = b.y2 - b.y1
  const s = 640 / h
  const tx = 512 - (w * s) / 2
  const ty = 512 - (h * s) / 2
  OPTIONS.v4_letter.svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="228" fill="${CORAL}"/>
  <g transform="translate(${tx.toFixed(0)} ${ty.toFixed(0)}) scale(${s.toFixed(2)})">
    <path d="${d}" fill="${PAPER}"/>
  </g>
</svg>`
}

const outDir = path.resolve('scripts/output/favicon-options')
await mkdir(outDir, { recursive: true })

// 逐方案出 128px PNG（base64 嵌对比页）
const cards = []
for (const [id, opt] of Object.entries(OPTIONS)) {
  const buf = await sharp(Buffer.from(opt.svg)).resize(128, 128).png().toBuffer()
  await writeFile(path.join(outDir, `${id}.png`), buf)
  opt.b64 = `data:image/png;base64,${buf.toString('base64')}`

  // 16/32 实际渲染尺寸 PNG
  await writeFile(path.join(outDir, `${id}-32.png`), await sharp(Buffer.from(opt.svg)).resize(32, 32).png().toBuffer())
  await writeFile(path.join(outDir, `${id}-16.png`), await sharp(Buffer.from(opt.svg)).resize(16, 16).png().toBuffer())
  cards.push({ id, name: opt.name, note: opt.note, b64: opt.b64 })
}

function cell(card, px, bg, dark = false) {
  return `<div class="sz" style="background:${bg}">
    <img src="${card.b64}" width="${px}" height="${px}" style="image-rendering:auto" />
    <span style="${dark ? 'color:#9aa0a6' : ''}">${px}px</span>
  </div>`
}

const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<title>favicon 候选方案对比 · Create Keepsakes</title>
<style>
  body { font-family: 'Manrope', system-ui, sans-serif; background: #f6f1e8; color: #2a2420; margin: 0; padding: 40px 24px; }
  h1 { font-size: 22px; margin: 0 0 6px; }
  .sub { color: #6b5f55; font-size: 14px; margin-bottom: 28px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(460px, 1fr)); gap: 20px; max-width: 1080px; }
  .card { background: #fff; border: 1px solid rgba(58,46,38,.12); border-radius: 14px; padding: 20px; }
  .card h2 { font-size: 16px; margin: 0 0 6px; }
  .note { font-size: 13px; color: #6b5f55; line-height: 1.6; margin: 0 0 16px; }
  .row { display: flex; align-items: flex-end; gap: 10px; margin-bottom: 12px; }
  .sz { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 12px 6px; border-radius: 8px; }
  .sz span { font-size: 11px; color: #6b5f55; }
  .tab { display: flex; align-items: center; gap: 8px; border-radius: 8px 8px 0 0; padding: 7px 14px; font-size: 12.5px; max-width: 240px; }
  .tab img { flex: 0 0 auto; }
  .tab.light { background: #dde3ea; color: #1f2937; }
  .tab.dark { background: #202124; color: #e8eaed; }
  .main { color: #8a8f98; font-size: 12.5px; padding-left: 4px; }
</style>
</head>
<body>
<h1>favicon 候选方案对比</h1>
<p class="sub">同一图形在 64 / 32 / 16px、亮色 / 暗色 tab、真实 tab 场景下的表现。V1 为现行方案。</p>
<div class="grid">
${cards.map((c) => `<div class="card">
  <h2>${c.name}</h2>
  <p class="note">${c.note}</p>
  <div class="row">${cell(c, 64, CREAM)}${cell(c, 32, CREAM)}${cell(c, 16, CREAM)}</div>
  <div class="row">${cell(c, 64, '#2b2b2b', true)}${cell(c, 32, '#2b2b2b', true)}${cell(c, 16, '#2b2b2b', true)}</div>
  <div class="row">
    <div class="tab light"><img src="${c.b64}" width="16" height="16"><span>Create Keepsakes – Personalised...</span></div>
    <span class="main">← 亮色 tab</span>
  </div>
  <div class="row">
    <div class="tab dark"><img src="${c.b64}" width="16" height="16"><span>Create Keepsakes – Personalised...</span></div>
    <span class="main">← 暗色 tab</span>
  </div>
</div>`).join('\n')}
</div>
</body>
</html>`

const previewPath = path.resolve('designs/greetings-island/favicon-方案对比.html')
await mkdir(path.dirname(previewPath), { recursive: true })
await writeFile(previewPath, html)
console.log('v designs/greetings-island/favicon-方案对比.html')
console.log('v scripts/output/favicon-options/*.png')
