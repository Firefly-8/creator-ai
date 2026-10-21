#!/usr/bin/env node
/**
 * 成品卡片合成器 —— 把 AI 底图 + 排版文字层合成成「可交付的成品」
 *
 * 为什么要单独排版（而不是让模型画字）：
 *   实测模型在画面里写字必翻车 —— showcase 批次里出现过
 *   "Happy 70th Runthdscket"、歪掉的 "get well soon"。
 *   名字和数字必须 100% 正确，这是竞品 Orylia 的核心卖点，
 *   也是我们付费点（2K 无水印 + 300 DPI 打印规格）的一部分。
 *
 * 用途：
 *   1. 生成首页 showcase 的成品图（public/showcase/）
 *   2. 服务端合成「带字成品」时的同款渲染逻辑参考
 *   客户端导出走 composables/useCardCanvas.ts（Canvas 2D），效果对齐这里。
 *
 * 用法：
 *   node scripts/compose-card.mjs --bg out/bg.jpg --out public/showcase/x.jpg \
 *        --title "Happy Birthday" --name "Margaret" \
 *        --message "Wishing you a wonderful year ahead" --signature "The Watson family"
 */
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

/* ------------------------------------------------------------------ */
/* 参数                                                                */
/* ------------------------------------------------------------------ */
function parseArgs(argv) {
  const out = {}
  for (let i = 2; i < argv.length; i += 1) {
    const k = argv[i]
    if (!k.startsWith('--')) continue
    const key = k.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) out[key] = true
    else { out[key] = next; i += 1 }
  }
  return out
}

const args = parseArgs(process.argv)

const SPECS = {
  '5x7': { w: 1500, h: 2100, label: '5 × 7 in' },
  '4x6': { w: 1200, h: 1800, label: '4 × 6 in' },
  a6: { w: 1240, h: 1748, label: 'A6' },
  '16x20': { w: 2400, h: 3000, label: '16 × 20 in' },
  a3: { w: 1754, h: 2480, label: 'A3' },
}

const specKey = args.spec || '5x7'
const spec = SPECS[specKey]
if (!spec) {
  console.error(`未知规格 ${specKey}，可用：${Object.keys(SPECS).join(', ')}`)
  process.exit(1)
}

const bgPath = args.bg
const outPath = args.out
if (!bgPath || !outPath) {
  console.error('用法：--bg <底图> --out <输出> [--title ...] [--name ...] [--message ...] [--signature ...] [--spec 5x7]')
  process.exit(1)
}

const title = args.title || ''
const name = args.name || ''
const message = args.message || ''
const signature = args.signature || ''
const ink = args.ink || '#3a2f28'
// 纯装饰画（墙画）不要文字蒙版
const useBand = args['no-band'] !== true
const accent = args.accent || '#c8543d'

/* ------------------------------------------------------------------ */
/* 排版计算                                                            */
/* ------------------------------------------------------------------ */
const W = spec.w
const H = spec.h
const PAD = Math.round(W * 0.1)

/** 按画布宽度算字号，保证 5×7 和 16×20 视觉比例一致 */
const S = W / 1500
const msgSize = Math.round(46 * S)
const nameSize = Math.round(104 * S)
const signSize = Math.round(62 * S)
const ruleW = Math.round(120 * S)
const ruleH = Math.max(2, Math.round(2 * S))

/**
 * 版式：图上字下（bottom）—— 唯一对所有底图都安全的版式。
 *
 * 为什么不用「上方标题」：
 *   实测有人物的底图会把人物画满上方，标题直接压脸；
 *   而模型天然把主体画在画面中下部，底部才是稳定留白区。
 *   Moonpig / Silly Robot 的成品也基本都是图上字下。
 */
const BAND_TOP = Math.round(H * 0.58)   // 渐变蒙版起点

/**
 * 渲染一层文字。
 *
 * ⚠️ sharp 的 text 输入 **没有 size 参数**，字号只能靠 dpi 控制：
 *    pango 固定用 12pt 基准，实际像素 = 12 × dpi / 72
 *    ⇒ 要拿到 N 像素的字号，dpi = N × 6
 *
 * ⚠️ **绝对不能同时给 width 和 height**：
 *    一旦定义了 height，sharp 会忽略 dpi 并把文字自动缩放填满 height
 *    （实测 42px 的消息被放大到 200px，一个词占满整行）。
 *
 * ⚠️ font 描述里的字号（如 "42px Lora"）会被忽略，只能用 family + weight。
 */
/** pango markup 转义：& < > 会被当成标记 */
function escapeMarkup(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

async function textLayer(text, opts) {
  const {
    font, size, color, width, align = 'center', weight = 'normal',
  } = opts
  if (!text) return null
  return sharp({
    text: {
      // ⚠️ pango 会把 text 当 Pango markup 解析，
      //    用户消息里的 & < > 会直接抛 "invalid markup in text"。
      //    必须转义成实体。（客户端 Canvas 的 fillText 不需要这步）
      text: escapeMarkup(text),
      // pango font description 语法：[style] [weight] family
      font: weight && weight !== 'normal' ? `${weight} ${font}` : font,
      width,
      rgba: true,
      align,
      justify: true, // 自动两端对齐换行
      dpi: Math.max(1, Math.round(size * 6)),
    },
  })
    .png()
    .toBuffer()
}

/* ------------------------------------------------------------------ */
/* 合成                                                                */
/* ------------------------------------------------------------------ */
async function main() {
  // 1) 底图只占画面上部 —— 下方留给文字。
  //    用 'attention' 裁切保证主体（蛋糕/摇椅/窗）完整，不被裁掉。
  const ART_H = Math.round(H * 0.74)
  const art = await sharp(bgPath)
    .resize(W, ART_H, { fit: 'cover', position: 'attention' })
    .toBuffer()
  // ⚠️ 合成目标画布必须是整张 H（不是 ART_H），
  //    否则文字层（top 在 1900+）会被裁掉
  // ⚠️ 必须显式 .png()：create 输入不带格式时 sharp 不知道输出什么，
  //    会抛 "Input buffer contains unsupported image format"
  const base = await sharp({
    create: {
      width: W, height: H, channels: 4,
      background: { r: 0xfd, g: 0xfa, b: 0xf4, alpha: 1 },
    },
  })
    .png()
    .composite([{ input: art, top: 0, left: 0 }])
    .png()
    .toBuffer()

  const layers = []

  // 2) 纸面 + 顶部短过渡
  //    真实贺卡是「画面 + 一张卡纸」，交界利落；
  //    早期版本用一大段渐变把画面下半洗白，主体（蛋糕/摇椅）全丢了。
  if (useBand) {
    const PAPER = '#fdfaf4'
    const FEATHER = Math.round(H * 0.16)
    // 画面底部向上渐隐到纸面（短过渡，保留画面主体）
    layers.push({
      input: Buffer.from(
        `<svg width="${W}" height="${FEATHER}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="${PAPER}" stop-opacity="0"/>
              <stop offset="0.55" stop-color="${PAPER}" stop-opacity="0.55"/>
              <stop offset="1" stop-color="${PAPER}" stop-opacity="1"/>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="${W}" height="${FEATHER}" fill="url(#g)"/>
        </svg>`,
      ),
      top: ART_H - FEATHER,
      left: 0,
    })
  }

  // 3) 文字区「自底向上」堆叠
  //    不用固定坐标 —— 消息行数会随内容变，固定坐标必然重叠。
  //    游标从底部往上走，每放一块就把游标抬到这块的顶边之上。
  const gap = Math.round(26 * S)
  const PAD_BOTTOM = Math.round(H * 0.035)
  let cursor = H - PAD_BOTTOM

  const place = (layer, { bottom }) => {
    if (!layer) return
    const m = layer.meta
    if (process.env.CK_DEBUG) {
      console.log('  layer', m.width + 'x' + m.height, '-> left',
        Math.round((W - m.width) / 2), 'top', Math.round(bottom - m.height))
    }
    layers.push({
      input: layer.data,
      left: Math.round((W - m.width) / 2),
      top: Math.round(bottom - m.height),
    })
  }

  const grab = async (buf) => {
    if (!buf) return null
    const m = await sharp(buf).metadata()
    return { data: buf, meta: m }
  }

  // 签名（最底）
  const signLayer = await grab(await textLayer(signature, {
    font: 'Caveat', size: signSize, color: ink,
    width: Math.round(W * 0.6),
  }))
  place(signLayer, { bottom: cursor })
  if (signLayer) cursor = cursor - signLayer.meta.height - gap

  // 祝贺语
  const msgLayer = await grab(await textLayer(message, {
    font: 'Lora', size: msgSize, color: ink,
    width: Math.round(W * 0.76),
  }))
  place(msgLayer, { bottom: cursor })
  if (msgLayer) cursor = cursor - msgLayer.meta.height - gap

  // 名字
  const nameLayer = await grab(await textLayer(name, {
    font: 'Playfair Display', size: nameSize, color: accent,
    width: W - PAD * 2, weight: 'Bold',
  }))
  place(nameLayer, { bottom: cursor })
  if (nameLayer) cursor = cursor - nameLayer.meta.height - Math.round(14 * S)

  // 细分隔线（在名字上方）—— 没有名字就不画
  if (name) layers.push({
    input: {
      create: {
        width: ruleW, height: ruleH, channels: 4,
        background: { r: 0xc8, g: 0x54, b: 0x3d, alpha: 0.55 },
      },
    },
    left: Math.round((W - ruleW) / 2),
    top: Math.max(0, Math.round(cursor)),
  })

  const out = await sharp(base)
    .composite(layers)
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer()

  await writeFile(outPath, out)
  console.log(
    `v ${path.basename(outPath)}  ${W}x${H} (${spec.label})  ${(out.length / 1024).toFixed(0)}KB`,
  )
}

main().catch((e) => {
  console.error('合成失败:', e)
  process.exit(1)
})
