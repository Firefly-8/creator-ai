#!/usr/bin/env node
/**
 * 快速生图 — 一行命令搞定
 * 
 * 用法:
 *   node scripts/quick-image.mjs "a cute cat avatar"
 *   node scripts/quick-image.mjs "blog cover about AI music" --aspect 16:9
 *   node scripts/quick-image.mjs "product logo" --type logo --no-optimize
 */

import { loadEnv } from './load-env.mjs';
loadEnv();

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com';

async function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const prompt = args.join(' ');
  
  if (!prompt) {
    console.log('Usage: node scripts/quick-image.mjs "<prompt>" [--aspect 16:9] [--no-optimize]');
    process.exit(1);
  }
  
  const noOptimize = process.argv.includes('--no-optimize');
  const aspectIdx = process.argv.indexOf('--aspect');
  const aspectRatio = aspectIdx !== -1 ? process.argv[aspectIdx + 1] : '1:1';
  
  if (!MINIMAX_API_KEY) {
    console.error('❌ MINIMAX_API_KEY is not set in environment');
    process.exit(1);
  }
  
  console.log(`\n🎨 Generating: "${prompt.slice(0, 60)}..."`);
  console.log(`   Aspect: ${aspectRatio}`);
  
  let finalPrompt = prompt;
  
  // Optimize
  if (!noOptimize) {
    try {
      const sys = `You are a prompt engineer for MiniMax image-01. Rewrite the idea into ONE high-quality English prompt under 1400 chars. Output JSON: {"optimized":"..."}`;
      const res = await fetch(`${MINIMAX_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MINIMAX_API_KEY}` },
        body: JSON.stringify({
          model: 'MiniMax-M3',
          temperature: 0.4,
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: `Scene: general\nIdea: ${prompt}` },
          ],
        }),
      });
      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const obj = JSON.parse(match[0]);
        if (obj.optimized) finalPrompt = obj.optimized;
      }
    } catch (e) {
      console.log('   ⚠️  Optimization skipped, using original prompt');
    }
  }
  
  // Generate
  console.log('   ⏳ Calling MiniMax API...');
  const res = await fetch(`${MINIMAX_BASE_URL}/v1/image_generation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MINIMAX_API_KEY}` },
    body: JSON.stringify({
      model: 'image-01',
      prompt: finalPrompt,
      aspect_ratio: aspectRatio,
      response_format: 'url',
      n: 1,
      prompt_optimizer: true,
    }),
  });
  
  const json = await res.json();
  if (json?.base_resp?.status_code !== 0) {
    console.error(`   ❌ API Error: ${json?.base_resp?.status_msg || 'Unknown'}`);
    process.exit(1);
  }
  
  const imageUrl = json?.data?.image_urls?.[0];
  if (!imageUrl) {
    console.error('   ❌ No image returned');
    process.exit(1);
  }
  
  // Download
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  const filename = `img_${Date.now()}.jpg`;
  const filepath = join(OUTPUT_DIR, filename);
  
  const imgRes = await fetch(imageUrl);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  writeFileSync(filepath, buffer);
  
  console.log(`   ✅ Saved: ${filepath} (${(buffer.length / 1024).toFixed(1)} KB)`);
  console.log(`   🔗 URL: ${imageUrl}\n`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
