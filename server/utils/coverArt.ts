/**
 * 封面图生成 — Cloudflare Workers 兼容版本
 * 生成 SVG 字符串（不上传文件，由调用方决定存储方式）
 */

/**
 * 生成封面 SVG 字符串
 */
export function writeSongCoverSvg(input: {
  songId: string
  title: string
  prompt?: string
  color: string
}): string {
  const title = escapeXml(truncate(input.title || 'Untitled', 28))
  const subtitle = escapeXml(truncate(input.prompt || 'Pulse', 42))
  const c1 = input.color || '#8b7cff'
  const c2 = shade(c1, -28)
  const c3 = shade(c1, 36)

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c3}"/>
      <stop offset="55%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="30%" cy="28%" r="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>
  <rect width="640" height="640" fill="url(#bg)"/>
  <circle cx="170" cy="160" r="160" fill="url(#glow)"/>
  <g opacity="0.22" filter="url(#soft)">
    <ellipse cx="460" cy="470" rx="180" ry="110" fill="#0a0910"/>
  </g>
  <g opacity="0.35" stroke="#ffffff" stroke-width="2" fill="none">
    <path d="M72 420 C140 360, 220 500, 300 430 S460 340, 560 410"/>
    <path d="M64 455 C150 400, 230 520, 320 455 S470 360, 576 430"/>
  </g>
  <rect x="48" y="48" width="544" height="544" rx="36" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2"/>
  <text x="56" y="540" fill="#ffffff" fill-opacity="0.92" font-family="Sora, Manrope, Arial, sans-serif" font-size="34" font-weight="700">${title}</text>
  <text x="56" y="578" fill="#ffffff" fill-opacity="0.62" font-family="Manrope, Arial, sans-serif" font-size="18" font-weight="500">${subtitle}</text>
</svg>`
}

/**
 * @deprecated 不再需要路径拼接，直接返回文件名
 */
export function coversDir(): string { return 'covers' }

/**
 * @deprecated 不再需要路径拼接，直接返回文件名
 */
export function coverAbsolutePath(filename: string): string { return filename }

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function shade(hex: string, amount: number): string {
  const raw = hex.replace('#', '')
  if (raw.length !== 6) return hex
  const num = Number.parseInt(raw, 16)
  const clamp = (n: number) => Math.max(0, Math.min(255, n))
  const r = clamp(((num >> 16) & 255) + amount)
  const g = clamp(((num >> 8) & 255) + amount)
  const b = clamp((num & 255) + amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
