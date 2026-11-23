/**
 * 贺卡向导的本地草稿 —— 防「填了一半被杀掉」
 *
 * ⚠️ 为什么要（2026-11-17）：
 *   /cards 的中间状态以前**全在内存里**，刷新页面 / 手机切后台被系统杀 /
 *   用户中途去查邮箱 → 前面两步全白做，要从"选场合"重新来过。
 *
 *   Greetings Island 也栽在这上面（用户反馈"生成后草稿丢了，看不到自己的草稿"）。
 *   他们的免费额度只有 1 积分 —— 填半天、积分花光、草稿还丢了，
 *   这种体验会直接劝退。我们的免费额度虽然多，但**不能让人白填**。
 *
 * ⚠️ 存什么、存多少：
 *   - 文本（名字 / 想说的话 / 场合 id / 画风 / 张数 / 当前步）→ 随便存
 *   - 照片 → **只存缩略图**（长边 ≤ 900px 的 JPEG data URL，≈100~200KB）
 *     原图太大塞不进 localStorage，而且缩略图够"提醒用户你传过照片"了；
 *     真要出图还得让用户重新选一次原图（服务端 i2i 需要原图）。
 *   - 只在浏览器里存，**不上传服务器**（未登录时也要能用）
 */
import { ref, watch } from 'vue'

const KEY = 'craftai_card_draft_v1'
/** localStorage 满了就整体放弃草稿，不能因为存不下而让页面报错 */
const MAX_BYTES = 4 * 1024 * 1024

export interface CardDraftState {
  /** 卡片格式（invite / card）；2026-11-23 格式由落地页入口决定，一并存草稿 */
  format?: string
  /** 场景 id（IMAGE_SCENARIOS 的 id） */
  scenario: string
  /** 画风 id */
  style: string
  /** 名字 */
  name: string
  /** 想说的话（出图后预填到编辑器） */
  message: string
  /** 额外描述（进 prompt） */
  extra: string
  /** 出几张 */
  count: number
  /** 当前步骤 */
  step: number
  /** 缩略图（data URL） */
  thumb: string
  /** 更新时间戳 */
  at: number
}

const empty = (): CardDraftState => ({
  scenario: '',
  style: '',
  name: '',
  message: '',
  extra: '',
  count: 4,
  step: 1,
  thumb: '',
  at: 0,
})

function read(): CardDraftState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CardDraftState>
    if (!parsed || typeof parsed !== 'object') return null
    return { ...empty(), ...parsed }
  } catch {
    return null
  }
}

function write(state: CardDraftState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    return true
  } catch {
    // 配额满了（多半是照片太大）→ 去掉缩略图再试一次
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...state, thumb: '' }))
      return true
    } catch {
      // 实在存不下 → 放弃草稿，不能让页面崩
      return false
    }
  }
}

/**
 * 照片缩略图：长边缩到 ≤900px 的 JPEG data URL。
 * 约 100~200KB，能塞进 localStorage。
 */
export async function makeThumbnail(file: File, maxEdge = 900): Promise<string> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        try {
          const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
          const w = Math.max(1, Math.round(img.width * scale))
          const h = Math.max(1, Math.round(img.height * scale))
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          if (!ctx) { URL.revokeObjectURL(url); return resolve('') }
          ctx.drawImage(img, 0, 0, w, h)
          const data = canvas.toDataURL('image/jpeg', 0.72)
          URL.revokeObjectURL(url)
          resolve(data)
        } catch {
          resolve('')
        }
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve('') }
      img.src = url
    } catch {
      resolve('')
    }
  })
}

/**
 * 草稿的读写。
 *
 * 用法：
 *   const draft = useCardDraft()
 *   draft.state.xxx = ...        // 双向
 *   draft.restore()              // 页面加载时读一次
 *   draft.clear()                // 生成成功后清掉
 */
export function useCardDraft() {
  const state = ref<CardDraftState>(empty())

  /** 从 localStorage 恢复（页面加载时调用一次） */
  function restore(): boolean {
    const saved = read()
    if (!saved || !saved.at) return false
    state.value = saved
    return true
  }

  /** 立即写一次 */
  function save() {
    write({ ...state.value, at: Date.now() })
  }

  /** 清掉草稿（生成成功后 / 用户点了"重新开始"） */
  function clear() {
    try { localStorage.removeItem(KEY) } catch { /* ignore */ }
    state.value = empty()
  }

  /** 有没有值得恢复的草稿（名字或话至少写了一点） */
  const hasDraft = () => !!state.value.at && (
    !!state.value.name || !!state.value.message || !!state.value.scenario || !!state.value.thumb
  )

  // 自动保存（防抖 400ms，避免每敲一个字都写一次）
  let timer: ReturnType<typeof setTimeout> | null = null
  watch(
    state,
    () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        if (hasDraft()) save()
      }, 400)
    },
    { deep: true },
  )

  return { state, restore, save, clear, hasDraft }
}
