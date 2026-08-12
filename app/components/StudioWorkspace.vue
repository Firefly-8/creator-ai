<template>
  <div class="workspace" :class="{ 'workspace--single': single }">
    <header v-if="$slots.header" class="workspace__header">
      <slot name="header" />
    </header>

    <div class="workspace__body">
      <section v-if="!single" class="workspace__ops panel">
        <slot name="ops" />
      </section>

      <section class="workspace__results panel">
        <div v-if="$slots['results-header']" class="workspace__results-head">
          <slot name="results-header" />
        </div>
        <div class="workspace__results-body">
          <slot name="results" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Full-width results only (e.g. Library / song detail) */
    single?: boolean
  }>(),
  { single: false },
)
</script>
