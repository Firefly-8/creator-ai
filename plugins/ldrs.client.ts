import { waveform, lineWobble, ring } from 'ldrs'

export default defineNuxtPlugin(() => {
  waveform.register()
  lineWobble.register()
  ring.register()
})
