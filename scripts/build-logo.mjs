#!/usr/bin/env node
/**
 * Create Keepsakes 品牌 logo 生成
 *
 * 设计说明（为什么是这个图形）：
 *   品牌一句话是「贺卡 + 装饰画」两件货。
 *   所以 logo 画的是：一张竖版贺卡（带画面和一行字），
 *   后面斜靠着一个小画框 —— 贺卡和画框，一个图形说完两件事。
 *
 * 颜色全部取自品牌色板（见 assets/css/tokens 与各页的 --ck-* 变量）：
 *   奶油底 #fbf7f1 / 珊瑚红 #c8543d / 深墨 #2a2420 / 鼠尾草绿 #2f4034 / 金 #c9a227
 *
 * 为什么手写 SVG 而不是 AI 生图：
 *   logo 必须在 16px favicon 到 1024px 大图之间都清晰可读，
 *   AI 生图做不到几何精确（小尺寸会糊、边缘会脏）。
 *
 * 产出：public/logo.png（1024）+ favicon.ico（32/16）+ logo-512.png
 */
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const CREAM = '#fbf7f1'
const CORAL = '#c8543d'
const INK = '#2a2420'
const SAGE = '#2f4034'
const GOLD = '#c9a227'
const PAPER = '#fffdfa'

/**
 * 1024×1024 主图形
 * 构图：圆角方底 → 后面斜靠的画框 → 前面竖版贺卡（卡里一幅小风景 + 一行字）
 */
function logoSvg(size = 1024) {
  const s = size / 1024
  const px = (v) => (v * s).toFixed(2)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <!-- 底：奶油色圆角方 -->
  <rect x="0" y="0" width="1024" height="1024" rx="228" fill="${CREAM}"/>
  <rect x="6" y="6" width="1012" height="1012" rx="224" fill="none" stroke="#e9dfd0" stroke-width="12"/>

  <!-- 后层：斜靠的画框（装饰画） -->
  <g transform="rotate(11 700 470)">
    <rect x="520" y="230" width="420" height="480" rx="26" fill="#f3e9da" stroke="${INK}" stroke-width="16"/>
    <rect x="566" y="276" width="328" height="388" rx="12" fill="#fdfaf4"/>
    <!-- 画框里的小风景：地平线 + 太阳 -->
    <circle cx="672" cy="404" r="52" fill="${CORAL}"/>
    <path d="M566 560 Q 640 508 706 552 T 894 528 L 894 664 L 566 664 Z" fill="${SAGE}" opacity="0.9"/>
    <path d="M566 592 Q 660 556 742 592 T 894 574 L 894 664 L 566 664 Z" fill="${SAGE}"/>
  </g>

  <!-- 前层：竖版贺卡 -->
  <g transform="rotate(-8 400 560)">
    <rect x="176" y="252" width="452" height="612" rx="34" fill="${PAPER}" stroke="${CORAL}" stroke-width="18"/>
    <!-- 卡里的画面 -->
    <rect x="228" y="308" width="348" height="330" rx="18" fill="#fdf8ef"/>
    <circle cx="352" cy="404" r="46" fill="${GOLD}"/>
    <path d="M228 512 Q 320 466 402 506 T 576 486 L 576 638 L 228 638 Z" fill="#8fa98f"/>
    <path d="M228 552 Q 330 516 430 550 T 576 532 L 576 638 L 228 638 Z" fill="${SAGE}"/>
    <!-- 一行「文字」：我们排版的那行字 -->
    <rect x="228" y="690" width="220" height="26" rx="13" fill="${INK}" opacity="0.86"/>
    <rect x="228" y="736" width="300" height="18" rx="9" fill="${INK}" opacity="0.42"/>
    <rect x="228" y="770" width="180" height="18" rx="9" fill="${INK}" opacity="0.28"/>
    <!-- 手写签名：一条起伏的线 -->
    <path d="M420 782 q 34 -30 62 -4 t 62 -6" stroke="${CORAL}" stroke-width="14" fill="none" stroke-linecap="round"/>
  </g>
</svg>`
}

/**
 * 简化版（favicon 用）
 *
 * 完整版在 16px 下会糊成一团 —— 内部的风景、文字行全是噪点。
 * favicon 只保留「两张叠着的卡片」的轮廓：小尺寸下能认出形状就够了。
 */
function markSvg(size = 32) {
  const s = size / 1024
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <rect x="0" y="0" width="1024" height="1024" rx="228" fill="${CREAM}"/>
  <g transform="rotate(11 700 470)">
    <rect x="520" y="230" width="420" height="480" rx="40" fill="#f3e9da" stroke="${INK}" stroke-width="52"/>
  </g>
  <g transform="rotate(-8 400 560)">
    <rect x="176" y="252" width="452" height="612" rx="48" fill="${PAPER}" stroke="${CORAL}" stroke-width="64"/>
  </g>
</svg>`
}

async function main() {
  const outDir = path.resolve('public')
  await mkdir(outDir, { recursive: true })

  const svg = Buffer.from(logoSvg(1024))

  // 主 logo
  const main = await sharp(svg).png({ compressionLevel: 9 }).toBuffer()
  await writeFile(path.join(outDir, 'logo.png'), main)
  console.log(`v public/logo.png (1024x1024, ${(main.length / 1024).toFixed(1)}KB)`)

  // 512（社交/Apple touch 备用）
  const l512 = await sharp(svg).resize(512, 512).png().toBuffer()
  await writeFile(path.join(outDir, 'logo-512.png'), l512)
  console.log(`v public/logo-512.png (${(l512.length / 1024).toFixed(1)}KB)`)

  // favicon：32 / 16 + ICO 容器（用简化版，完整版在 16px 下认不出）
  const mark = Buffer.from(markSvg(32))
  const l32 = await sharp(mark).resize(32, 32).png().toBuffer()
  const l16 = await sharp(mark).resize(16, 16).png().toBuffer()
  const ico = await buildIco([
    { size: 32, data: l32 },
    { size: 16, data: l16 },
  ])
  await writeFile(path.join(outDir, 'favicon.ico'), ico)
  console.log(`v public/favicon.ico (32+16, ${(ico.length / 1024).toFixed(1)}KB)`)

  // 预览
  const preview = await sharp(svg)
    .resize(512, 512)
    .flatten({ background: '#e9dfd0' })
    .png()
    .toBuffer()
  await writeFile('/workspace/output/logo-preview.png', preview)
  console.log('v /workspace/output/logo-preview.png')

  // 简化版预览：16/24/32/48 并排，模拟真实使用
  const mark32 = await sharp(mark).resize(32, 32).png().toBuffer()
  const mark16 = await sharp(mark).resize(16, 16).png().toBuffer()
  const mark24 = await sharp(mark).resize(24, 24).png().toBuffer()
  const mark48 = await sharp(mark).resize(48, 48).png().toBuffer()
  await sharp({ create: { width: 260, height: 90, channels: 3, background: '#fbf7f1' } })
    .png()
    .composite([
      { input: mark16, left: 20, top: 37 },
      { input: mark24, left: 60, top: 33 },
      { input: mark32, left: 110, top: 29 },
      { input: mark48, left: 170, top: 21 },
    ])
    .png()
    .toFile('/workspace/output/logo-mark.png')
  console.log('v /workspace/output/logo-mark.png')
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
