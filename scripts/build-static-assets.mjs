#!/usr/bin/env node
/**
 * 构建并上传「其余」静态资源：字体、样例底图、社交分享图
 *
 * ⚠️ 这些资源不在 public/ 里（不跟应用包走），统一放 R2 公开桶
 *    craftai-assets，通过 https://assets.yozzytools.com 直链访问。
 *
 * 字体：从 Google Fonts 下载可变字体 → fontTools 实例化成静态 ttf → 上传
 *      （scripts/build-fonts.py 做实例化，本脚本负责下载+上传）
 * 样例：R2 上 source/ 的无文字底图裁成 1024px WebP → samples/
 * 社交图：成品图 + 排版 → 1200×630 JPG
 *
 * 用法：node scripts/build-static-assets.mjs
 */
import { execFile } from 'node:child_process'
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises'
import { promisify } from 'node:util'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const exec = promisify(execFile)

const ASSET_BASE = 'https://assets.yozzytools.com'
const BUCKET = 'craftai-assets'
const OUT = path.resolve('.assets')
const DRY = process.argv.includes('--dry-run')

/** 样例图（用户没照片时的兜底）—— 必须是无文字的底图 */
const SAMPLE_IDS = [
  'person-pet', 'person-grandma', 'person-mum', 'scene-christmas', 'scene-wallart',
]

/** 品牌字体：可变字体 URL + 需要实例化的字重 */
const FONTS = [
  { family: 'playfairdisplay', camel: 'PlayfairDisplay', weight: 400, out: 'PlayfairDisplay-Regular.ttf' },
  { family: 'playfairdisplay', camel: 'PlayfairDisplay', weight: 600, out: 'PlayfairDisplay-SemiBold.ttf' },
  { family: 'playfairdisplay', camel: 'PlayfairDisplay', weight: 700, out: 'PlayfairDisplay-Bold.ttf' },
  { family: 'caveat', camel: 'Caveat', weight: 400, out: 'Caveat-Regular.ttf' },
  { family: 'caveat', camel: 'Caveat', weight: 700, out: 'Caveat-Bold.ttf' },
  { family: 'lora', camel: 'Lora', weight: 400, out: 'Lora-Regular.ttf' },
  { family: 'lora', camel: 'Lora', weight: 600, out: 'Lora-SemiBold.ttf' },
  // 全站正文/标题字体（原来从 Google Fonts 外链加载 —— GDPR 问题）
  { family: 'manrope', camel: 'Manrope', weight: 400, out: 'Manrope-Regular.ttf' },
  { family: 'manrope', camel: 'Manrope', weight: 500, out: 'Manrope-Medium.ttf' },
  { family: 'manrope', camel: 'Manrope', weight: 600, out: 'Manrope-SemiBold.ttf' },
  { family: 'manrope', camel: 'Manrope', weight: 700, out: 'Manrope-Bold.ttf' },
  { family: 'sora', camel: 'Sora', weight: 500, out: 'Sora-Medium.ttf' },
  { family: 'sora', camel: 'Sora', weight: 600, out: 'Sora-SemiBold.ttf' },
  { family: 'sora', camel: 'Sora', weight: 700, out: 'Sora-Bold.ttf' },
  { family: 'sora', camel: 'Sora', weight: 800, out: 'Sora-ExtraBold.ttf' },
]

function existsFile(p) {
  try { return existsSync(p) } catch { return false }
}

async function r2Put(key, file, contentType, cacheControl) {
  await exec('npx', [
    'wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`,
    '--remote', '--file', file,
    '--content-type', contentType,
    '--cache-control', cacheControl,
  ], { cwd: process.cwd(), maxBuffer: 1024 * 1024 * 8 })
}

async function buildFonts() {
  console.log('── 字体 ──')
  await mkdir(path.join(OUT, 'fonts'), { recursive: true })
  const tmp = path.join(OUT, '_var')
  await mkdir(tmp, { recursive: true })

  for (const f of FONTS) {
    const varPath = path.join(tmp, `${f.family}.ttf`)
    if (!existsFile(varPath)) {
      const url = `https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/${f.family}/${f.camel}%5Bwght%5D.ttf`
      const res = await fetch(url)
      if (!res.ok) { console.log(`  x ${f.out}：下载失败 ${res.status}`); continue }
      await writeFile(varPath, Buffer.from(await res.arrayBuffer()))
    }
    // 实例化：可变字体 → 静态 ttf（librsvg / fontconfig 不吃可变轴）
    const outFile = path.join(OUT, 'fonts', f.out)
    // 已经生成过就跳过（重跑只补缺失的）
    if (existsFile(outFile)) {
      console.log(`  - fonts/${f.out} 已存在`)
      continue
    }
    const inst = (updateNames) => exec('python3', [
      '-c', `
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
f = TTFont(sys.argv[1])
inst = instancer.instantiateVariableFont(f, {"wght": int(sys.argv[3])}, updateFontNames=${updateNames})
inst.save(sys.argv[2])
`, varPath, outFile, String(f.weight),
    ], { cwd: process.cwd() })
    try {
      await inst('True')
      console.log(`  v fonts/${f.out}`)
    } catch (e) {
      // ⚠️ 某些字重（如 Sora 500）在 updateFontNames=True 时会因 name 表冲突失败，
      //    退一步不改名即可 —— 文件名/字体名对外是我们自己定的
      try {
        await inst('False')
        console.log(`  v fonts/${f.out}（未改名）`)
      } catch (e2) {
        console.log(`  x fonts/${f.out}：实例化失败 ${String(e2.message || e2).slice(0, 100)}`)
      }
    }
  }
}

async function buildSamples() {
  console.log('── 样例底图 ──')
  await mkdir(path.join(OUT, 'samples'), { recursive: true })
  for (const id of SAMPLE_IDS) {
    const res = await fetch(`${ASSET_BASE}/source/${id}.jpg?cb=${Date.now()}`)
    if (!res.ok) { console.log(`  x ${id}：${res.status}`); continue }
    const buf = Buffer.from(await res.arrayBuffer())
    const outFile = path.join(OUT, 'samples', `${id}.webp`)
    await sharp(buf).resize({ width: 1024 }).webp({ quality: 82 }).toFile(outFile)
    console.log(`  v samples/${id}.webp`)
  }
}

async function buildOgImage() {
  console.log('── 社交分享图 ──')
  const res = await fetch(`${ASSET_BASE}/showcase/person-pet.webp?cb=${Date.now()}`)
  if (!res.ok) { console.log(`  x og-image：${res.status}`); return }
  const src = Buffer.from(await res.arrayBuffer())
  const meta = await sharp(src).metadata()
  // 先裁掉成品图底部的文字区，再 cover 到 540×630
  const cropH = Math.round(meta.height * 0.72)
  const card = await sharp(src)
    .extract({ left: 0, top: 0, width: meta.width, height: cropH })
    .resize(540, 630, { fit: 'cover' })
    .toBuffer()

  const bar = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#fbf7f1"/>
    <text x="70" y="245" font-family="Georgia, serif" font-size="58" fill="#2a2420">Create Keepsakes</text>
    <text x="70" y="320" font-family="Georgia, serif" font-size="34" fill="#c8543d">Cards for the people</text>
    <text x="70" y="362" font-family="Georgia, serif" font-size="34" fill="#c8543d">you love</text>
    <text x="70" y="430" font-family="Helvetica, Arial, sans-serif" font-size="23" fill="#6b5f55">Their photo. Their name spelled right.</text>
    <text x="70" y="464" font-family="Helvetica, Arial, sans-serif" font-size="23" fill="#6b5f55">Ready to print at 300 DPI.</text>
    <text x="70" y="545" font-family="Helvetica, Arial, sans-serif" font-size="25" fill="#c8543d">create.yozzytools.com</text>
  </svg>`)

  const outFile = path.join(OUT, 'og-image.jpg')
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#fbf7f1' } })
    .png()
    .composite([{ input: bar, left: 0, top: 0 }, { input: card, left: 660, top: 0 }])
    .jpeg({ quality: 90 })
    .toFile(outFile)
  console.log('  v og-image.jpg')
}

async function uploadAll() {
  console.log('── 上传 ──')
  const jobs = [
    { dir: 'fonts', prefix: 'fonts', ct: 'font/ttf', cc: 'public, max-age=31536000, immutable' },
    { dir: 'samples', prefix: 'samples', ct: 'image/webp', cc: 'public, max-age=604800' },
  ]
  for (const j of jobs) {
    const dir = path.join(OUT, j.dir)
    let files = []
    try { files = await readdir(dir) } catch { continue }
    for (const f of files) {
      try {
        await r2Put(`${j.prefix}/${f}`, path.join(dir, f), j.ct, j.cc)
        console.log(`  v ${j.prefix}/${f}`)
      } catch (e) {
        console.log(`  x ${j.prefix}/${f}：${e.message?.slice(0, 100)}`)
      }
    }
  }
  // 社交图
  try {
    await r2Put('og-image.jpg', path.join(OUT, 'og-image.jpg'), 'image/jpeg', 'public, max-age=604800')
    console.log('  v og-image.jpg')
  } catch (e) {
    console.log(`  x og-image.jpg：${e.message?.slice(0, 100)}`)
  }
  // 字体许可（OFL 要求随字体分发）
  for (const fam of ['Caveat', 'Lora', 'PlayfairDisplay']) {
    const slug = fam.toLowerCase()
    try {
      const res = await fetch(`https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/${slug}/OFL.txt`)
      if (!res.ok) continue
      const tmp = path.join(OUT, `OFL-${fam}.txt`)
      await writeFile(tmp, Buffer.from(await res.arrayBuffer()))
      await r2Put(`fonts/OFL-${fam}.txt`, tmp, 'text/plain', 'public, max-age=604800')
      console.log(`  v fonts/OFL-${fam}.txt`)
    } catch { /* 许可文件失败不阻塞 */ }
  }
}

async function main() {
  await mkdir(OUT, { recursive: true })
  await buildFonts()
  await buildSamples()
  await buildOgImage()
  if (DRY) {
    console.log('\n--dry-run：未上传')
    return
  }
  await uploadAll()
}

main().catch((e) => {
  console.error('失败:', e)
  process.exit(1)
})
