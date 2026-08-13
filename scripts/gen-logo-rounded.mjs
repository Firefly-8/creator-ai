import { loadEnv } from './load-env.mjs';
loadEnv();

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com';

// 方案C style: abstract creative symbol + prism, purple-cyan-blue gradient
const prompt = `A premium creative platform logo, abstract geometric symbol combining a stylized letter "A" with prism/light refraction elements, purple-to-cyan-to-blue gradient, glass morphism texture, intricate light rays refracting through crystalline structures, futuristic yet elegant, minimalist overall composition with rich microscopic details, dark background, studio lighting, 3D render quality, brand logo design, centered composition, professional product photography style`;

console.log('🎨 Generating logo with prism + gradient style...');

// Generate image
const res = await fetch(`${MINIMAX_BASE_URL}/v1/image_generation`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MINIMAX_API_KEY}` },
  body: JSON.stringify({
    model: 'image-01',
    prompt: prompt,
    aspect_ratio: '1:1',
    response_format: 'url',
    n: 1,
    prompt_optimizer: true,
  }),
});

const json = await res.json();
if (json?.base_resp?.status_code !== 0) {
  console.error(`❌ API Error: ${json?.base_resp?.status_msg || 'Unknown'}`);
  process.exit(1);
}

const imageUrl = json?.data?.image_urls?.[0];
if (!imageUrl) {
  console.error('❌ No image returned');
  process.exit(1);
}

// Download
const imgRes = await fetch(imageUrl);
const buffer = Buffer.from(await imgRes.arrayBuffer());
console.log(`✅ Downloaded: ${(buffer.length / 1024).toFixed(1)} KB`);

// Process: rounded corners with transparent edges
const size = 1024;
const radius = 230; // ~22.5% rounded corner

// Resize to square first, then apply rounded corner mask
const rounded = sharp(buffer).resize(size, size, { fit: 'cover' });

// Create rounded rectangle mask
const mask = Buffer.from(
  `<svg width="${size}" height="${size}">
     <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/>
   </svg>`
);

const output = await rounded
  .composite([{ input: mask, blend: 'dest-in' }])
  .png({ quality: 95 })
  .toBuffer();

// Save PNG with transparency
const filename = `logo_rounded_${Date.now()}.png`;
const filepath = join(OUTPUT_DIR, filename);
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(filepath, output);

console.log(`✅ Saved rounded logo: ${filepath} (${(output.length / 1024).toFixed(1)} KB)`);
console.log(`🔗 Source URL: ${imageUrl}`);
