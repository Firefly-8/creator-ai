/**
 * 生成首页配图：Hero 背景 + 用户头像
 * 使用 MiniMax image_generation API
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'generated')

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const API_KEY = process.env.MINIMAX_API_KEY
const BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com'

if (!API_KEY) {
  console.error('错误: MINIMAX_API_KEY 未配置')
  process.exit(1)
}

/**
 * 调用 MiniMax 图片生成 API
 */
async function generateImage(prompt, aspectRatio = '16:9', count = 1) {
  console.log(`生成中: ${prompt.slice(0, 60)}...`)
  
  const res = await fetch(`${BASE_URL}/v1/image_generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      prompt,
      model: 'image-01',
      aspect_ratio: aspectRatio,
      n: count,
      response_format: 'url',
      prompt_optimizer: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MiniMax API ${res.status}: ${err}`)
  }

  const json = await res.json()
  const urls = []
  
  // 提取图片 URL
  if (json.data?.image_urls) {
    urls.push(...json.data.image_urls)
  } else if (json.data?.image_base64) {
    // 如果有 base64，保存为文件
    for (const b64 of json.data.image_base64) {
      urls.push(`data:image/png;base64,${b64}`)
    }
  }

  return urls
}

/**
 * 下载图片到本地
 */
async function downloadImage(url, filename) {
  const filepath = path.join(OUTPUT_DIR, filename)
  
  // 如果是 data URL
  if (url.startsWith('data:')) {
    const base64 = url.split(',')[1]
    fs.writeFileSync(filepath, Buffer.from(base64, 'base64'))
    console.log(`✓ 已保存: ${filepath}`)
    return
  }

  const res = await fetch(url)
  if (!res.ok) throw new Error(`下载失败: ${res.status}`)
  
  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(filepath, buffer)
  console.log(`✓ 已保存: ${filepath}`)
}

// ============ 生成任务 ============

const tasks = []

// 1. Hero 背景 - AI 生成艺术
tasks.push({
  name: 'hero-bg',
  prompt: 'A breathtaking cosmic scene where vibrant streams of digital data transform into flowing musical notes and colorful paint strokes, swirling nebula of purple blue and gold, particles of light creating abstract sound waves, ultra wide cinematic composition, deep dark background with luminous accents, professional digital art, 8K quality, dramatic lighting, no text no letters no words',
  aspectRatio: '16:9',
  filename: 'hero-bg.jpg',
})

// 2. 头像 1 - 白人女性 (Sarah)
tasks.push({
  name: 'avatar-sarah',
  prompt: 'Professional headshot portrait of a young Caucasian woman with warm smile, soft natural lighting, wearing casual modern clothing, clean blurred background with subtle purple accent bokeh, photorealistic, 85mm lens look, warm and approachable expression, high quality portrait photography',
  aspectRatio: '1:1',
  filename: 'avatar-sarah.jpg',
})

// 3. 头像 2 - 黑人男性 (James)
tasks.push({
  name: 'avatar-james',
  prompt: 'Professional headshot portrait of a young Black man with confident expression, clean-shaven, wearing smart casual shirt, soft studio lighting with subtle purple accent, neutral grey background, photorealistic, 85mm portrait lens, modern professional look, high quality corporate headshot style',
  aspectRatio: '1:1',
  filename: 'avatar-james.jpg',
})

// 4. 头像 3 - 亚裔男性 (Mike)
tasks.push({
  name: 'avatar-mike',
  prompt: 'Professional headshot portrait of a young Asian man with friendly smile, wearing casual modern top, warm natural window light, soft bokeh background with subtle violet tones, photorealistic, 85mm lens, approachable creative professional look, high quality portrait photography',
  aspectRatio: '1:1',
  filename: 'avatar-mike.jpg',
})

// ============ 执行 ============

async function main() {
  console.log('🎨 开始生成首页配图...\n')
  
  for (const task of tasks) {
    try {
      console.log(`\n[${task.name}]`)
      const urls = await generateImage(task.prompt, task.aspectRatio)
      if (urls.length > 0) {
        await downloadImage(urls[0], task.filename)
      }
    } catch (err) {
      console.error(`✗ ${task.name} 失败:`, err.message)
    }
  }
  
  console.log('\n✅ 全部完成！')
}

main().catch(console.error)
