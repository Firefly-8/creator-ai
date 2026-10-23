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
      <!-- 文字 -->
      <section class="ck-panel-sec">
        <h3 class="ck-panel-sec__title">The words</h3>
        <p class="ck-panel-sec__hint">
          Type the words, then pick how they look. Drag them on the card to move them.
        </p>

        <div v-for="t in draft.texts" :key="t.id" class="ck-field">
          <label class="ck-field__label">
            {{ labelOf(t.kind) }}
            <button class="ck-field__del" title="Remove" :aria-label="`Remove ${labelOf(t.kind)}`" @click="removeText(t.id)">
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
          <div class="ck-field__opts">
            <div class="ck-opt">
              <span class="ck-opt__label">Style</span>
              <div class="ck-opt__body">
                <button
                  v-for="f in FONT_OPTIONS"
                  :key="f.id"
                  type="button"
                  class="ck-font"
                  :class="[`ck-font--${f.id}`, { 'ck-font--on': t.font === f.id }]"
                  :title="f.title"
                  :aria-pressed="t.font === f.id"
                  @click="updateText(t.id, { font: f.id })"
                >
                  <span class="ck-font__aa">Aa</span>
                  <span class="ck-font__name">{{ f.name }}</span>
                </button>
              </div>
            </div>

            <div class="ck-opt">
              <span class="ck-opt__label">Colour</span>
              <div class="ck-opt__body">
                <button
                  v-for="c in COLOR_OPTIONS"
                  :key="c.value"
                  type="button"
                  class="ck-swatch"
                  :class="{ 'ck-swatch--on': t.color === c.value }"
                  :style="{ background: c.value, color: c.ink }"
                  :title="c.name"
                  :aria-label="c.name"
                  :aria-pressed="t.color === c.value"
                  @click="updateText(t.id, { color: c.value })"
                >
                  <span v-if="t.color === c.value" class="i-ph-check" />
                </button>
              </div>
            </div>

            <div class="ck-opt">
              <span class="ck-opt__label">Size</span>
              <div class="ck-opt__body">
                <button
                  type="button"
                  class="ck-size-btn"
                  title="Make it smaller"
                  aria-label="Make it smaller"
                  @click="updateText(t.id, { size: Math.max(0.012, t.size - 0.006) })"
                >
                  A−
                </button>
                <button
                  type="button"
                  class="ck-size-chip"
                  :title="`Back to ${sizeLabel(t.size)}`"
                  @click="updateText(t.id, { size: sizeStep(t.size) })"
                >
                  {{ sizeLabel(t.size) }}
                </button>
                <button
                  type="button"
                  class="ck-size-btn"
                  title="Make it bigger"
                  aria-label="Make it bigger"
                  @click="updateText(t.id, { size: Math.min(0.2, t.size + 0.006) })"
                >
                  A+
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="ck-panel-sec__actions">
          <button class="ck-btn-mini" @click="addText('message')">+ Add a message</button>
          <button class="ck-btn-mini" @click="addText('name')">+ Add a name</button>
          <button class="ck-btn-mini" @click="addText('signature')">+ Add a signature</button>
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
  texts: [
    { id: 'name', kind: 'name', text: '', x: 0.5, y: 0.795, size: 0.07, color: '#c8543d', align: 'center', font: 'display', rotate: 0 },
    { id: 'message', kind: 'message', text: '', x: 0.5, y: 0.868, size: 0.028, color: '#3a2f28', align: 'center', font: 'body', rotate: 0 },
    { id: 'signature', kind: 'signature', text: '', x: 0.5, y: 0.945, size: 0.047, color: '#3a2f28', align: 'center', font: 'script', rotate: 0 },
  ],
})

const hasPaid = computed(() => !!props.hasPaid)

/** 字体选项 —— 按钮里用真实字体渲染，所见即所得 */
const FONT_OPTIONS = [
  { id: 'display', name: 'Serif', title: 'Elegant serif — good for a name' },
  { id: 'body', name: 'Plain', title: 'Easy to read — good for a message' },
  { id: 'script', name: 'Hand', title: 'Handwriting — good for a signature' },
] as const

/** 颜色选项 —— ink 是色块上对勾的颜色（浅色块要用深色对勾） */
const COLOR_OPTIONS = [
  { value: '#3a2f28', name: 'Ink', ink: '#ffffff' },
  { value: '#c8543d', name: 'Coral', ink: '#ffffff' },
  { value: '#2f4034', name: 'Forest', ink: '#ffffff' },
  { value: '#c9a227', name: 'Gold', ink: '#3a2f28' },
  { value: '#ffffff', name: 'White', ink: '#3a2f28' },
] as const

/** 字号档位（size 是相对卡宽的比例） */
const SIZE_STEPS = [
  { label: 'Small', value: 0.026 },
  { label: 'Medium', value: 0.042 },
  { label: 'Large', value: 0.065 },
  { label: 'Huge', value: 0.11 },
] as const

function sizeLabel(size: number): string {
  if (size < 0.032) return 'Small'
  if (size < 0.055) return 'Medium'
  if (size < 0.09) return 'Large'
  return 'Huge'
}

/** 点档位名字 → 回到该档的标准大小 */
function sizeStep(size: number): number {
  const label = sizeLabel(size)
  return SIZE_STEPS.find(s => s.label === label)?.value ?? size
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
/* ---------- 文字选项（Style / Colour / Size） ---------- */
.ck-field__opts {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-top: 0.1rem;
}
.ck-opt {
  display: grid;
  grid-template-columns: 3.2rem minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem;
}
.ck-opt__label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #8a7d72;
  letter-spacing: 0.01em;
}
.ck-opt__body { display: flex; gap: 0.3rem; min-width: 0; }

/* 字体：按钮里直接用真字体渲染，所见即所得 */
.ck-font {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.05rem;
  padding: 0.35rem 0.15rem 0.3rem;
  border: 1px solid rgba(58, 46, 38, 0.16);
  border-radius: 0.45rem;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.ck-font:hover { border-color: rgba(200, 84, 61, 0.55); }
.ck-font--on {
  border-color: #c8543d;
  background: rgba(200, 84, 61, 0.08);
}
.ck-font__aa { font-size: 0.95rem; line-height: 1.15; color: #2a2420; }
.ck-font__name {
  max-width: 100%;
  font-size: 0.625rem;
  line-height: 1.2;
  color: #8a7d72;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ck-font--on .ck-font__name { color: #a53f2c; font-weight: 700; }
.ck-font--display .ck-font__aa { font-family: 'Playfair Display', Georgia, serif; }
.ck-font--body .ck-font__aa { font-family: 'Lora', Georgia, serif; }
.ck-font--script .ck-font__aa { font-family: 'Caveat', 'Segoe Script', cursive; font-size: 1.05rem; }

/* 颜色 */
.ck-swatch {
  flex: 0 0 auto;
  width: 1.55rem;
  height: 1.55rem;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(58, 46, 38, 0.32);
  border-radius: 50%;
  cursor: pointer;
  transition: box-shadow 0.15s ease;
}
.ck-swatch .i-ph-check { font-size: 0.75rem; }
/* 白色块在深色/奶油底上都看不见 → 给它一圈深色描边 */
.ck-swatch[style*='#ffffff'] { border-color: rgba(58, 46, 38, 0.55); }
.ck-swatch--on { box-shadow: 0 0 0 2px #fffdfa, 0 0 0 3.5px #c8543d; }

/* 字号 */
.ck-size-btn {
  flex: 0 0 auto;
  width: 2.1rem;
  height: 2rem;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(58, 46, 38, 0.16);
  border-radius: 0.45rem;
  background: #fff;
  color: #6b5f55;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.ck-size-btn:hover { border-color: #c8543d; color: #a53f2c; }
.ck-size-chip {
  flex: 0 1 5.5rem;
  min-width: 0;
  height: 2rem;
  padding: 0 0.4rem;
  border: 1px solid rgba(58, 46, 38, 0.12);
  border-radius: 0.45rem;
  background: rgba(58, 46, 38, 0.04);
  color: #6b5f55;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.ck-size-chip:hover { border-color: rgba(200, 84, 61, 0.5); color: #a53f2c; }

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
