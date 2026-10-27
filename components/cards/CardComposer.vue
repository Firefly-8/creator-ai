<template>
  <div class="ck-comp">
    <!-- ============ 预览 ============ -->
    <div class="ck-comp__stage">
      <div class="ck-comp__paper">
        <canvas
          ref="previewCanvas"
          class="ck-comp__canvas"
          @pointermove="moveDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        />
        <!-- 文字命中层：让用户能直接拖动文字 -->
        <button
          v-for="t in draft.texts"
          :key="t.id"
          class="ck-comp__hot"
          :style="hotStyle(t)"
          :title="`拖动调整位置：${t.text || '(空)'}`"
          @pointerdown.stop="startDrag($event, t.id)"
        >
          <span class="ck-comp__hot-label">{{ labelOf(t.kind) }}</span>
        </button>
        <div v-if="loading" class="ck-comp__loading">Loading your picture…</div>
      </div>

      <p class="ck-comp__tip">
        <span class="i-ph-cursor-click" />
        Drag any text to move it. Tap it to edit the words.
      </p>
    </div>

    <!-- ============ 编辑面板 ============ -->
    <div class="ck-comp__panel">
      <!-- ① 选版式：位置/字体/颜色/字号都定好了，用户只管填字 -->
      <section class="ck-panel-sec">
        <h3 class="ck-panel-sec__title">Pick a layout</h3>
        <p class="ck-panel-sec__hint">
          Every layout is set up for you — just write the words.
        </p>
        <div class="ck-layouts">
          <button
            v-for="l in CARD_LAYOUTS"
            :key="l.id"
            type="button"
            class="ck-layout"
            :class="{ 'ck-layout--on': layoutId === l.id }"
            :aria-pressed="layoutId === l.id"
            @click="applyLayout(l.id)"
          >
            <span class="ck-layout__thumb" :class="`ck-layout__thumb--${l.id}`">
              <span class="ck-layout__t ck-layout__t--name" />
              <span class="ck-layout__t ck-layout__t--msg" />
              <span class="ck-layout__t ck-layout__t--sig" />
            </span>
            <span class="ck-layout__label">{{ l.label }}</span>
            <span class="ck-layout__desc">{{ l.desc }}</span>
          </button>
        </div>
      </section>

      <!-- ② 只填两个必要字段：给谁的名字 + 想说的话 -->
      <section class="ck-panel-sec">
        <h3 class="ck-panel-sec__title">The words</h3>
        <p class="ck-panel-sec__hint">
          Two things to write. You can drag them on the card to nudge them.
        </p>

        <div v-for="t in draft.texts" :key="t.id" class="ck-field">
          <label class="ck-field__label">
            {{ labelOf(t.kind) }}
            <button
              v-if="t.kind === 'signature'"
              class="ck-field__del"
              title="Remove"
              :aria-label="`Remove ${labelOf(t.kind)}`"
              @click="removeText(t.id)"
            >
              <span class="i-ph-x" />
            </button>
          </label>
          <textarea
            v-if="t.kind === 'message'"
            class="ck-input ck-input--area"
            rows="3"
            :value="t.text"
            placeholder="Write your message here…"
            @input="updateText(t.id, { text: ($event.target as HTMLTextAreaElement).value })"
          />
          <input
            v-else
            class="ck-input"
            type="text"
            :value="t.text"
            :placeholder="placeholderOf(t.kind)"
            @input="updateText(t.id, { text: ($event.target as HTMLInputElement).value })"
          />
        </div>

        <!-- 签名是可选的：默认只给两个必填字段，想加签名再点 -->
        <div v-if="!hasSignatureText" class="ck-panel-sec__actions">
          <button class="ck-btn-mini" @click="addSignature">+ Add a signature</button>
        </div>
      </section>

      <!-- 尺寸 -->
      <section class="ck-panel-sec">
        <h3 class="ck-panel-sec__title">Size</h3>
        <div class="ck-sizes">
          <button
            v-for="s in specs.filter(x => x.use === 'card')"
            :key="s.id"
            class="ck-size"
            :class="{ 'ck-size--on': draft.specId === s.id }"
            @click="draft.specId = s.id"
          >
            <span class="ck-size__name">{{ s.label }}</span>
            <span class="ck-size__px">{{ s.width }} × {{ s.height }} px</span>
            <span class="ck-size__note">{{ s.note }}</span>
          </button>
        </div>
      </section>

      <!-- 导出 -->
      <section class="ck-panel-sec">
        <h3 class="ck-panel-sec__title">Download</h3>
        <p v-if="!hasPaid" class="ck-note">
          <span class="i-ph-info" />
          The free version is 1024 px with a small mark — in the preview, in the
          download and when you share it.
          <NuxtLink to="/pricing">Get the print-ready file</NuxtLink> for 300 DPI and no mark.
        </p>
        <div class="ck-panel-sec__actions">
          <button class="ck-btn ck-btn--primary" :disabled="exporting" @click="doDownload">
            <span v-if="exporting" class="i-ph-spinner animate-spin" />
            <span v-else class="i-ph-download-simple" />
            {{ hasPaid ? 'Download print file' : 'Download free version' }}
          </button>
          <button class="ck-btn ck-btn--ghost" :disabled="exporting" @click="doShare">
            <span class="i-ph-share-network" />
            Share
          </button>
        </div>
        <p v-if="error" class="ck-error">{{ error }}</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCardCanvas, type CardTextItem } from '~/composables/useCardCanvas'
import { CARD_SPECS } from '~/utils/cardSpecs'
import { CARD_LAYOUTS, getCardLayout } from '~/utils/cardLayouts'

const props = defineProps<{
  imageUrl: string
  /** 预置文字（来自场景 presetMessages） */
  initialTexts?: Partial<CardTextItem>[]
  /** 是否有付费权限（决定导出版本） */
  hasPaid?: boolean
}>()

const {
  draft, spec, loading, exporting, error, previewCanvas, specs,
  addText, updateText, removeText, renderPreview,
  downloadCard, exportCard, watermark,
  startDrag, moveDrag, endDrag,
} = useCardCanvas({
  imageUrl: props.imageUrl,
  specId: '5x7',
  // ⚠️ 默认**只有两个必填字段**（名字 + 留言）。
  //    签名是可选的 → 用户点了「+ Add a signature」才加。
  //    （以前默认三条，等于给用户塞了三个输入框）
  texts: [
    { id: 'name', kind: 'name', text: '', x: 0.5, y: 0.79, size: 0.075, color: '#c8543d', align: 'center', font: 'display', rotate: 0 },
    { id: 'message', kind: 'message', text: '', x: 0.5, y: 0.868, size: 0.028, color: '#3a2f28', align: 'center', font: 'body', rotate: 0 },
  ],
})

const hasPaid = computed(() => !!props.hasPaid)

/** 当前版式 id */
const layoutId = ref('classic')

// 初始值已跟 classic 对齐（见上面的 texts）—— 这里再套一次，
// 保证以后改版式数据时初始态不会跟版式脱节
onMounted(() => applyLayout(layoutId.value))

/** 签名在不在版式里（不在就用户自己加） */
/** 当前有没有签名文本（没有才显示「+ Add a signature」的按钮） */
const hasSignatureText = computed(() => draft.value.texts.some(t => t.kind === 'signature'))

/**
 * 换版式：把位置/字体/颜色/字号全部套上去，**但保留用户已经写的字**。
 *
 * ⚠️ 这是整个交互的核心：换版式 = 换个成品样子，不是把用户填的字清空。
 */
function applyLayout(id: string) {
  const layout = getCardLayout(id)
  layoutId.value = id

  for (const t of draft.value.texts) {
    const spec = layout.texts[t.kind as keyof typeof layout.texts]
    if (!spec) continue
    updateText(t.id, {
      x: spec.x,
      y: spec.y,
      size: spec.size,
      color: spec.color,
      align: spec.align,
      font: spec.font,
      rotate: spec.rotate ?? 0,
    })
  }
}

/** 用户自己加一个签名（版式里没有时的可选入口） */
function addSignature() {
  const layout = getCardLayout(layoutId.value)
  const spec = layout.texts.signature || {
    x: 0.5, y: 0.945, size: 0.047, color: '#3a2f28', align: 'center' as CanvasTextAlign, font: 'script' as const,
  }
  const item = addText('signature')
  updateText(item.id, {
    x: spec.x, y: spec.y, size: spec.size, color: spec.color,
    align: spec.align, font: spec.font, rotate: spec.rotate ?? 0,
  })
}

// 免费版：预览、下载、分享**三处都打标**（同一个开关）
watch(hasPaid, (paid) => {
  watermark.value = !paid
}, { immediate: true })

watch(() => props.imageUrl, async (u) => {
  if (!u) return
  draft.value.imageUrl = u
  await nextTick()
  renderPreview()
})

function labelOf(kind: CardTextItem['kind']) {
  return { name: 'Their name', message: 'Your message', signature: 'Signature', title: 'Heading' }[kind]
}

function placeholderOf(kind: CardTextItem['kind']) {
  return {
    name: 'e.g. Margaret',
    message: 'Your message…',
    signature: 'e.g. The Watson family',
    title: 'e.g. Happy Birthday',
  }[kind]
}

/** 文字命中层的位置（用同样的相对坐标） */
function hotStyle(t: CardTextItem) {
  return {
    left: `${t.x * 100}%`,
    top: `${t.y * 100}%`,
    transform: `translate(-50%, -50%) rotate(${t.rotate || 0}deg)`,
  }
}

async function doDownload() {
  await downloadCard(
    hasPaid.value
      ? { format: 'jpeg' }                     // 付费：规格原始尺寸（300 DPI），无水印
      : { targetWidth: 1024, watermark: true, format: 'jpeg' },
  )
}

async function doShare() {
  // ⚠️ 以前这里直接用 previewCanvas（**没有水印**）→ 免费用户点 Share
  //    就能把干净成品发到微信/WhatsApp，付费点直接漏掉。
  //    现在分享和下载走同一套导出：免费版同样 1024px + 打标。
  const blob = await exportCard(
    hasPaid.value
      ? { format: 'jpeg' }                          // 付费：300 DPI，无水印
      : { targetWidth: 1024, watermark: true, format: 'jpeg' },
  )
  if (!blob) return

  const file = new File([blob], 'card.jpg', { type: 'image/jpeg' })
  const nav = navigator as any
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'A card I made for you' })
      return
    } catch { /* 用户取消 */ }
  }
  // 降级：下载
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'card.jpg'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}
</script>

<style scoped>
.ck-comp {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 21rem;
  gap: 2rem;
  align-items: start;
}
@media (max-width: 900px) {
  .ck-comp { grid-template-columns: 1fr; }
}

/* ---------- 预览 ---------- */
/* ⚠️ min-width: 0 —— grid/flex item 默认 min-width:auto，
   canvas 的固有宽度（1500px 级）会把整页撑出横向滚动条。 */
.ck-comp__stage { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; min-width: 0; }

.ck-comp__paper {
  position: relative;
  max-width: 100%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: #fff;
  box-shadow: 0 24px 50px -26px rgba(42, 36, 32, 0.45);
}
.ck-comp__canvas {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 0.25rem;
  touch-action: none;
}

.ck-comp__hot {
  position: absolute;
  padding: 0.35rem 0.6rem;
  border: 1.5px dashed rgba(200, 84, 61, 0.55);
  border-radius: 0.4rem;
  background: rgba(255, 253, 250, 0.14);
  cursor: grab;
  font-size: 0.7rem;
  font-weight: 700;
  color: #a53f2c;
  opacity: 0;
  transition: opacity 0.15s ease;
  white-space: nowrap;
}
.ck-comp__paper:hover .ck-comp__hot { opacity: 1; }
.ck-comp__hot:active { cursor: grabbing; }
.ck-comp__hot-label { pointer-events: none; }

.ck-comp__loading {
  position: absolute;
  inset: 0.75rem;
  display: grid;
  place-items: center;
  border-radius: 0.25rem;
  background: rgba(253, 250, 244, 0.85);
  font-size: 0.9rem;
  color: #6b5f55;
}
.ck-comp__tip {
  font-size: 0.8125rem;
  color: #8a7d72;
}

/* ---------- 面板 ---------- */
.ck-comp__panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.25rem;
  border: 1px solid rgba(58, 46, 38, 0.12);
  border-radius: 0.9rem;
  background: #fffdfa;
}
.ck-panel-sec { display: flex; flex-direction: column; gap: 0.75rem; }
.ck-panel-sec__title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #a08f81;
}
.ck-panel-sec__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.ck-panel-sec__hint {
  margin: -0.35rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #8a7d72;
}

.ck-field { display: flex; flex-direction: column; gap: 0.4rem; }
.ck-field__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #6b5f55;
}
.ck-field__del {
  border: none;
  background: none;
  color: #b0a196;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.1rem 0.25rem;
}
.ck-field__del:hover { color: #c8543d; }
/* ---------- 版式选择 ---------- */
.ck-layouts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}
.ck-layout {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.6rem 0.6rem 0.7rem;
  border: 1.5px solid rgba(58, 46, 38, 0.14);
  border-radius: 0.7rem;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.ck-layout:hover { border-color: rgba(200, 84, 61, 0.5); }
.ck-layout--on {
  border-color: #c8543d;
  background: rgba(200, 84, 61, 0.05);
}
/* 缩略示意：一个迷你卡 */
.ck-layout__thumb {
  position: relative;
  display: block;
  height: 4.2rem;
  border-radius: 0.35rem;
  background: linear-gradient(180deg, #faf3e8 0%, #f1e3cd 100%);
  overflow: hidden;
}
.ck-layout__t {
  position: absolute;
  border-radius: 2px;
  background: rgba(58, 46, 38, 0.55);
}
.ck-layout__t--name { background: rgba(200, 84, 61, 0.85); }
.ck-layout__t--msg { background: rgba(58, 46, 38, 0.38); }
.ck-layout__t--sig { background: rgba(47, 64, 52, 0.55); }

/* classic：名字居中大字 + 下面一行话 + 签名 */
.ck-layout__thumb--classic .ck-layout__t--name { left: 28%; top: 42%; width: 44%; height: 0.42rem; }
.ck-layout__thumb--classic .ck-layout__t--msg { left: 22%; top: 60%; width: 56%; height: 0.2rem; }
.ck-layout__thumb--classic .ck-layout__t--sig { left: 38%; top: 76%; width: 24%; height: 0.18rem; }
/* modern：左上角名 + 下面的话 */
.ck-layout__thumb--modern .ck-layout__t--name { left: 12%; top: 34%; width: 34%; height: 0.3rem; }
.ck-layout__thumb--modern .ck-layout__t--msg { left: 12%; top: 52%; width: 48%; height: 0.16rem; }
.ck-layout__thumb--modern .ck-layout__t--sig { display: none; }
/* handwritten：两行手写，右下签名 */
.ck-layout__thumb--handwritten .ck-layout__t--name { left: 26%; top: 36%; width: 48%; height: 0.3rem; transform: rotate(-2deg); }
.ck-layout__thumb--handwritten .ck-layout__t--msg { left: 18%; top: 55%; width: 60%; height: 0.16rem; transform: rotate(-1deg); }
.ck-layout__thumb--handwritten .ck-layout__t--sig { right: 14%; top: 76%; width: 22%; height: 0.16rem; }
/* minimal：只有一行大字 */
.ck-layout__thumb--minimal .ck-layout__t--name { left: 30%; top: 46%; width: 40%; height: 0.34rem; }
.ck-layout__thumb--minimal .ck-layout__t--msg { left: 24%; top: 66%; width: 52%; height: 0.16rem; }
.ck-layout__thumb--minimal .ck-layout__t--sig { display: none; }

.ck-layout__label {
  font-size: 0.875rem;
  font-weight: 700;
  color: #2a2420;
}
.ck-layout--on .ck-layout__label { color: #a53f2c; }
.ck-layout__desc {
  font-size: 0.6875rem;
  line-height: 1.35;
  color: #8a7d72;
}


.ck-input {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid rgba(58, 46, 38, 0.16);
  border-radius: 0.5rem;
  background: #fff;
  font-size: 0.9375rem;
  font-family: inherit;
  color: #2a2420;
}
.ck-input:focus { outline: 2px solid rgba(200, 84, 61, 0.4); outline-offset: 1px; }
.ck-input--area { resize: vertical; min-height: 4.5rem; line-height: 1.5; }

.ck-btn-mini {
  padding: 0.4rem 0.7rem;
  border: 1px solid rgba(58, 46, 38, 0.16);
  border-radius: 0.5rem;
  background: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #6b5f55;
  cursor: pointer;
}
.ck-btn-mini:hover { border-color: #c8543d; color: #a53f2c; }

.ck-sizes { display: grid; gap: 0.5rem; }
.ck-size {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid rgba(58, 46, 38, 0.14);
  border-radius: 0.6rem;
  background: #fff;
  text-align: left;
  cursor: pointer;
}
.ck-size--on { border-color: #c8543d; background: rgba(200, 84, 61, 0.06); }
.ck-size__name { font-weight: 700; font-size: 0.9375rem; color: #2a2420; }
.ck-size__px { font-size: 0.75rem; color: #a08f81; }
.ck-size__note { font-size: 0.75rem; color: #6b5f55; }

.ck-note {
  /* ⚠️ 以前是 display:flex —— 文案一长，里面的 <a> 就被当成 flex item
     压成一条竖排的窄条（2026-10-23 改文案时踩到）。
     改成普通流：图标 inline 跟着第一行走，链接正常换行。 */
  display: block;
  padding: 0.6rem 0.7rem;
  border-radius: 0.5rem;
  background: rgba(201, 162, 39, 0.12);
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #6b5f55;
}
.ck-note .i-ph-info { vertical-align: -0.15em; margin-right: 0.25rem; }
.ck-note a { color: #a53f2c; font-weight: 600; }
.ck-error { font-size: 0.8125rem; color: #c8543d; }
</style>
