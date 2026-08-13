<template>
  <section class="panel space-y-4 p-5 md:p-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="font-display text-[17px] font-600 text-white">Audio editor</h2>
      <p class="text-[12.5px] text-ink-400">Crop · fade · export</p>
    </div>

    <div ref="waveHost" class="waveform-host rounded-2xl border border-white/10 bg-ink-950/60 p-2" />

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label class="block space-y-1.5">
        <span class="field-label">Fade in (s)</span>
        <input v-model.number="fadeIn" class="field !py-2.5" type="number" min="0" step="0.1" >
      </label>
      <label class="block space-y-1.5">
        <span class="field-label">Fade out (s)</span>
        <input v-model.number="fadeOut" class="field !py-2.5" type="number" min="0" step="0.1" >
      </label>
      <label class="block space-y-1.5">
        <span class="field-label">Gain</span>
        <input v-model.number="gain" class="field !py-2.5" type="number" min="0.1" max="2" step="0.05" >
      </label>
      <div class="flex items-end">
        <UiButton variant="secondary" class="w-full" :disabled="busy" @click="previewSelection">
          <span class="i-ph-ear text-[15px]" />
          Preview
        </UiButton>
      </div>
    </div>

    <div class="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
      <UiButton :loading="busy" @click="applyAndSave('replace')">
        <span class="i-ph-scissors text-[15px]" />
        Crop & replace
      </UiButton>
      <UiButton variant="secondary" :disabled="busy" @click="applyAndSave('version')">
        Save version
      </UiButton>
      <UiButton variant="ghost" :disabled="busy" @click="downloadLocal">
        <span class="i-ph-download-simple text-[15px]" />
        WAV
      </UiButton>
    </div>
    <p v-if="message" class="text-[13px] text-ink-300">{{  message  }}</p>
    <p v-if="error" class="text-[13px] text-danger">{{  error  }}</p>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  songId: string
  audioUrl: string
}>()

const emit = defineEmits<{ saved: [] }>()

const waveHost = ref<HTMLElement | null>(null)
const fadeIn = ref(0)
const fadeOut = ref(0)
const gain = ref(1)
const busy = ref(false)
const message = ref('')
const error = ref('')

let wavesurfer: any = null
let regionsPlugin: any = null
let audioBuffer: AudioBuffer | null = null
let audioCtx: AudioContext | null = null

onMounted(async () => {
  await init()
})

onBeforeUnmount(() => {
  wavesurfer?.destroy()
  audioCtx?.close()
})

async function init() {
  error.value = ''
  const WaveSurfer = (await import('wavesurfer.js')).default
  const Regions = (await import('wavesurfer.js/plugins/regions')).default

  regionsPlugin = Regions.create()
  wavesurfer = WaveSurfer.create({
    container: waveHost.value!,
    waveColor: '#655f7c',
    progressColor: '#8b7cff',
    cursorColor: '#b4a9ff',
    height: 128,
    url: props.audioUrl,
    plugins: [regionsPlugin],
  })

  wavesurfer.on('ready', async () => {
    const duration = wavesurfer.getDuration()
    regionsPlugin.clearRegions()
    regionsPlugin.addRegion({
      start: 0,
      end: duration,
      color: 'rgba(139, 124, 255, 0.22)',
      drag: true,
      resize: true,
    })
    await decodeSource()
  })
}

async function decodeSource() {
  audioCtx = audioCtx || new AudioContext()
  const res = await fetch(props.audioUrl)
  const arr = await res.arrayBuffer()
  audioBuffer = await audioCtx.decodeAudioData(arr.slice(0))
}

function getSelection() {
  const region = regionsPlugin?.getRegions?.()?.[0]
  const duration = wavesurfer?.getDuration?.() || audioBuffer?.duration || 0
  return {
    start: region?.start ?? 0,
    end: region?.end ?? duration,
  }
}

function processBuffer(): AudioBuffer {
  if (!audioBuffer || !audioCtx) throw new Error('Audio not loaded')
  const { start, end } = getSelection()
  const sampleRate = audioBuffer.sampleRate
  const startSample = Math.max(0, Math.floor(start * sampleRate))
  const endSample = Math.min(audioBuffer.length, Math.floor(end * sampleRate))
  const length = Math.max(1, endSample - startSample)
  const channels = audioBuffer.numberOfChannels
  const out = audioCtx.createBuffer(channels, length, sampleRate)

  const fadeInSamples = Math.min(length, Math.floor(Math.max(0, fadeIn.value) * sampleRate))
  const fadeOutSamples = Math.min(length, Math.floor(Math.max(0, fadeOut.value) * sampleRate))
  const g = gain.value || 1

  for (let c = 0; c < channels; c++) {
    const input = audioBuffer.getChannelData(c).subarray(startSample, endSample)
    const output = out.getChannelData(c)
    for (let i = 0; i < length; i++) {
      let amp = g
      if (fadeInSamples > 0 && i < fadeInSamples) amp *= i / fadeInSamples
      if (fadeOutSamples > 0 && i > length - fadeOutSamples) {
        amp *= (length - i) / fadeOutSamples
      }
      output[i] = input[i] * amp
    }
  }
  return out
}

function bufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const length = buffer.length
  const bytesPerSample = 2
  const blockAlign = numChannels * bytesPerSample
  const dataSize = length * blockAlign
  const arrayBuffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(arrayBuffer)

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  const channels: Float32Array[] = []
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c))
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = Math.max(-1, Math.min(1, channels[c][i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

async function previewSelection() {
  try {
    const buf = processBuffer()
    const ctx = audioCtx || new AudioContext()
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start()
    message.value = 'Playing selection…'
  } catch (e: any) {
    error.value = e?.message || 'Preview failed'
  }
}

async function applyAndSave(mode: 'replace' | 'version') {
  busy.value = true
  error.value = ''
  message.value = 'Encoding…'
  try {
    const buf = processBuffer()
    const blob = bufferToWav(buf)
    const form = new FormData()
    form.append('file', blob, 'edit.wav')
    form.append('mode', mode)
    form.append('label', 'cropped')
    form.append('durationMs', String(Math.round(buf.duration * 1000)))
    await $fetch(`/api/songs/${props.songId}/versions`, {
      method: 'POST',
      body: form,
    })
    message.value = mode === 'replace' ? 'Replaced original audio' : 'Saved as new version'
    emit('saved')
    if (mode === 'replace') {
      wavesurfer?.load(props.audioUrl + `?t=${Date.now()}`)
      await decodeSource()
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Save failed'
  } finally {
    busy.value = false
  }
}

function downloadLocal() {
  try {
    const buf = processBuffer()
    const blob = bufferToWav(buf)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.songId}-edit.wav`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    error.value = e?.message || 'Export failed'
  }
}
</script>
