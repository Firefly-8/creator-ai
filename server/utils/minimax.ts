/**
 * MiniMax API 客户端 — 加密版本
 * API Key 运行时解密，请求签名验证
 */

import { sign, verifySignature } from './crypto'

export class MiniMaxError extends Error {
  statusCode: number
  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
    this.name = 'MiniMaxError'
  }
}

export type TokenPlanModelRemain = {
  model_name?: string
  start_time?: number
  end_time?: number
  remains_time?: number
  weekly_start_time?: number
  weekly_end_time?: number
  weekly_remains_time?: number
  current_interval_remaining_percent?: number
  current_weekly_remaining_percent?: number
  current_interval_status?: number
  current_weekly_status?: number
}

export type TokenPlanRemains = {
  model_remains?: TokenPlanModelRemain[]
  base_resp?: { status_code: number; status_msg: string }
}

/**
 * 获取配置 — API Key 运行时解密
 */
async function getConfig() {
  const { getDecryptedApiKey, getMiniMaxBaseUrl } = await import('./secureConfig')
  
  const apiKey = await getDecryptedApiKey()
  const baseUrl = getMiniMaxBaseUrl()

  if (!apiKey) {
    throw new MiniMaxError(500, 'MINIMAX_API_KEY is not configured')
  }

  return { apiKey, baseUrl }
}

/**
 * 生成请求签名（防止请求被篡改）
 */
async function generateRequestSignature(
  path: string,
  body: Record<string, unknown>,
  timestamp: string,
  secret: string
): Promise<string> {
  const payload = `${path}:${timestamp}:${JSON.stringify(body)}`
  return sign(payload, secret)
}

/**
 * 发起 MiniMax API 请求（带签名）
 */
export async function minimaxFetch<T>(
  path: string,
  body: Record<string, unknown>,
  options?: { signRequest?: boolean }
): Promise<T> {
  const { apiKey, baseUrl } = await getConfig()
  const timestamp = Date.now().toString()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'X-Request-Timestamp': timestamp,
  }

  // 可选：添加请求签名（高安全场景）
  if (options?.signRequest) {
    const config = useRuntimeConfig()
    const signSecret = config.requestSigningSecret || config.appSecret || ''
    if (signSecret) {
      const signature = await generateRequestSignature(path, body, timestamp, signSecret)
      headers['X-Request-Signature'] = signature
    }
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const json = (await res.json().catch(() => ({}))) as any
  const statusCode = json?.base_resp?.status_code
  if (typeof statusCode === 'number' && statusCode !== 0) {
    throw new MiniMaxError(statusCode, json?.base_resp?.status_msg || 'MiniMax API error')
  }
  if (!res.ok) {
    throw new MiniMaxError(res.status, json?.base_resp?.status_msg || res.statusText || 'MiniMax request failed')
  }
  return json as T
}

/** Token Plan quota — GET /v1/token_plan/remains */
export async function fetchTokenPlanRemains(): Promise<TokenPlanRemains | null> {
  try {
    const { apiKey, baseUrl } = await getConfig()
    const res = await fetch(`${baseUrl}/v1/token_plan/remains`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    })
    const json = (await res.json().catch(() => ({}))) as TokenPlanRemains
    if (!res.ok || (json.base_resp?.status_code && json.base_resp.status_code !== 0)) {
      return null
    }
    return json
  } catch {
    return null
  }
}

// ============ 音乐生成 ============

export interface MusicResult {
  data?: {
    audio?: string
    audio_url?: string
  }
  extra_info?: {
    music_duration?: number
    duration?: number
  }
}

export function generateMusic(payload: Record<string, unknown>) {
  return minimaxFetch<MusicResult>('/v1/music_generation', {
    response_format: 'url',
    ...payload,
  })
}

export async function generateLyrics(input: {
  mode: 'write_full_song' | 'edit'
  prompt?: string
  lyrics?: string
  title?: string
}) {
  const { apiKey, baseUrl } = await getConfig()
  const res = await fetch(`${baseUrl}/v1/lyrics_generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(input),
  })

  const json = (await res.json().catch(() => ({}))) as any
  const statusCode = json?.base_resp?.status_code
  if (typeof statusCode === 'number' && statusCode !== 0) {
    throw new MiniMaxError(statusCode, json?.base_resp?.status_msg || 'Lyrics generation failed')
  }
  if (!res.ok) {
    throw new MiniMaxError(res.status, json?.base_resp?.status_msg || 'Lyrics generation failed')
  }
  return json
}

// ============ 图片生成 ============

export interface ImageGenerationResult {
  data?: {
    image_urls?: string[]
    image_base64?: string[]
  }
  base_resp?: { status_code: number; status_msg: string }
}

export function generateImage(payload: Record<string, unknown>) {
  return minimaxFetch<ImageGenerationResult>('/v1/image_generation', {
    response_format: 'url',
    n: 1,
    prompt_optimizer: true,
    ...payload,
  })
}

export async function optimizeImagePrompt(input: {
  prompt: string
  scene?: string
  aspectRatio?: string
}): Promise<{ optimized: string; notes: string }> {
  const sceneHint = sceneSystemHint(input.scene)
  const { apiKey, baseUrl } = await getConfig()
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'MiniMax-M3',
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: `You are an expert prompt engineer for MiniMax image-01.
Rewrite the user's rough idea into ONE high-quality image prompt.
Rules:
- Prefer clear English (MiniMax image-01 works well with detailed English).
- Include subject, composition, style, lighting, materials, camera/viewpoint when useful.
- Keep under 1400 characters.
- Do NOT wrap in quotes. Do NOT add markdown.
- Output JSON only: {"optimized":"...","notes":"one short Chinese tip"}
${sceneHint}`,
        },
        {
          role: 'user',
          content: `Aspect ratio: ${input.aspectRatio || '1:1'}\nScene: ${input.scene || 'general'}\nIdea:\n${input.prompt}`,
        },
      ],
    }),
  })

  const json = (await res.json().catch(() => ({}))) as any
  const apiCode = json?.base_resp?.status_code
  if (typeof apiCode === 'number' && apiCode !== 0) {
    throw new MiniMaxError(apiCode, json?.base_resp?.status_msg || 'Chat optimize failed')
  }
  if (!res.ok) {
    throw new MiniMaxError(res.status, json?.error?.message || json?.base_resp?.status_msg || 'Chat optimize failed')
  }
  const text = String(json?.choices?.[0]?.message?.content || '').trim()
  const parsed = parseOptimizeJson(text)
  if (parsed?.optimized) return parsed
  const cleaned = text.replace(/^```[\s\S]*?\n|```$/g, '').trim()
  return {
    optimized: cleaned.slice(0, 1500) || input.prompt,
    notes: '已用对话模型润色提示词',
  }
}

// ============ Cover 翻唱 ============

export async function coverPreprocess(input: { audio: string }) {
  const { apiKey, baseUrl } = await getConfig()
  const res = await fetch(`${baseUrl}/v1/cover_generation/preprocess`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(input),
  })
  return res.json()
}

export async function generateCover(payload: Record<string, unknown>) {
  const { apiKey, baseUrl } = await getConfig()
  const res = await fetch(`${baseUrl}/v1/cover_generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })
  return res.json()
}

// ============ 工具函数 ============

function sceneSystemHint(scene?: string): string {
  switch (scene) {
    case 'logo':
      return 'Scene focus: brand LOGO — flat/minimal vector mark, centered, clean background, no mockup clutter, high contrast, scalable icon feel.'
    case 'ui':
      return 'Scene focus: APP/WEB UI mockup — clean interface, readable hierarchy, modern product design, device frame optional, no tiny illegible text soup.'
    case 'design':
      return 'Scene focus: design board / poster / brand visual — strong layout, typography as graphic shape, editorial composition.'
    case 'portrait':
      return 'Scene focus: character portrait — face clarity, lighting, skin detail, cinematic but natural.'
    case 'product':
      return 'Scene focus: product shot — studio lighting, material detail, commercial photography.'
    case 'album':
      return 'Scene focus: music album cover — square art, atmospheric, no unreadable title text unless abstract lettering.'
    default:
      return 'Scene focus: general high-quality illustration/photo as appropriate.'
  }
}

function parseOptimizeJson(text: string): { optimized: string; notes: string } | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const obj = JSON.parse(match[0])
    if (typeof obj.optimized === 'string' && obj.optimized.trim()) {
      return {
        optimized: String(obj.optimized).trim().slice(0, 1500),
        notes: String(obj.notes || '提示词已优化').trim(),
      }
    }
  } catch {
    // ignore
  }
  return null
}

export function extractAudioPayload(result: MusicResult): { url?: string; hex?: string; durationMs: number } {
  const durationMs = Number(result?.extra_info?.music_duration || result?.extra_info?.duration || 0)
  const candidates = [
    result?.data?.audio,
    result?.data?.audio_url,
    result?.audio,
    result?.url,
    result?.data?.url,
  ].filter((v): v is string => typeof v === 'string' && v.length > 0)

  for (const value of candidates) {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return { url: value, durationMs }
    }
  }
  const hex = candidates.find((v) => !v.startsWith('http'))
  if (hex) return { hex, durationMs }
  return { durationMs }
}

export function mapMiniMaxErrorMessage(code: number, msg: string): string {
  const map: Record<number, string> = {
    1002: '请求过于频繁，请约 1 分钟后再试',
    1004: 'API 鉴权失败，请检查 Key 是否正确',
    1008: 'MiniMax 账户余额不足，请充值或切换按量付费 Key',
    1026: '内容触发安全审核，请修改提示词后重试',
    2013: '请求参数无效',
    2049: 'API Key 无效或与区域不匹配',
    2056: 'Token Plan 额度已用尽',
  }
  return map[code] || msg || `MiniMax 错误 ${code}`
}

export async function resolveMiniMaxUserMessage(code: number, msg: string): Promise<string> {
  return mapMiniMaxErrorMessage(code, msg)
}
