<template>
  <section class="preset-rail">
    <div class="mb-3 flex items-end justify-between gap-3 px-0.5">
      <div>
        <p class="text-[13px] font-semibold text-white">灵感预设</p>
        <p class="mt-0.5 text-[12px] text-ink-400">点选即填入 · 悬停暂停滚动</p>
      </div>
      <span class="hidden items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-ink-300 sm:inline-flex">
        <span class="i-ph-sparkle text-[12px] text-accent-soft" />
        {{  presets.length  }} vibes
      </span>
    </div>

    <div
      class="preset-marquee"
      :class="{ 'is-paused': paused }"
      @mouseenter="paused = true"
      @mouseleave="paused = false"
      @focusin="paused = true"
      @focusout="onFocusOut"
    >
      <div class="preset-marquee-glow" aria-hidden="true" />
      <div class="preset-fade preset-fade-left" />
      <div class="preset-fade preset-fade-right" />

      <div class="preset-rows">
        <div
          class="preset-marquee-track is-ltr"
          :style="{ '--marquee-duration': `${duration}s` }"
        >
          <div
            v-for="copy in 2"
            :key="`a-${copy}`"
            class="preset-marquee-group"
            :aria-hidden="copy === 2"
          >
            <button
              v-for="preset in rowA"
              :key="`a-${copy}-${preset.id}`"
              type="button"
              class="preset-chip"
              :class="{ 'is-active': activeId === preset.id }"
              :title="preset.label"
              @click="onPick(preset)"
            >
              <span class="preset-chip-icon">
                <span class="text-[15px]" :class="`i-${preset.icon}`" />
              </span>
              <span class="preset-chip-copy">
                <span class="preset-chip-cat">{{  preset.category  }}</span>
                <span class="preset-chip-title">{{  preset.shortLabel  }}</span>
              </span>
            </button>
          </div>
        </div>

        <div
          class="preset-marquee-track is-rtl"
          :style="{ '--marquee-duration': `${duration * 1.12}s` }"
        >
          <div
            v-for="copy in 2"
            :key="`b-${copy}`"
            class="preset-marquee-group"
            :aria-hidden="copy === 2"
          >
            <button
              v-for="preset in rowB"
              :key="`b-${copy}-${preset.id}`"
              type="button"
              class="preset-chip"
              :class="{ 'is-active': activeId === preset.id }"
              :title="preset.label"
              @click="onPick(preset)"
            >
              <span class="preset-chip-icon">
                <span class="text-[15px]" :class="`i-${preset.icon}`" />
              </span>
              <span class="preset-chip-copy">
                <span class="preset-chip-cat">{{  preset.category  }}</span>
                <span class="preset-chip-title">{{  preset.shortLabel  }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { SONG_PRESETS, splitPresetRows, type SongPreset } from '~/utils/presets'

const props = withDefaults(
  defineProps<{
    presets?: SongPreset[]
    activeId?: string | null
    duration?: number
  }>(),
  {
    presets: () => SONG_PRESETS,
    activeId: null,
    duration: 36,
  },
)

const emit = defineEmits<{
  select: [preset: SongPreset]
}>()

const paused = ref(false)
const rows = computed(() => splitPresetRows(props.presets))
const rowA = computed(() => rows.value.rowA)
const rowB = computed(() => rows.value.rowB)

function onPick(preset: SongPreset) {
  emit('select', preset)
}

function onFocusOut(e: FocusEvent) {
  const root = e.currentTarget as HTMLElement
  if (!root.contains(e.relatedTarget as Node | null)) {
    paused.value = false
  }
}
</script>
