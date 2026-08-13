#!/usr/bin/env node
/**
 * Creator.ai — 内部配图生成脚本
 * 
 * 用途：
 *   - 产品 Logo 生成
 *   - Blog 配图生成
 *   - 社交媒体图片
 *   - 营销物料
 *   - 任何需要 AI 生图的场景
 * 
 * 使用方法：
 *   node scripts/generate-image.mjs --type logo
 *   node scripts/generate-image.mjs --type blog --prompt "AI music generation workflow"
 *   node scripts/generate-image.mjs --type social --prompt "New feature launch"
import { loadEnv } from "./load-env.mjs";
loadEnv();

 * 
 * 选项：
 *   --type       图片类型: logo | blog | social | product | custom
 *   --prompt     自定义提示词（不传则使用模板）
 *   --optimize  是否先优化提示词（默认 true）
 *   --aspect    宽高比: 1:1 | 16:9 | 9:16 | 4:3 | 3:4（默认按类型自动选择）
 *   --output    输出目录（默认 scripts/output/）
 *   --upload    上传到 R2（需要 CF 配置）
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// ============ 配置 ============
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com';

// ============ Prompt 模板库 ============
const PROMPT_TEMPLATES = {
  logo: {
    aspect: '1:1',
    prompt: `Design a modern minimalist logo mark for "Creator.ai" — an AI-powered creative studio.
- Combine a stylized letter "C" with a flowing sound wave / audio waveform motif
- Clean geometric construction, balanced negative space
- Gradient purple-to-violet glow (#8b7cff → #b4a9ff) on pure black background
- Flat vector style, no 3D effects, no gradients inside the mark itself
- Scalable icon feel — works at 16px favicon and 400px header
- Centered composition, generous padding
- NO text, NO tagline, NO watermark
- Professional brand mark quality, like a top-tier tech startup logo`,
    notes: 'Logo 设计 — 适合做品牌标识、favicon、社交媒体头像'
  },
  
  blog: {
    aspect: '16:9',
    prompt: `Create a professional blog header image for a technology article.
- Scene: {prompt}
- Style: Modern editorial, clean composition, subtle depth
- Color palette: Deep purple (#14121c) background with vibrant accent gradients
- Abstract geometric elements suggesting AI/technology
- No text overlay — pure visual imagery
- High quality, 16:9 aspect ratio, suitable for blog featured image
- Professional photography/3D render hybrid style`,
    notes: 'Blog 配图 — 适合文章封面、OG 图片'
  },
  
  social: {
    aspect: '1:1',
    prompt: `Create an eye-catching social media graphic.
- Theme: {prompt}
- Style: Bold, vibrant, scroll-stopping visual
- Gradient background with dynamic abstract shapes
- Modern typography-inspired geometric layout
- Clean, minimal, Instagram/Pinterest ready
- Square 1:1 format, high contrast
- Tech-forward aesthetic with purple accent colors
- No text — pure visual impact`,
    notes: '社交媒体 — 适合 Instagram、Twitter、LinkedIn'
  },
  
  product: {
    aspect: '4:3',
    prompt: `Create a premium product showcase image.
- Product concept: {prompt}
- Style: Studio lighting, commercial photography quality
- Clean white/gradient background
- Material detail, subtle reflections, professional mood
- E-commerce ready, centered composition
- Soft shadows, depth of field on edges
- 4:3 aspect ratio, high resolution feel`,
    notes: '产品展示 — 适合落地页、广告素材'
  },
  
  og: {
    aspect: '16:9',
    prompt: `Create an Open Graph social sharing image for a web page.
- Topic: {prompt}
- Style: Modern, tech-forward, clean
- Dark background (#14121c) with vibrant gradient accents
- Abstract 3D geometric shapes suggesting innovation
- No text — must work as pure visual
- 1200x630 equivalent composition (16:9)
- Professional SaaS marketing quality`,
    notes: 'OG 图片 — 适合 Open Graph / Twitter Card'
  }
};

// ============ 工具函数 ============

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    type: 'custom',
    prompt: '',
    optimize: true,
    aspect: '',
    output: join(PROJECT_ROOT, 'scripts', 'output'),
    upload: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--type': result.type = args[++i]; break;
      case '--prompt': result.prompt = args[++i]; break;
      case '--optimize': result.optimize = args[++i] !== 'false'; break;
      case '--aspect': result.aspect = args[++i]; break;
      case '--output': result.output = args[++i]; break;
      case '--upload': result.upload = true; break;
      case '--no-optimize': result.optimize = false; break;
    }
  }
  
  return result;
}

function log(message, type = 'info') {
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️', step: '→' };
  console.log(`${icons[type] || '  '} ${message}`);
}

// ============ MiniMax API ============

async function optimizePrompt(prompt, scene = 'general', aspectRatio = '1:1') {
  if (!MINIMAX_API_KEY) throw new Error('MINIMAX_API_KEY is not set');
  
  const systemPrompt = `You are an expert prompt engineer for MiniMax image-01.
Rewrite the user's rough idea into ONE high-quality image prompt.
Rules:
- Be specific and visual (subject, composition, style, lighting, mood).
- ${scene === 'logo' ? 'For LOGO: flat/minimal vector mark, clean background, no mockup clutter, high contrast, scalable icon feel.' : 'Include subject, composition, style, lighting, materials, camera/viewpoint when useful.'}
- Keep under 1400 characters.
- Do NOT wrap in quotes. Do NOT add markdown.
- Output JSON only: {"optimized":"...","notes":"one short Chinese tip"}`;

  const res = await fetch(`${MINIMAX_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'MiniMax-M3',
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Aspect ratio: ${aspectRatio}\nScene: ${scene}\nIdea:\n${prompt}` },
      ],
    }),
  });

  const json = await res.json();
  if (!res.ok || json?.base_resp?.status_code !== 0) {
    throw new Error(`Prompt optimize failed: ${json?.base_resp?.status_msg || res.statusText}`);
  }

  const text = String(json?.choices?.[0]?.message?.content || '').trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]);
      if (obj.optimized) return { optimized: obj.optimized, notes: obj.notes || '' };
    } catch { /* ignore */ }
  }
  return { optimized: text.replace(/^```[\s\S]*?\n|```$/g, '').trim().slice(0, 1500), notes: '' };
}

async function generateImage(prompt, aspectRatio = '1:1') {
  if (!MINIMAX_API_KEY) throw new Error('MINIMAX_API_KEY is not set');

  const res = await fetch(`${MINIMAX_BASE_URL}/v1/image_generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'image-01',
      prompt,
      aspect_ratio: aspectRatio,
      response_format: 'url',
      n: 1,
      prompt_optimizer: true,
    }),
  });

  const json = await res.json();
  if (!res.ok || json?.base_resp?.status_code !== 0) {
    throw new Error(`Image generation failed: ${json?.base_resp?.status_msg || res.statusText}`);
  }

  const imageUrl = json?.data?.image_urls?.[0] || json?.data?.image_base64?.[0];
  if (!imageUrl) throw new Error('No image returned from API');
  
  return { imageUrl, raw: json };
}

async function downloadImage(url, outputPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(outputPath, buffer);
  return buffer.length;
}

// ============ 主流程 ============

async function main() {
  const args = parseArgs();
  
  console.log('\n🎨 Creator.ai — 内部配图生成器\n');
  
  // 1. 确定使用的模板
  const template = PROMPT_TEMPLATES[args.type];
  if (!template && !args.prompt) {
    log(`Unknown type: ${args.type}`, 'error');
    log('Available types: ' + Object.keys(PROMPT_TEMPLATES).join(', '), 'info');
    process.exit(1);
  }
  
  let aspectRatio = args.aspect || template?.aspect || '1:1';
  let rawPrompt = args.prompt || template?.prompt || '';
  
  // 替换占位符
  if (args.type !== 'logo' && args.prompt) {
    rawPrompt = rawPrompt.replace('{prompt}', args.prompt);
  }
  
  log(`Type: ${args.type}`, 'info');
  log(`Aspect: ${aspectRatio}`, 'info');
  if (template?.notes) log(`Template: ${template.notes}`, 'info');
  
  // 2. 优化提示词
  let finalPrompt = rawPrompt;
  let optimizeNotes = '';
  
  if (args.optimize) {
    log('Optimizing prompt...', 'step');
    try {
      const result = await optimizePrompt(rawPrompt, args.type, aspectRatio);
      finalPrompt = result.optimized;
      optimizeNotes = result.notes;
      log('Prompt optimized', 'success');
      if (optimizeNotes) log(`Tip: ${optimizeNotes}`, 'info');
    } catch (err) {
      log(`Optimization skipped: ${err.message}`, 'warn');
    }
  }
  
  // 3. 生成图片
  log('Generating image...', 'step');
  let imageUrl;
  try {
    const result = await generateImage(finalPrompt, aspectRatio);
    imageUrl = result.imageUrl;
    log('Image generated', 'success');
  } catch (err) {
    log(err.message, 'error');
    process.exit(1);
  }
  
  // 4. 保存到本地
  if (!existsSync(args.output)) {
    mkdirSync(args.output, { recursive: true });
  }
  
  const filename = `${args.type}_${Date.now()}.jpg`;
  const outputPath = join(args.output, filename);
  
  try {
    const size = await downloadImage(imageUrl, outputPath);
    log(`Saved: ${outputPath} (${(size / 1024).toFixed(1)} KB)`, 'success');
  } catch (err) {
    log(`Download failed: ${err.message}`, 'error');
    log(`Image URL: ${imageUrl}`, 'info');
  }
  
  // 5. 保存 prompt 记录
  const recordPath = join(args.output, `${args.type}_${Date.now()}_prompt.txt`);
  writeFileSync(recordPath, [
    `Type: ${args.type}`,
    `Aspect: ${aspectRatio}`,
    `Date: ${new Date().toISOString()}`,
    `Optimize Notes: ${optimizeNotes}`,
    '',
    '--- Original Prompt ---',
    rawPrompt,
    '',
    '--- Optimized Prompt ---',
    finalPrompt,
    '',
    '--- Image URL ---',
    imageUrl,
  ].join('\n'));
  log(`Prompt record: ${recordPath}`, 'info');
  
  console.log('\n✨ Done!\n');
}

main().catch(err => {
  log(err.message, 'error');
  process.exit(1);
});
