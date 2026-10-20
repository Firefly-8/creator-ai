/**
 * AI 写贺卡祝词
 *
 * 场景：用户点了「Write it for me」但不想自己动笔。
 * 约束：
 *   - 英文，1~2 句，温暖口语化（写给中老年收卡人，不要太正式）
 *   - 必须正确使用用户输入的名字（我们会把 name 原样给它）
 *   - 不用 emoji、不用 markdown、不加引号
 *   - 长度控制在 140 字符内，贺卡上放得下
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getDecryptedApiKey, getMiniMaxBaseUrl } from '../../utils/secureConfig'
import { getScenario } from '../../../utils/imageScenarios'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}) as any)
  const scenarioId = String(body?.scenario || '')
  const name = String(body?.name || '').trim().slice(0, 60)
  const extra = String(body?.extra || '').trim().slice(0, 200)

  const scenario = getScenario(scenarioId)
  if (!scenario) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown scenario' })
  }

  const apiKey = await getDecryptedApiKey()
  if (!apiKey) {
    throw createError({ statusCode: 503, statusMessage: 'Message service is not configured' })
  }
  const baseUrl = await getMiniMaxBaseUrl()

  const system = [
    'You write short messages for greeting cards.',
    'Rules:',
    '- Write in English only.',
    '- One or two sentences, warm and personal, like a family member would say.',
    '- Use the person\'s name naturally if it fits. NEVER misspell or change the name.',
    '- No emoji, no markdown, no quotation marks, no signature.',
    '- Maximum 140 characters.',
    '- Output ONLY the message text.',
  ].join('\n')

  const userParts = [`Occasion: ${scenario.label} (${scenario.desc}).`]
  if (name) userParts.push(`Their name (use exactly): ${name}`)
  if (extra) userParts.push(`A detail about them: ${extra}`)
  userParts.push('Write the message.')

  let message = ''
  try {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-M3',
        temperature: 0.8,
        max_tokens: 120,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userParts.join('\n') },
        ],
      }),
    })
    const json = (await res.json().catch(() => ({}))) as any
    const code = json?.base_resp?.status_code
    if (typeof code === 'number' && code !== 0) {
      throw new Error(json?.base_resp?.status_msg || 'Message service error')
    }
    message = String(json?.choices?.[0]?.message?.content || '').trim()
  } catch (e) {
    console.error('[image/message] MiniMax 调用失败', e)
    // 兜底：给一条安全的预置祝词，别让用户对着空白
    message = scenario.presetMessages?.[0] || 'Thinking of you today. Have a wonderful day.'
  }

  // 清理模型可能带上的引号/markdown/多余空白
  message = message
    .replace(/^```[\s\S]*?\n|```$/g, '')
    .replace(/^["'“”\s]+|["'“”\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)

  return { message, scenario: scenario.id }
})
