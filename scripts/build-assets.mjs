#!/usr/bin/env node
/**
 * 静态资源构建 + 上传（字体 / 品牌成品图 / 样例图 / 社交图）
 *
 * ⚠️ 为什么要这套流程：
 *   静态资源不放在 public/ 里（那会跟着应用包一起部署，每次都重传 3MB+，
 *   而且占 Pages 文件配额）。它们放在 R2 公开桶 craftai-assets，
 *   通过 https://assets.yozzytools.com 直链访问 —— 相当于 OSS CDN。
 *
 * 流程：
 *   source/*.jpg（R2 上的无文字底图）
 *     → 叠排版文字层（scripts/compose-card.mjs 的同款逻辑）
 *     → 压成 900px WebP
 *     → 传回 R2 showcase/*.webp
 *
 * 用法：
 *   node scripts/build-assets.mjs            # 构建 + 上传
 *   node scripts/build-assets.mjs --dry-run  # 只构建到 .assets/ 不上传
 */
import { execFile } from 'node:child_process'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { promisify } from 'node:util'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const exec = promisify(execFile)

const ASSET_BASE = 'https://assets.yozzytools.com'
const BUCKET = 'craftai-assets'
const OUT_DIR = path.resolve('.assets')
const DRY = process.argv.includes('--dry-run')

/** 成品文案表 —— 改文案后重跑本脚本即可同步线上 */
const CARDS = [
  {
    id: 'hero-birthday', name: 'Margaret',
    message: 'Happy 80th Birthday! Wishing you the happiest year yet, with all our love.',
    signature: 'The Watson family',
  },
  {
    id: 'person-mum', name: 'Mum',
    message: "Thank you for everything, always. Happy Mother's Day.",
    signature: 'Emma & Tom',
  },
  {
    id: 'person-dad', name: 'Dad',
    message: "Happy Father's Day, Dad. Thank you for all you do for us.",
    signature: 'With love, the family',
  },
  {
    id: 'person-grandma', name: 'Margaret',
    message: 'Eighty years of you. We love you more than words can say.',
    signature: 'The Watson family',
  },
  {
    id: 'person-grandpa', name: 'Jim',
    message: 'Seventy years young! Happy birthday, Dad.',
    signature: 'The Watsons',
  },
  {
    id: 'person-friend', name: 'Thank you, Ruth',
    message: 'For everything you did for me this year. I never forget.',
    signature: 'With love, Hannah',
  },
  {
    id: 'person-partner', name: 'Our 25th',
    message: "Twenty-five years of you - here's to many more.",
    signature: 'Always yours',
  },
  {
    id: 'person-teacher', name: 'Thank you, Mrs Clarke',
    message: 'Thirty years of teaching us. You changed our lives.',
    signature: "Class of '95",
  },
  {
    id: 'person-pet', name: 'Biscuit',
    message: 'Happy Birthday to the best dog in the whole world.',
    signature: 'The Watson family',
  },
  {
    id: 'scene-christmas', name: 'Merry Christmas',
    message: 'Wishing you a warm and wonderful Christmas, with all our love.',
    signature: 'The Watsons',
  },
  {
    id: 'scene-thankyou-parent', name: 'Get well soon',
    message: "Rest up and take your time. We're thinking of you every day.",
    signature: 'The family',
  },
  {
    id: 'scene-wallart', name: 'Home',
    message: 'The lane outside the old house, where we all grew up. We miss it.',
    signature: 'Love from all of us',
  },
]

/* ------------------------------------------------------------------ */
/* 排版（与 scripts/compose-card.mjs 保持一致）                          */
/* ------------------------------------------------------------------ */
const W = 1500
const H = 2100
const ART_H = Math.round(H * 0.74)
const S = W / 1500
const msgSize = Math.round(46 * S)
const nameSize = Math.round(104 * S)
const signSize = Math.round(62 * S)
const ruleW = Math.round(120 * S)
const ruleH = Math.max(2, Math.round(2 * S))
const PAD = Math.round(W * 0.1)
const PAPER = '#fdfaf4'
const INK = '#3a2f28'
const ACCENT = '#c8543d'

/** pango markup 转义：& < > 会被当成标记 */
function escapeMarkup(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * 渲染一层文字
 * ⚠️ sharp 的 text 没有 size 参数 —— 字号只能靠 dpi（12pt 基准）
 * ⚠️ 绝对不能同时给 width 和 height（height 会触发自动缩放）
 */
async function textLayer(text, { font, size, color, width, weight }) {
  if (!text) return null
  return sharp({
    text: {
      text: escapeMarkup(text),
      font: weight && weight !== 'normal' ? `${weight} ${font}` : font,
      width,
      rgba: true,
      align: 'center',
      justify: true,
      dpi: Math.max(1, Math.round(size * 6)),
    },
  })
    .png()
    .toBuffer()
}

async function composeCard(srcBuf, card) {
  const art = await sharp(srcBuf)
    .resize(W, ART_H, { fit: 'cover', position: 'attention' })
    .toBuffer()

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
  if (!card.noBand) {
    const FEATHER = Math.round(H * 0.16)
    layers.push({
      input: Buffer.from(
        `<svg width="${W}" height="${FEATHER}" xmlns="http://www.w3.org/2000/svg">
          <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${PAPER}" stop-opacity="0"/>
            <stop offset="0.55" stop-color="${PAPER}" stop-opacity="0.55"/>
            <stop offset="1" stop-color="${PAPER}" stop-opacity="1"/>
          </linearGradient></defs>
          <rect x="0" y="0" width="${W}" height="${FEATHER}" fill="url(#g)"/>
        </svg>`,
      ),
      top: ART_H - FEATHER,
      left: 0,
    })
  }

  const gap = Math.round(26 * S)
  let cursor = H - Math.round(H * 0.035)

  const place = async (buf) => {
    if (!buf) return
    const m = await sharp(buf).metadata()
    layers.push({
      input: buf,
      left: Math.round((W - m.width) / 2),
      top: Math.round(cursor - m.height),
    })
    cursor = cursor - m.height - gap
  }

  await place(await textLayer(card.signature, {
    font: 'Caveat', size: signSize, color: INK, width: Math.round(W * 0.6),
  }))
  await place(await textLayer(card.message, {
    font: 'Lora', size: msgSize, color: INK, width: Math.round(W * 0.76),
  }))
  await place(await textLayer(card.name, {
    font: 'Playfair Display', size: nameSize, color: ACCENT,
    width: W - PAD * 2, weight: 'Bold',
  }))

  if (card.name) {
    layers.push({
      input: {
        create: {
          width: ruleW, height: ruleH, channels: 4,
          background: { r: 0xc8, g: 0x54, b: 0x3d, alpha: 0.55 },
        },
      },
      left: Math.round((W - ruleW) / 2),
      top: Math.max(0, Math.round(cursor)),
    })
  }

  return sharp(base).composite(layers).png().toBuffer()
}

/* ------------------------------------------------------------------ */
/* 上传                                                                */
/* ------------------------------------------------------------------ */
async function r2Put(key, file, contentType, cacheControl) {
  await exec('npx', [
    'wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`,
    '--remote', '--file', file,
    '--content-type', contentType,
    '--cache-control', cacheControl,
  ], { cwd: process.cwd(), maxBuffer: 1024 * 1024 * 8 })
}

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(path.join(OUT_DIR, 'showcase'), { recursive: true })

  console.log('── 拉底图并合成成品 ──')
  for (const card of CARDS) {
    const url = `${ASSET_BASE}/source/${card.id}.jpg?cb=${Date.now()}`
    const res = await fetch(url)
    if (!res.ok) {
      console.log(`  x ${card.id}：底图拉取失败 ${res.status}`)
      continue
    }
    const src = Buffer.from(await res.arrayBuffer())
    const composed = await composeCard(src, card)
    const out = path.join(OUT_DIR, 'showcase', `${card.id}.webp`)
    await sharp(composed)
      .resize({ width: 900 })
      .webp({ quality: 84 })
      .toFile(out)
    console.log(`  v ${card.id}`)
  }

  if (DRY) {
    console.log('\n--dry-run：只构建到 .assets/，未上传')
    return
  }

  console.log('── 上传到 R2 ──')
  for (const card of CARDS) {
    const file = path.join(OUT_DIR, 'showcase', `${card.id}.webp`)
    try {
      await r2Put(`showcase/${card.id}.webp`, file, 'image/webp', 'public, max-age=604800')
      console.log(`  v showcase/${card.id}.webp`)
    } catch (e) {
      console.log(`  x showcase/${card.id}.webp：${e.message?.slice(0, 120)}`)
    }
  }
}

main().catch((e) => {
  console.error('构建失败:', e)
  process.exit(1)
})
