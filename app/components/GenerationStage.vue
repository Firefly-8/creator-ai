<template>
  <div class="gen-stage" role="status" aria-live="polite">
    <div class="gen-stage__glow" aria-hidden="true" />

    <div class="gen-stage__visual">
      <ClientOnly>
        <l-waveform
          size="48"
          stroke="3.5"
          speed="1"
          color="#8b7cff"
        />
        <template #fallback>
          <div class="gen-eq gen-eq--solo" aria-hidden="true">
            <span v-for="n in 7" :key="n" class="gen-eq__bar" :style="{ '--i': n }" />
          </div>
        </template>
      </ClientOnly>
      <div class="gen-eq gen-eq--ambient" aria-hidden="true">
        <span v-for="n in 9" :key="n" class="gen-eq__bar" :style="{ '--i': n }" />
      </div>
    </div>

    <div class="gen-stage__copy">
      <p class="gen-stage__title">{{ title }}</p>
      <p class="gen-stage__status">{{ status }}</p>
      <div class="gen-stage__steps">
        <span
          v-for="step in steps"
          :key="step.key"
          class="gen-step"
          :class="{
            'is-done': step.state === 'done',
            'is-active': step.state === 'active',
          }"
        >
          <span class="gen-step__dot" />
          {{ step.label }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string
    status?: string
    phase?: 'queued' | 'generating' | 'downloading' | 'done' | 'error' | string
  }>(),
  {
    title: 'Composing your track',
    status: 'Generating…',
    phase: 'generating',
  },
)

const steps = computed(() => {
  const order = ['queued', 'generating', 'downloading', 'done'] as const
  const current = props.phase === 'error' ? 'generating' : props.phase
  const idx = Math.max(0, order.indexOf(current as any))
  const labels = [
    { key: 'queued', label: 'Queued' },
    { key: 'generating', label: 'Composing' },
    { key: 'downloading', label: 'Saving' },
    { key: 'done', label: 'Ready' },
  ]
  return labels.map((l, i) => ({
    ...l,
    state: i < idx ? 'done' : i === idx ? 'active' : 'idle',
  }))
})
</script>

<style scoped>
.gen-stage {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.15rem;
  padding: 1.4rem 1.1rem 1.25rem;
  border-radius: 1.25rem;
  border: 1px solid rgba(139, 124, 255, 0.28);
  background:
    linear-gradient(180deg, rgba(139, 124, 255, 0.12), rgba(139, 124, 255, 0.03)),
    rgba(16, 14, 24, 0.9);
}

.gen-stage__glow {
  pointer-events: none;
  position: absolute;
  inset: -30% -20% auto;
  height: 70%;
  background: radial-gradient(ellipse at center, rgba(139, 124, 255, 0.28), transparent 65%);
  animation: gen-glow 2.8s ease-in-out infinite;
}

.gen-stage__visual {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 4.5rem;
}

.gen-eq {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 5px;
}

.gen-eq--ambient {
  position: absolute;
  inset: auto 8% 0;
  height: 1.85rem;
  opacity: 0.35;
  pointer-events: none;
}

.gen-eq--solo {
  height: 2.6rem;
}

.gen-eq__bar {
  width: 4px;
  height: 28%;
  border-radius: 999px;
  background: linear-gradient(180deg, #b4a9ff, #6e5ce6);
  animation: gen-eq 1.05s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.08s);
}

.gen-stage__copy {
  position: relative;
  z-index: 1;
  width: 100%;
  text-align: center;
}

.gen-stage__title {
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: #fff;
}

.gen-stage__status {
  margin: 0.35rem 0 0;
  font-size: 12.5px;
  color: #a39db8;
}

.gen-stage__steps {
  margin-top: 0.95rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.45rem;
}

.gen-step {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.28rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: #817b99;
  font-size: 11px;
  font-weight: 600;
}

.gen-step__dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.7;
}

.gen-step.is-active {
  color: #b4a9ff;
  border-color: rgba(139, 124, 255, 0.4);
  background: rgba(139, 124, 255, 0.14);
}

.gen-step.is-active .gen-step__dot {
  background: #8b7cff;
  box-shadow: 0 0 0 3px rgba(139, 124, 255, 0.25);
  animation: gen-pulse 1.2s ease-in-out infinite;
}

.gen-step.is-done {
  color: #c9c3dd;
  border-color: rgba(255, 255, 255, 0.1);
}

.gen-step.is-done .gen-step__dot {
  background: #8b7cff;
  opacity: 1;
}

@keyframes gen-eq {
  0%,
  100% {
    height: 24%;
    opacity: 0.55;
  }
  50% {
    height: 100%;
    opacity: 1;
  }
}

@keyframes gen-glow {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.06);
  }
}

@keyframes gen-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgba(139, 124, 255, 0.18);
  }
  50% {
    box-shadow: 0 0 0 5px rgba(139, 124, 255, 0.32);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gen-eq__bar,
  .gen-stage__glow,
  .gen-step.is-active .gen-step__dot {
    animation: none;
  }
}
</style>
