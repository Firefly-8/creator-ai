/**
 * useCardCanvas —— 成品卡片的 Canvas 渲染与导出
 *
 * 为什么在客户端做排版与导出（而不是服务端 ffmpeg / sharp）：
 *   1. 导出免费 = 用户零摩擦试玩，付费点放在「服务端生成的 2K 无水印底图 + 300 DPI 打印规格」
 *   2. 省掉 wasm core（31MB，超 CF Pages 单文件 25MB 上限）与 COOP/COEP 头
 *   3. 文字由浏览器排版 —— 名字/数字 100% 正确（模型自己写字必翻车，实测有 "Happy 70th Runthdscket"）
 *
 * 版式规范（与 scripts/compose-card.mjs 保持一致，首页 showcase 就是它出��）：
 *   图上字下。底部奶油色渐变蒙版，文字自底向上堆叠。
 *   不使用「上方标题」版式 —— 有人物的底图会把主体画满上方，标题会压脸。
 */
import { ref, shallowRef, computed, onMounted, watch } from 'vue'
import { CARD_SPECS, getCardSpec, defaultSpecFor, type CardSpec } from '~/utils/cardSpecs'
// 字体在 R2 上（不在应用包里），见 utils/assets.ts
import { ASSET_BASE, FONT_FILES as FONT_FILE_NAMES } from '~/utils/assets'

export interface CardTextItem {
  id: string
  /** 渲染用角色，决定默认字体/字号/位置 */
  kind: 'name' | 'message' | 'signature' | 'title'
  text: string
  /** 相对画布的横向位置 0-1 */
  x: number
  /** 相对画布的纵向位置 0-1（锚点中心） */
  y: number
  /** 相对画布宽度的字号（0.06 = 6% 宽） */
  size: number
  color: string
  align: CanvasTextAlign
  font: 'display' | 'body' | 'script'
  /** 旋转角度（度） */
  rotate: number
  /** 拖动中被选中 */
  locked?: boolean
}

export interface CardDraft {
  specId: string
  /** 底图（R2 里的 URL 或 data URI） */
  imageUrl: string
  /** 是否加底部渐变蒙版 */
  band: boolean
  texts: CardTextItem[]
}

/** 预览宽度（CSS 像素），导出时按倍率放大 */
const PREVIEW_W = 560

export function useCardCanvas(initial?: Partial<CardDraft>) {
  const previewCanvas = ref<HTMLCanvasElement | null>(null)
  const imageEl = shallowRef<HTMLImageElement | null>(null)
  const loading = ref(true)
  const exporting = ref(false)
  const fontsReady = ref(false)
  const error = ref('')

  /**
   * 免费版要不要打标。
   * ⚠️ 必须和导出用同一套逻辑：**预览也要有标**。
   *    以前只有导出加水印 → 用户预览看到干净成品，下载才突然出现水印，
   *    "预览和下载不一样" 是最容易招来差评/退款的一种落差。
   *    它是 ref —— 付费状态是异步查出来的（/api/user/usage），会变。
   */
  const watermark = ref(false)

  const spec = ref<CardSpec>(getCardSpec(initial?.specId || defaultSpecFor('card')))

  const draft = ref<CardDraft>({
    specId: initial?.specId || '5x7',
    imageUrl: initial?.imageUrl || '',
    band: initial?.band ?? true,
    texts: initial?.texts ?? [],
  })

  /* ---------------- 字体 ---------------- */
  async function loadFonts() {
    if (import.meta.server) return
    try {
      const faces = await Promise.all(
        Object.entries(FONT_FILE_NAMES).map(async ([key, file]) => {
          const face = new FontFace(key, `url(${ASSET_BASE}/fonts/${file})`, {
            weight: 'normal',
          })
          await face.load()
          document.fonts.add(face)
          return key
        }),
      )
      fontsReady.value = faces.length > 0
    } catch (e) {
      // 字体加载失败不致命：回落到系统衬线体
      console.warn('[card-canvas] 字体加载失败，使用系统衬线体', e)
      fontsReady.value = false
    }
  }

  /* ---------------- 底图 ---------------- */
  async function loadImage(url: string) {
    if (!url) {
      imageEl.value = null
      loading.value = false
      return
    }
    loading.value = true
    error.value = ''
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('底图加载失败'))
        img.src = url
      })
      imageEl.value = img
    } catch (e) {
      error.value = e instanceof Error ? e.message : '底图加载失败'
      imageEl.value = null
    } finally {
      loading.value = false
    }
  }

  /* ---------------- 渲染 ---------------- */
  /**
   * 把草稿画到任意尺寸的 2D context
   * 预览与导出共用，保证「所见即所得」
   */
  function paint(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const s = width / 1500 // 以 5×7 宽为基准换算
    const W = width
    const H = height

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#fdfaf4'
    ctx.fillRect(0, 0, W, H)

    // 底图：cover 铺满
    const img = imageEl.value
    if (img) {
      const scale = Math.max(W / img.width, H / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
    }

    // 底部渐变蒙版：保证文字永远有可读背景
    if (draft.value.band) {
      const bandTop = H * 0.58
      const g = ctx.createLinearGradient(0, bandTop, 0, H)
      g.addColorStop(0, 'rgba(253,250,244,0)')
      g.addColorStop(0.28, 'rgba(253,250,244,0.72)')
      g.addColorStop(0.55, 'rgba(253,250,244,0.94)')
      g.addColorStop(1, 'rgba(253,250,244,0.985)')
      ctx.fillStyle = g
      ctx.fillRect(0, bandTop, W, H - bandTop)
    }

    // 文字层
    for (const t of draft.value.texts) {
      if (!t.text.trim()) continue
      const px = Math.max(10, t.size * W)
      ctx.save()
      ctx.font = `${px}px ${fontStack(t.font)}`
      ctx.fillStyle = t.color
      ctx.textAlign = t.align
      ctx.textBaseline = 'middle'
      ctx.translate(t.x * W, t.y * H)
      if (t.rotate) ctx.rotate((t.rotate * Math.PI) / 180)
      ctx.fillText(t.text, 0, 0)
      ctx.restore()
    }
  }

  function fontStack(kind: CardTextItem['font']): string {
    switch (kind) {
      case 'display': return '"Playfair Display", Georgia, serif'
      case 'script': return '"Caveat", "Segoe Script", cursive'
      default: return '"Lora", Georgia, serif'
    }
  }

  /**
   * 免费版的斜标。
   * ⚠️ 预览、下载、分享**三处都要走这一个函数** ——
   *    少一处就是一个"免费用户拿走了干净成品"的漏口。
   */
  function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#ffffff'
    ctx.font = `${Math.round(width * 0.028)}px "Playfair Display", Georgia, serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.translate(width / 2, height * 0.5)
    ctx.rotate(-Math.PI / 7)
    ctx.fillText('Create Keepsakes', 0, 0)
    ctx.restore()
  }

  function renderPreview() {
    const canvas = previewCanvas.value
    if (!canvas) return
    const dpr = Math.min(2, import.meta.client ? window.devicePixelRatio || 1 : 1)
    const w = PREVIEW_W
    const h = Math.round((w * spec.value.height) / spec.value.width)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    paint(ctx, w, h)
    // 免费版预览也要打标 —— 预览 = 交付
    if (watermark.value) drawWatermark(ctx, w, h)
  }

  /* ---------------- 导出 ---------------- */
  /**
   * 导出成品图
   * @param opts.targetWidth 目标宽度；不传则用规格原始宽度（300 DPI 打印尺寸）
   * @param opts.watermark   是否加水印（免费版）
   * @param opts.format      'jpeg' | 'png'
   */
  async function exportCard(opts: {
    targetWidth?: number
    watermark?: boolean
    format?: 'jpeg' | 'png'
  } = {}): Promise<Blob | null> {
    if (import.meta.server) return null
    const img = imageEl.value
    if (!img) {
      error.value = '还没有底图，无法导出'
      return null
    }
    exporting.value = true
    try {
      const targetW = opts.targetWidth ?? spec.value.width
      const targetH = Math.round((targetW * spec.value.height) / spec.value.width)
      const canvas = document.createElement('canvas')
      canvas.width = targetW
      canvas.height = targetH
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('无法创建画布')
      paint(ctx, targetW, targetH)

      if (opts.watermark) {
        drawWatermark(ctx, targetW, targetH)
      }

      const mime = opts.format === 'png' ? 'image/png' : 'image/jpeg'
      const quality = opts.format === 'png' ? undefined : 0.92
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, mime, quality),
      )
      return blob
    } catch (e) {
      error.value = e instanceof Error ? e.message : '导出失败'
      return null
    } finally {
      exporting.value = false
    }
  }

  async function downloadCard(opts: {
    targetWidth?: number
    watermark?: boolean
    format?: 'jpeg' | 'png'
    filename?: string
  } = {}) {
    const blob = await exportCard(opts)
    if (!blob) return false
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = opts.filename || `card-${Date.now()}.${opts.format === 'png' ? 'png' : 'jpg'}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    return true
  }

  /* ---------------- 文字编辑 ---------------- */
  function addText(kind: CardTextItem['kind'], text = '') {
    const presets: Record<CardTextItem['kind'], Omit<CardTextItem, 'id' | 'text' | 'kind'>> = {
      name: { x: 0.5, y: 0.795, size: 0.07, color: '#c8543d', align: 'center', font: 'display', rotate: 0 },
      message: { x: 0.5, y: 0.868, size: 0.028, color: '#3a2f28', align: 'center', font: 'body', rotate: 0 },
      signature: { x: 0.5, y: 0.945, size: 0.047, color: '#3a2f28', align: 'center', font: 'script', rotate: 0 },
      title: { x: 0.5, y: 0.72, size: 0.045, color: '#3a2f28', align: 'center', font: 'display', rotate: 0 },
    }
    const item: CardTextItem = {
      id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      kind,
      text,
      ...presets[kind],
    }
    draft.value.texts.push(item)
    return item
  }

  function updateText(id: string, patch: Partial<CardTextItem>) {
    const t = draft.value.texts.find(x => x.id === id)
    if (t) Object.assign(t, patch)
  }

  function removeText(id: string) {
    draft.value.texts = draft.value.texts.filter(x => x.id !== id)
  }

  /* ---------------- 拖动 ---------------- */
  const dragging = ref<{ id: string; dx: number; dy: number } | null>(null)

  function startDrag(e: PointerEvent, id: string) {
    const canvas = previewCanvas.value
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const item = draft.value.texts.find(t => t.id === id)
    if (!item) return
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    dragging.value = { id, dx: item.x - px, dy: item.y - py }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  function moveDrag(e: PointerEvent) {
    if (!dragging.value) return
    const canvas = previewCanvas.value
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const item = draft.value.texts.find(t => t.id === dragging.value!.id)
    if (!item) return
    item.x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width + dragging.value.dx))
    item.y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height + dragging.value.dy))
  }

  function endDrag() {
    dragging.value = null
  }

  /* ---------------- 生命周期 ---------------- */
  onMounted(async () => {
    await loadFonts()
    if (draft.value.imageUrl) await loadImage(draft.value.imageUrl)
    renderPreview()
  })

  watch(() => draft.value.imageUrl, async (u) => {
    await loadImage(u)
    renderPreview()
  })
  watch(() => draft.value.texts, renderPreview, { deep: true })
  watch(() => draft.value.band, renderPreview)
  // 付费状态是异步查出来的 → 变成付费用户时要把预览上的标去掉
  watch(watermark, renderPreview)
  watch(() => draft.value.specId, () => {
    spec.value = getCardSpec(draft.value.specId)
    renderPreview()
  })

  return {
    draft,
    spec,
    loading,
    exporting,
    error,
    fontsReady,
    previewCanvas,
    /** 免费版打标开关（预览 / 下载 / 分享共用） */
    watermark,
    addText,
    updateText,
    removeText,
    renderPreview,
    exportCard,
    downloadCard,
    startDrag,
    moveDrag,
    endDrag,
    specs: CARD_SPECS,
  }
}
