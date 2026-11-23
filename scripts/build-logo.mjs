#!/usr/bin/env node
/**
 * Create Keepsakes 品牌 logo 生成
 *
 * 设计说明（2026-11-23 定稿，V4「手写花押字 C」）：
 *   5 方案对比（scripts/build-favicon-options.mjs + designs/greetings-island/favicon-方案对比.html）
 *   用户选定 V4：珊瑚圆角方块 + 白色 Pacifico 手写 "C"。
 *   依据：favicon 与顶栏字标（public/brand-wordmark.svg，同款 Pacifico）
 *   视觉同源 —— 大厂常见做法（Slack 的 #、Notion 的 N）。
 *   16px 下 "C" 笔画粗、负空间大，生存率优于多元素组合。
 *
 * 颜色取自品牌色板：珊瑚红 #c8543d / 奶油 #fbf7f1 / 深墨 #2a2420
 *
 * 为什么手写 SVG 而不是 AI 生图：
 *   logo 必须在 16px favicon 到 1024px 大图之间都清晰可读，
 *   AI 生图做不到几何精确（小尺寸会糊、边缘会脏）。
 *
 * 产出：public/logo.png（1024）+ favicon.ico（32/16）+ logo-512.png + logo-mark.png
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import opentype from 'opentype.js'

const CREAM = '#fbf7f1'
const CORAL = '#c8543d'
const CORAL_DEEP = '#a53f2c'
const INK = '#2a2420'
const PAPER = '#fffdfa'
const BEIGE = '#f3e4d3'

/** 心形 path（24 网格经典心形，随 g transform 缩放） */
const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'

/**
 * 小尺寸版（导航 logo / favicon 用）—— V4「手写花押字 C」
 *
 * 珊瑚圆角方块 + 白色 Pacifico "C"（矢量轮廓，无 web 字体依赖）。
 * 与顶栏字标同款字体 → favicon 与品牌字标视觉同源。
 * TTF 从 scripts/output/fonts-cache/Pacifico-Regular.ttf 读
 * （由 scripts/build-wordmark.mjs 首次下载缓存；OFL 1.1 许可）。
 */
async function pacificoCDisplayGlyph() {
  const ttfPath = path.resolve('scripts/output/fonts-cache/Pacifico-Regular.ttf')
  const buf = await readFile(ttfPath)
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
  const p = font.getPath('C', 0, 0, 100)
  const b = p.getBoundingBox()
  // 归一到 (0,0) 起点（避开 opentype.js 2.0.0 toPathData 会输出 NaN 的坑，自行序列化）
  const r = (v) => String(Math.round(v * 100) / 100)
  const d = p.commands.map((c) => {
    const rx = (v) => r(v - b.x1)
    const ry = (v) => r(v - b.y1)
    switch (c.type) {
      case 'M': return `M${rx(c.x)} ${ry(c.y)}`
      case 'L': return `L${rx(c.x)} ${ry(c.y)}`
      case 'Q': return `Q${rx(c.x1)} ${ry(c.y1)} ${rx(c.x)} ${ry(c.y)}`
      case 'C': return `C${rx(c.x1)} ${ry(c.y1)} ${rx(c.x2)} ${ry(c.y2)} ${rx(c.x)} ${ry(c.y)}`
      case 'Z': return 'Z'
      default: return ''
    }
  }).join('')
  const w = b.x2 - b.x1
  const h = b.y2 - b.y1
  return { d, w, h }
}

async function markSvg(size = 32) {
  const { d, w, h } = await pacificoCDisplayGlyph()
  // 字形缩放到画布的 ~68% 高，视觉居中（手写体右下有甩尾，重心略偏下）
  const s = (1024 * 0.68) / h
  const tx = 512 - (w * s) / 2
  const ty = 512 - (h * s) / 2 - 12
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="228" fill="${CORAL}"/>
  <g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${s.toFixed(3)})">
    <path d="${d}" fill="${PAPER}"/>
  </g>
</svg>`
}

/**
 * 完整版（og:image / 大图）——奶油底 + 深墨描边环（浅背景上有边界），
 * 信封加墨线细节 + 地址装饰行 + 手写波浪（保留品牌笔触）。
 */
function logoSvg(size = 1024) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <rect x="0" y="0" width="1024" height="1024" rx="228" fill="${CREAM}"/>
  <rect x="16" y="16" width="992" height="992" rx="214" fill="none" stroke="${INK}" stroke-width="32"/>

  <!-- 信封主体 -->
  <rect x="150" y="404" width="724" height="440" rx="44" fill="${PAPER}" stroke="${INK}" stroke-width="20"/>
  <!-- 封盖三角 -->
  <path d="M186 434 L512 672 L838 434 Z" fill="${BEIGE}" stroke="${INK}" stroke-width="20" stroke-linejoin="round"/>
  <!-- 探出的爱心 -->
  <g transform="translate(314 140) scale(16.5)">
    <path d="${HEART_PATH}" fill="${CORAL}" stroke="${INK}" stroke-width="0.7" stroke-linejoin="round"/>
  </g>
  <!-- 地址装饰行（信封下缘） -->
  <rect x="256" y="724" width="300" height="22" rx="11" fill="${INK}" opacity="0.5"/>
  <rect x="256" y="768" width="220" height="18" rx="9" fill="${INK}" opacity="0.28"/>
  <!-- 手写波浪（品牌笔触） -->
  <path d="M536 776 q 34 -30 62 -4 t 62 -6" stroke="${CORAL}" stroke-width="14" fill="none" stroke-linecap="round"/>
</svg>`
}

async function main() {
  const outDir = path.resolve('public')
  await mkdir(outDir, { recursive: true })
  const previewDir = path.resolve('scripts/output')
  await mkdir(previewDir, { recursive: true })

  const svg = Buffer.from(logoSvg(1024))

  // 主 logo
  const main = await sharp(svg).png({ compressionLevel: 9 }).toBuffer()
  await writeFile(path.join(outDir, 'logo.png'), main)
  console.log(`v public/logo.png (1024x1024, ${(main.length / 1024).toFixed(1)}KB)`)

  // 512（社交/Apple touch 备用）
  const l512 = await sharp(svg).resize(512, 512).png().toBuffer()
  await writeFile(path.join(outDir, 'logo-512.png'), l512)
  console.log(`v public/logo-512.png (${(l512.length / 1024).toFixed(1)}KB)`)

  // 导航用的 mark（512px，各处 <img> 用）
  const mark = Buffer.from(await markSvg(1024))
  const mark512 = await sharp(mark).resize(512, 512).png().toBuffer()
  await writeFile(path.join(outDir, 'logo-mark.png'), mark512)
  console.log(`v public/logo-mark.png (512x512, ${(mark512.length / 1024).toFixed(1)}KB)`)

  // favicon：32 / 16 + ICO 容器
  const l32 = await sharp(mark).resize(32, 32).png().toBuffer()
  const l16 = await sharp(mark).resize(16, 16).png().toBuffer()
  const ico = await buildIco([
    { size: 32, data: l32 },
    { size: 16, data: l16 },
  ])
  await writeFile(path.join(outDir, 'favicon.ico'), ico)
  console.log(`v public/favicon.ico (32+16, ${(ico.length / 1024).toFixed(1)}KB)`)

  // 完整版预览
  const preview = await sharp(svg)
    .resize(512, 512)
    .flatten({ background: '#e9dfd0' })
    .png()
    .toBuffer()
  await writeFile(path.join(previewDir, 'logo-preview.png'), preview)
  console.log(`v ${previewDir}/logo-preview.png`)

  // mark 各尺寸并排预览：模拟真实 favicon 使用场景（含 16px）
  const sizes = [16, 24, 32, 48, 64]
  const composites = []
  let left = 20
  for (const s of sizes) {
    const buf = await sharp(mark).resize(s, s).png().toBuffer()
    composites.push({ input: buf, left, top: 45 - Math.round(s / 2) })
    left += s + 28
  }
  await sharp({ create: { width: left + 20, height: 90, channels: 3, background: '#fbf7f1' } })
    .png()
    .composite(composites)
    .toFile(path.join(previewDir, 'logo-mark-preview.png'))
  console.log(`v ${previewDir}/logo-mark-preview.png`)

  // 深色 tab 场景预览（浏览器深色主题下 favicon 是否可辨）
  const darkBufs = []
  let dleft = 20
  for (const s of [16, 24, 32]) {
    const buf = await sharp(mark).resize(s, s).png().toBuffer()
    darkBufs.push({ input: buf, left: dleft, top: 30 - Math.round(s / 2) })
    dleft += s + 28
  }
  await sharp({ create: { width: dleft + 20, height: 60, channels: 3, background: '#2b2b2b' } })
    .png()
    .composite(darkBufs)
    .toFile(path.join(previewDir, 'logo-mark-dark.png'))
  console.log(`v ${previewDir}/logo-mark-dark.png`)
}

/** 把 PNG 组装成 ICO 容器（PNG 压缩格式，浏览器全支持） */
function buildIco(entries) {
  const count = entries.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type = icon
  header.writeUInt16LE(count, 4)

  const dir = Buffer.alloc(16 * count)
  let offset = 6 + dir.length
  entries.forEach((e, i) => {
    const o = i * 16
    dir.writeUInt8(e.size === 256 ? 0 : e.size, o) // width
    dir.writeUInt8(e.size === 256 ? 0 : e.size, o + 1) // height
    dir.writeUInt8(0, o + 2) // palette
    dir.writeUInt8(0, o + 3) // reserved
    dir.writeUInt16LE(1, o + 4) // color planes
    dir.writeUInt16LE(32, o + 6) // bits per pixel
    dir.writeUInt32LE(e.data.length, o + 8)
    dir.writeUInt32LE(offset, o + 12)
    offset += e.data.length
  })

  return Buffer.concat([header, dir, ...entries.map(e => e.data)])
}

main().catch((e) => {
  console.error('logo 生成失败:', e)
  process.exit(1)
})
