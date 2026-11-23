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
      <!-- 格式提示：版式由入口格式决定（invite 单卡 / card 对开），不在这里切 -->
      <div class="ck-format-hint">
        <span class="ck-format-hint__badge">{{ fmt.badge }}</span>
        <p>{{ fmt.layoutHint }}</p>
      </div>

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

      <!--
        ============ 保存 vs 导出（P0 2026-11-23）============
        学 GI 的节奏：创作与交付分开。
        - Keep：自动存排版（meta）+ Finish 把成品图落库（草稿→作品）
        - Take：下载/分享/打印 —— 免费带水印，去水印才是付费点
        不另加「Save draft」按钮，避免和自动保存 / Finish 重复。
      -->
      <section class="ck-panel-sec" data-sec="keep">
        <h3 class="ck-panel-sec__title">Keep your design</h3>
        <p class="ck-panel-sec__hint">
          Saving keeps the layout in your account. Downloading is separate — you can take a file any time.
        </p>
        <p class="ck-save-status" :data-status="metaSaveStatus" aria-live="polite">
          <span v-if="metaSaveStatus === 'saving'" class="i-ph-spinner animate-spin" />
          <span v-else-if="metaSaveStatus === 'saved'" class="i-ph-check-circle" />
          <span v-else-if="metaSaveStatus === 'error'" class="i-ph-warning-circle" />
          <span v-else-if="metaSaveStatus === 'dirty'" class="i-ph-pencil-simple" />
          <span v-else class="i-ph-cloud" />
          {{ metaSaveLabel }}
        </p>
        <button
          v-if="cardId"
          class="ck-finish"
          :class="{ 'ck-finish--done': finalized && !finishDirty }"
          :disabled="exporting || finishing || (finalized && !finishDirty)"
          data-act="finish"
          @click="finishCard"
        >
          <span :class="finalized && !finishDirty ? 'i-ph-check-circle' : (finishing ? 'i-ph-spinner animate-spin' : 'i-ph-sparkle')" />
          {{ finishButtonLabel }}
        </button>
        <p class="ck-hint">
          Finish puts the card with your words into My creations and updates the share link.
          Free cards stay watermarked — removing the mark is the only paid step.
        </p>
        <p v-if="finishError" class="ck-error">{{ finishError }}</p>
      </section>

      <section class="ck-panel-sec" data-sec="take">
        <h3 class="ck-panel-sec__title">Download &amp; share</h3>
        <p class="ck-print-note"><span class="i-ph-printer" /> {{ fmt.printNote }}</p>

        <!-- 权限透明：不弹阻断窗，两行说清楚免费 vs 付费 -->
        <div class="ck-perm" data-act="export-permission">
          <div class="ck-perm__row ck-perm__row--free">
            <span class="ck-perm__badge">Free</span>
            <span class="ck-perm__text">1024 px file with a small mark — preview, download and share.</span>
          </div>
          <div class="ck-perm__row" :class="hasPaid ? 'ck-perm__row--paid-on' : 'ck-perm__row--paid'">
            <span class="ck-perm__badge">{{ hasPaid ? 'Included' : 'Print-ready' }}</span>
            <span class="ck-perm__text">
              2K · 300 DPI · no mark.
              <template v-if="!hasPaid">
                <button type="button" class="ck-perm__link" data-act="remove-watermark" @click="$emit('remove-watermark')">
                  Remove the watermark
                </button>
                or
                <NuxtLink to="/pricing">see plans</NuxtLink>.
              </template>
              <template v-else>Ready on your plan.</template>
            </span>
          </div>
        </div>

        <div class="ck-panel-sec__actions">
          <button class="ck-btn ck-btn--primary" data-act="download" :disabled="exporting" @click="doDownload">
            <span v-if="exporting" class="i-ph-spinner animate-spin" />
            <span v-else class="i-ph-download-simple" />
            {{ hasPaid ? 'Download print file' : 'Download free version (with mark)' }}
          </button>
          <button class="ck-btn ck-btn--ghost" data-act="share" :disabled="exporting" @click="doShare">
            <span class="i-ph-share-network" />
            Share
          </button>
        </div>
        <p v-if="!hasPaid" class="ck-hint">
          Share and print use the same free file with the mark. Upgrade only if you need a clean print file.
        </p>

        <div class="ck-deliver">
          <button class="ck-deliver__btn" :disabled="exporting || !cardId" @click="copyShareLink">
            <span class="i-ph-link" />
            {{ linkCopied ? 'Link copied' : 'Copy share link' }}
          </button>
          <button class="ck-deliver__btn" :disabled="exporting" @click="doPrint">
            <span class="i-ph-printer" />
            Print
          </button>
          <button class="ck-deliver__btn" :disabled="exporting" @click="emailOpen = true">
            <span class="i-ph-envelope" />
            Email
          </button>
          <button class="ck-deliver__btn" :disabled="exporting" @click="pdfOpen = true">
            <span class="i-ph-file-pdf" />
            Download PDF
          </button>
        </div>
        <p v-if="!cardId" class="ck-hint">Finish the card first so the share link can open it.</p>
        <p v-if="error" class="ck-error">{{ error }}</p>
      </section>
    </div>

    <!-- ============ 邮件弹窗 ============ -->
    <Teleport to="body">
      <div v-if="emailOpen" class="ck-modal" role="dialog" aria-modal="true" @click.self="emailOpen = false">
        <div class="ck-modal__box">
          <button class="ck-modal__x" aria-label="Close" @click="emailOpen = false"><span class="i-ph-x" /></button>
          <h2 class="ck-modal__title">Send by email</h2>
          <p class="ck-modal__sub">We will open your email app with the card ready to send.</p>
          <div class="ck-field">
            <label class="ck-field__label">To</label>
            <input v-model="emailTo" class="ck-input" type="email" placeholder="them@example.com" />
          </div>
          <div class="ck-field">
            <label class="ck-field__label">Message (optional)</label>
            <textarea v-model="emailBody" class="ck-input ck-input--area" rows="3" placeholder="A note to go with your card…" />
          </div>
          <div class="ck-modal__actions">
            <button class="ck-btn ck-btn--ghost" @click="emailOpen = false">Cancel</button>
            <button class="ck-btn ck-btn--primary" :disabled="!emailTo" @click="sendEmail">Open email app →</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ============ PDF 弹窗 ============ -->
    <Teleport to="body">
      <div v-if="pdfOpen" class="ck-modal" role="dialog" aria-modal="true" @click.self="pdfOpen = false">
        <div class="ck-modal__box">
          <button class="ck-modal__x" aria-label="Close" @click="pdfOpen = false"><span class="i-ph-x" /></button>
          <h2 class="ck-modal__title">Download as PDF</h2>
          <p class="ck-modal__sub">Choose how the cards sit on the page, then save as PDF when your browser asks.</p>
          <p class="ck-print-note"><span class="i-ph-printer" /> {{ fmt.printNote }}</p>

          <!-- 每页张数：真正接打印层的 CSS 排版（2026-11-23 前端轻量实现） -->
          <div class="ck-field">
            <label class="ck-field__label">Cards per page</label>
            <div class="ck-pdf-opts">
              <button
                v-for="n in [1, 2, 4]"
                :key="n"
                type="button"
                class="ck-pdf-opt"
                :class="{ 'ck-pdf-opt--on': pdfPerPage === n }"
                :aria-pressed="pdfPerPage === n"
                @click="pdfPerPage = n"
              >{{ n }} page{{ n > 1 ? 's' : '' }}</button>
            </div>
          </div>
          <label class="ck-pdf-bleed">
            <input v-model="pdfBleed" type="checkbox" />
            Add a 3 mm bleed edge (print-shop cut guide)
          </label>

          <div class="ck-modal__actions">
            <button class="ck-btn ck-btn--ghost" @click="pdfOpen = false">Cancel</button>
            <button class="ck-btn ck-btn--primary" :disabled="exporting" @click="doPdf">
              <span class="i-ph-file-pdf" /> Make PDF
            </button>
          </div>
          <p class="ck-hint">This uses your browser's print dialog — pick “Save as PDF” as the destination. Bleed is a visual cut guide, not a print-shop bleed file.</p>
        </div>
      </div>
    </Teleport>

  </div>

  <!-- 打印专用层：teleport 到 body，打印时只显示这一层 -->
  <Teleport to="body">
    <div
      class="ck-print-root"
      :class="[`ck-print-n${pdfPerPage}`, { 'ck-print--bleed': pdfBleed }]"
      aria-hidden="true"
    >
      <div class="ck-print-page">
        <!-- card 格式：第一张是空白封面，其余是内页；invite 全是内页 -->
        <template v-for="n in pdfPerPage" :key="n">
          <div v-if="fmt.id === 'card' && n === 1" class="ck-print-card ck-print-card--cover" />
          <div v-else class="ck-print-card">
            <img :src="printUrl" alt="" />
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useCardCanvas, type CardTextItem } from '~/composables/useCardCanvas'
import { CARD_SPECS } from '~/utils/cardSpecs'
import { CARD_LAYOUTS, getCardLayout } from '~/utils/cardLayouts'
import { getCardFormat } from '~/utils/cardFormats'

const props = defineProps<{
  imageUrl: string
  /** 预置文字（来自场景 presetMessages / 生成前用户写好的字） */
  initialTexts?: Partial<CardTextItem>[]
  /** 是否有付费权限（决定导出版本） */
  hasPaid?: boolean
  /** 卡片格式：invite=单卡 / card=带封面对开（2026-11-20 竞品对齐） */
  format?: 'invite' | 'card'
  /** 资产 id（复制免登录分享链接用；从 /my-assets 打开旧卡时有值） */
  cardId?: string
  /**
   * ⚠️ 2026-11-17（远端线）：旧卡恢复用。
   *   用户从「我的作品」打开一张做过的卡 → 这里带的是**当时的成品数据**
   *   （版式 id + 每条文字的精确位置/字号/颜色）。
   *   有 texts 就直接用（位置是精确的），别再套一次版式把它覆盖了。
   */
  savedCard?: { layout?: string; texts?: CardTextItem[] }
  /**
   * 页面层自动保存排版（PUT /card）的状态 —— 只展示，不另开 Save 按钮。
   * idle | dirty | saving | saved | error
   */
  metaSaveStatus?: 'idle' | 'dirty' | 'saving' | 'saved' | 'error'
}>()

/** 成品状态变化 → 通知页面层去保存（update:card）；付费/完成走 finalized */
const emit = defineEmits<{
  (e: 'update:card', v: { layout: string; texts: CardTextItem[] }): void
  (e: 'remove-watermark'): void
  (e: 'finalized', payload: { id: string; finalUrl: string }): void
}>()

const metaSaveStatus = computed(() => props.metaSaveStatus || 'idle')
const metaSaveLabel = computed(() => {
  switch (metaSaveStatus.value) {
    case 'saving': return 'Saving your layout…'
    case 'saved': return 'Layout saved'
    case 'error': return 'Could not save layout — your edits are still here. Try again in a moment.'
    case 'dirty': return 'Unsaved layout changes…'
    default: return props.cardId ? 'Layout saves automatically while you edit' : 'Layout saves after the picture is ready'
  }
})

/** 当前格式的定义（给版式提示和打印说明用） */
const fmt = computed(() => getCardFormat(props.format))

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
  //
  // ⚠️ 2026-11-17：initialTexts 以前声明了却**根本没用** ——
  //    页面层传什么进来都被这三条默认文本覆盖掉。
  //    现在真正接上：用户在新流程里提前写好的名字和留言，
  //    出图后直接落在成品上（不用再手打一遍）。
  texts: props.savedCard?.texts?.length
    ? props.savedCard.texts
    : props.initialTexts?.length
      ? (props.initialTexts as CardTextItem[])
      : [
          { id: 'name', kind: 'name', text: '', x: 0.5, y: 0.79, size: 0.075, color: '#c8543d', align: 'center', font: 'display', rotate: 0 },
          { id: 'message', kind: 'message', text: '', x: 0.5, y: 0.868, size: 0.028, color: '#3a2f28', align: 'center', font: 'body', rotate: 0 },
        ],
})

const hasPaid = computed(() => !!props.hasPaid)

/**
 * 当前版式 id
 *
 * ⚠️ 旧卡恢复：版式 id 也存下来了 → 直接回到用户当时选的那一版。
 *    传了不存在的 id 就当 classic（别让一张脏数据把编辑器搞挂）。
 */
const layoutId = ref(
  CARD_LAYOUTS.some(l => l.id === props.savedCard?.layout) ? (props.savedCard!.layout as string) : 'classic'
)

// 初始值已跟 classic 对齐（见上面的 texts）—— 这里再套一次，
// 保证以后改版式数据时初始态不会跟版式脱节
//
// ⚠️ 但如果是从旧卡恢复的，texts 里带着**当时的精确位置**，
//    再套一次版式就把它覆盖了 → 恢复出来的卡长得跟用户做的不一样。
onMounted(() => {
  if (!props.savedCard?.texts?.length) applyLayout(layoutId.value)
})

/** Finish 状态要在 watch 之前声明（下方改字会读这两个 ref） */
const finishing = ref(false)
const finalized = ref(false)
/** Finish 成功后又改过 → 允许再 Finish，更新分享页成品 */
const finishDirty = ref(false)
const finishError = ref('')

/**
 * 成品状态一变就报给页面层 → 页面层防抖存到服务器。
 *
 * ⚠️ 用 watch 而不是手动在每个函数里 emit —— 拖字、改字、换版式
 *    都会走到 draft.texts，手动 emit 迟早漏掉一处。
 *
 * Finish 之后若再改字/换版式 → finishDirty，允许再次 Finish 更新成品图
 * （否则「Saved」锁死，分享链接停在旧字上）。
 */
let skipFinishDirty = true
watch(
  [layoutId, () => draft.value.texts],
  () => {
    emit('update:card', {
      layout: layoutId.value,
      // 深拷贝：draft 里的对象是响应式的，直接传出去会被外部改到
      texts: JSON.parse(JSON.stringify(draft.value.texts)) as CardTextItem[],
    })
    if (skipFinishDirty) {
      skipFinishDirty = false
      return
    }
    if (finalized.value) finishDirty.value = true
  },
  { deep: true, immediate: true }
)

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

/* ---------------- 就地交付（2026-11-20 原型对齐） ---------------- */

/** 复制免登录的分享链接：指向资产详情页 /card/{id}，对方无需账号即可打开 */
const linkCopied = ref(false)

/** 完成设计：导出带字+水印的成品 → 上传落库 → 草稿转作品（2026-11-23 原型对齐） */
const api = useApi()

const finishButtonLabel = computed(() => {
  if (finishing.value) return 'Saving…'
  if (finalized.value && !finishDirty.value) return 'Saved to your creations'
  if (finalized.value && finishDirty.value) return 'Save updates to your creations'
  return 'Finish & save to my creations'
})

async function finishCard() {
  if (!props.cardId || finishing.value) return
  if (finalized.value && !finishDirty.value) return
  finishing.value = true
  finishError.value = ''
  try {
    // 免费版 1024px + 水印；付费版规格原始尺寸无水印。口径与下载/打印一致。
    const blob = await exportCard(
      hasPaid.value
        ? { format: 'png' }
        : { targetWidth: 1024, watermark: true, format: 'png' },
    )
    if (!blob) throw new Error('Could not render the finished card.')

    // Blob → data URL（finalize API 接受 base64）
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Could not read the card image.'))
      reader.readAsDataURL(blob)
    })

    const res = await api.post<{ ok: boolean; finalUrl: string }>(
      `/api/images/${props.cardId}/finalize`,
      {
        imageBase64: dataUrl,
        format: props.format,
        watermarked: !hasPaid.value,
      },
    )
    finalized.value = true
    finishDirty.value = false
    emit('finalized', { id: props.cardId, finalUrl: res.finalUrl })
  } catch (e: any) {
    finishError.value =
      e?.data?.statusMessage || e?.message || 'Could not save the finished card. Try again.'
    // 401 = 会话过期/未登录 → 弹登录；登录成功后自动再 Finish（稿还在内存里）
    if (e?.statusCode === 401 || e?.data?.statusCode === 401) {
      const auth = useAuthModal()
      auth.setNote('Sign in to keep this finished card — your words are still here.')
      auth.setAfterAuth(async () => { await finishCard() })
      auth.openLogin()
    }
  } finally {
    finishing.value = false
  }
}

async function copyShareLink() {
  if (!props.cardId) return
  const link = `${location.origin}/card/${props.cardId}`
  try {
    await navigator.clipboard.writeText(link)
  } catch {
    // 剪贴板 API 在 http/旧浏览器不可用 → 用一个临时 textarea 兜底
    const ta = document.createElement('textarea')
    ta.value = link
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  linkCopied.value = true
  setTimeout(() => { linkCopied.value = false }, 2500)
}

/**
 * 打印/PDF 共用一份「合成后的成品图」。
 * ⚠️ 不能用 props.imageUrl —— 那是没有名字/留言的模型底图，
 *    直接打印等于把用户写好的字丢了。走 exportCard 才跟下载口径一致。
 */
const printUrl = ref('')
async function preparePrintImage(): Promise<boolean> {
  const blob = await exportCard(
    hasPaid.value
      ? { format: 'png' }
      : { targetWidth: 1024, watermark: true, format: 'png' },
  )
  if (!blob) return false
  if (printUrl.value?.startsWith('blob:')) URL.revokeObjectURL(printUrl.value)
  printUrl.value = URL.createObjectURL(blob)
  return true
}

onBeforeUnmount(() => {
  if (printUrl.value?.startsWith('blob:')) URL.revokeObjectURL(printUrl.value)
})

/** 打印：唤起浏览器打印，只打印 teleport 出去的 .ck-print-root */
async function doPrint() {
  if (!await preparePrintImage()) return
  await nextTick()
  window.print()
}

/** 邮件弹窗 */
const emailOpen = ref(false)
const emailTo = ref('')
const emailBody = ref('')
function sendEmail() {
  const body = [
    emailBody.value || 'I made this card for you.',
    '',
    `Open the card: ${props.cardId ? `${location.origin}/card/${props.cardId}` : location.href}`,
  ].join('\n')
  const href = `mailto:${encodeURIComponent(emailTo.value)}?subject=${encodeURIComponent('A card for you')}&body=${encodeURIComponent(body)}`
  window.location.href = href
  emailOpen.value = false
}

/** PDF 弹窗：用浏览器打印对话框「另存为 PDF」，不引第三方库 */
const pdfOpen = ref(false)
/** 每页几张 + 出血位开关 —— 真正驱动打印层 CSS（2026-11-23 前端轻量实现） */
const pdfPerPage = ref(2)
const pdfBleed = ref(false)
async function doPdf() {
  if (!await preparePrintImage()) return
  pdfOpen.value = false
  await nextTick()
  window.print()
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

/* 格式提示（invite 单卡 / card 对开） */
.ck-format-hint {
  padding: 0.7rem 0.8rem;
  border: 1px solid rgba(200, 84, 61, 0.18);
  border-radius: 0.6rem;
  background: rgba(200, 84, 61, 0.05);
}
.ck-format-hint__badge {
  display: inline-block;
  margin-bottom: 0.3rem;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #a53f2c;
}
.ck-format-hint p { margin: 0; font-size: 0.8125rem; line-height: 1.5; color: #6b5f55; }
.ck-print-note {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #6b5f55;
}
.ck-print-note .i-ph-printer { vertical-align: -0.15em; margin-right: 0.3rem; color: #a53f2c; }
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

/* 自动保存状态（Keep 区） */
.ck-save-status {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  margin: 0;
  padding: 0.55rem 0.7rem;
  border-radius: 0.5rem;
  background: rgba(58, 46, 38, 0.04);
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #6b5f55;
}
.ck-save-status[data-status='saved'] { color: #2f4034; background: rgba(47, 64, 52, 0.08); }
.ck-save-status[data-status='error'] { color: #a53f2c; background: rgba(200, 84, 61, 0.08); }
.ck-save-status[data-status='dirty'],
.ck-save-status[data-status='saving'] { color: #6b5f55; }
.ck-save-status .i-ph-spinner,
.ck-save-status .i-ph-check-circle,
.ck-save-status .i-ph-warning-circle,
.ck-save-status .i-ph-pencil-simple,
.ck-save-status .i-ph-cloud {
  flex-shrink: 0;
  margin-top: 0.1rem;
}

/* 导出权限透明条（不阻断） */
.ck-perm {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.ck-perm__row {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  padding: 0.55rem 0.7rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(58, 46, 38, 0.1);
  background: #fff;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #6b5f55;
}
.ck-perm__row--free { border-color: rgba(58, 46, 38, 0.12); }
.ck-perm__row--paid { border-color: rgba(201, 162, 39, 0.35); background: rgba(201, 162, 39, 0.08); }
.ck-perm__row--paid-on { border-color: rgba(47, 64, 52, 0.25); background: rgba(47, 64, 52, 0.06); }
.ck-perm__badge {
  flex-shrink: 0;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.15rem 0.4rem;
  border-radius: 0.3rem;
  background: rgba(58, 46, 38, 0.08);
  color: #6b5f55;
}
.ck-perm__row--paid .ck-perm__badge,
.ck-perm__row--paid-on .ck-perm__badge {
  background: rgba(201, 162, 39, 0.25);
  color: #7a5a12;
}
.ck-perm__row--paid-on .ck-perm__badge {
  background: rgba(47, 64, 52, 0.15);
  color: #2f4034;
}
.ck-perm__text a,
.ck-perm__link {
  color: #a53f2c;
  font-weight: 600;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  text-decoration: underline;
}
.ck-perm__link:hover { color: #c8543d; }

/* ---------- 去水印入口 & 就地交付（2026-11-20） ---------- */
.ck-remove-wm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 0.8rem;
  border: 1px solid rgba(201, 162, 39, 0.4);
  border-radius: 0.6rem;
  background: rgba(201, 162, 39, 0.1);
  font-size: 0.8125rem;
  font-weight: 600;
  color: #6b5f55;
  cursor: pointer;
  text-align: left;
}
.ck-remove-wm .i-ph-sparkle { color: #c9a227; }
.ck-remove-wm__link { margin-left: auto; color: #a53f2c; font-weight: 700; text-decoration: none; }

.ck-finish {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  padding: 0.7rem 0.9rem;
  border: 1.5px solid #c8543d;
  border-radius: 0.6rem;
  background: #c8543d;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
}
.ck-finish:hover:not(:disabled) { background: #a53f2c; }
.ck-finish:disabled { cursor: not-allowed; opacity: 0.7; }
.ck-finish--done { background: #2f4034; border-color: #2f4034; }

.ck-deliver { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; }
.ck-deliver__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.55rem 0.5rem;
  border: 1px solid rgba(58, 46, 38, 0.16);
  border-radius: 0.5rem;
  background: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #6b5f55;
  cursor: pointer;
}
.ck-deliver__btn:hover { border-color: #c8543d; color: #a53f2c; }
.ck-deliver__btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ---------- 弹窗 ---------- */
.ck-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(36, 31, 27, 0.55);
}
.ck-modal__box {
  position: relative;
  width: 100%;
  max-width: 27rem;
  padding: 1.6rem;
  border-radius: 1rem;
  background: #fffdfa;
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.ck-modal__x {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  border: none;
  background: none;
  font-size: 1.1rem;
  color: #a08f81;
  cursor: pointer;
}
.ck-modal__title { margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 1.5rem; }
.ck-modal__sub { margin: -0.5rem 0 0; font-size: 0.875rem; color: #8a7d72; line-height: 1.5; }
.ck-modal__actions { display: flex; justify-content: flex-end; gap: 0.5rem; }

/* PDF 版式选项（2026-11-23） */
.ck-pdf-opts { display: flex; gap: 0.5rem; }
.ck-pdf-opt {
  flex: 1;
  padding: 0.55rem 0.4rem;
  border: 1px solid rgba(58, 46, 38, 0.16);
  border-radius: 0.5rem;
  background: #fff;
  font-family: inherit;
  font-size: 0.8125rem;
  color: #6b5f55;
  cursor: pointer;
}
.ck-pdf-opt--on { border-color: #c8543d; background: rgba(200, 84, 61, 0.06); color: #a53f2c; font-weight: 700; }
.ck-pdf-bleed { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #6b5f55; }

</style>

<!-- 打印层 teleport 到 body，样式必须非 scoped 才能命中 -->
<style>
.ck-print-root { display: none; }
@media print {
  /* 打印时把应用整棵隐藏，只留打印层（原型同款隔离手法） */
  body > *:not(.ck-print-root) { display: none !important; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .ck-print-root { display: block !important; }
  .ck-print-page {
    display: grid;
    place-content: center;
    gap: 6mm;
    min-height: 100vh;
    page-break-inside: avoid;
  }
  .ck-print-card {
    box-sizing: border-box;
    width: var(--card-w, 100mm);
    height: var(--card-h, 140mm);
    border: 1px dashed #d8d0c7;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ck-print-card img { max-width: 100%; max-height: 100%; object-fit: contain; }
  /* card 格式多一张空白封面：内页 + 封面并排，裁开对折即用 */
  .ck-print-card--cover { border-style: solid; border-color: #fff; }

  /* 每页张数（前端轻量实现：纯 CSS 排版，不引 PDF 库） */
  .ck-print-n1 .ck-print-page { grid-template-columns: 1fr; --card-w: 100mm; --card-h: 140mm; }
  .ck-print-n2 .ck-print-page { grid-template-columns: repeat(2, auto); --card-w: 100mm; --card-h: 140mm; }
  .ck-print-n4 .ck-print-page { grid-template-columns: repeat(2, auto); --card-w: 88mm; --card-h: 123mm; gap: 4mm; }

  /* 出血位：3mm 外扩的裁切参考线（视觉示意，不是印刷级 bleed 文件） */
  .ck-print--bleed .ck-print-card { outline: 3mm solid rgba(200, 84, 61, 0.14); outline-offset: 0; }
  @page { size: A4 landscape; margin: 10mm; }
}
</style>
