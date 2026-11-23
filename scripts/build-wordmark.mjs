#!/usr/bin/env node
/**
 * 品牌字标 → SVG 图片（public/brand-wordmark.svg）
 *
 * 为什么封装成图片而不是继续用 web 字体：
 *   字标用的是 Pacifico（手写 script）+ Manrope Bold（间隔大写）。
 *   web 字体有加载窗口 —— 首屏 SSR 出来先是 fallback 字体，
 *   字体下载完才换成 Pacifico（FOUT），水合阶段观感"闪一下"。
 *   把文字转成矢量路径（outline）后就是普通图片：
 *   HTML 里是什么字体渲染的，用户看到就是什么，零闪烁、零额外字体请求。
 *
 * 实现：opentype.js 读 TTF → glyph 轮廓 → SVG <path>。
 * 注意：opentype.js 手动拼接的 Path.getBoundingBox() 不可靠，
 *       整串文字直接 font.getPath()（它自己定位 glyph），
 *       带字距的 caps 用每字 bbox 手动累加 min/max。
 * 产出：public/brand-wordmark.svg（固定品牌色，header/footer 共用）
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import opentype from 'opentype.js'

const CORAL = '#c8543d'
const INK = '#2a2420'

const CACHE = path.resolve('scripts/output/fonts-cache')

async function loadFont(file) {
  const buf = await readFile(path.join(CACHE, file))
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
}

/** 带手动 letter-spacing 的整串文字路径 + 手动累加 bbox */
function spacedPath(font, text, x, y, fontSize, letterSpacing = 0) {
  const p = new opentype.Path()
  let cursor = x
  const bb = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity }
  for (const ch of text) {
    const gp = font.getPath(ch, cursor, y, fontSize)
    for (const c of gp.commands) p.commands.push(c)
    const b = gp.getBoundingBox()
    bb.x1 = Math.min(bb.x1, b.x1)
    bb.y1 = Math.min(bb.y1, b.y1)
    bb.x2 = Math.max(bb.x2, b.x2)
    bb.y2 = Math.max(bb.y2, b.y2)
    cursor += font.getAdvanceWidth(ch, fontSize) + letterSpacing
  }
  return { path: p, bbox: bb }
}

/**
 * 自行从 commands 序列化 path data。
 * ⚠️ 不用 opentype.js 的 toPathData()：2.0.0 版本该函数会输出 NaN 坐标，
 *    librsvg 渲染到 NaN 就整条路径烂掉（实测踩坑）。
 */
function pathToSvg(p) {
  const r = (v) => {
    const n = Math.round(v * 100) / 100
    return Number.isFinite(n) ? String(n) : '0'
  }
  return p.commands
    .map((c) => {
      switch (c.type) {
        case 'M': return `M${r(c.x)} ${r(c.y)}`
        case 'L': return `L${r(c.x)} ${r(c.y)}`
        case 'Q': return `Q${r(c.x1)} ${r(c.y1)} ${r(c.x)} ${r(c.y)}`
        case 'C': return `C${r(c.x1)} ${r(c.y1)} ${r(c.x2)} ${r(c.y2)} ${r(c.x)} ${r(c.y)}`
        case 'Z': return 'Z'
        default: return ''
      }
    })
    .join('')
}

async function main() {
  const pacifico = await loadFont('Pacifico-Regular.ttf')
  const manrope = await loadFont('Manrope-Bold.ttf')

  // 内部坐标系：script 字号 = 100（CSS 想要多大就缩放整个 svg）
  const S = 100
  const capsSize = (0.6 / 1.3) * S // ≈46，对应原 CSS 0.6rem/1.3rem
  const capsSpacing = 0.26 * capsSize // 0.26em letter-spacing

  // 第一遍：先画再量，拿视觉 bbox
  const dScript = pacifico.getPath('Create', 0, 0, S)
  const dCaps = spacedPath(manrope, 'KEEPSAKES', 0, 0, capsSize, capsSpacing)

  // 归一：script 视觉顶部 = 0，左边缘 = 0（对齐 caps 左缘）
  const sx = -dScript.getBoundingBox().x1
  const sy = -dScript.getBoundingBox().y1
  const script = pacifico.getPath('Create', sx, sy, S)
  const scriptBbox = script.getBoundingBox()
  const scriptBottom = scriptBbox.y2

  // caps：视觉顶部 = script 视觉底部 + GAP，左边缘与 script 对齐
  const GAP = 6
  const capsY = scriptBottom + GAP - dCaps.bbox.y1
  const capsDraft = spacedPath(manrope, 'KEEPSAKES', sx, capsY, capsSize, capsSpacing)
  // K 字形有负边距（视觉左缘超出绘制起点 ~3 单位），再平移把视觉左缘归到 0
  const caps = spacedPath(
    manrope, 'KEEPSAKES', sx - capsDraft.bbox.x1, capsY, capsSize, capsSpacing,
  )

  const width = Math.ceil(Math.max(scriptBbox.x2, caps.bbox.x2))
  const height = Math.ceil(caps.bbox.y2)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Create Keepsakes">
  <!-- 品牌字标：文字已转矢量路径（Pacifico script + Manrope Bold caps），
       不依赖 web 字体，无 FOUT 闪烁。由 scripts/build-wordmark.mjs 生成，勿手改。 -->
  <path fill="${CORAL}" d="${pathToSvg(script)}"/>
  <path fill="${INK}" d="${pathToSvg(caps.path)}"/>
</svg>
`

  const out = path.resolve('public/brand-wordmark.svg')
  await writeFile(out, svg)
  console.log(`v public/brand-wordmark.svg (${(svg.length / 1024).toFixed(1)}KB, viewBox 0 0 ${width} ${height})`)
  console.log('script bbox', JSON.stringify(script.getBoundingBox()), 'caps bbox', JSON.stringify(caps.bbox))

  // 预览 PNG（奶油底）供人工核对
  const { default: sharp } = await import('sharp')
  const png = await sharp(Buffer.from(svg), { density: 300 })
    .flatten({ background: '#fbf7f1' })
    .png()
    .toBuffer()
  await writeFile(path.resolve('scripts/output/wordmark-preview.png'), png)
  console.log('v scripts/output/wordmark-preview.png')
}

main().catch((e) => {
  console.error('wordmark 生成失败:', e)
  process.exit(1)
})
