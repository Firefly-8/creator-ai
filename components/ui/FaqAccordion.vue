<template>
  <!--
    FAQ 手风琴
    ⚠️ 以前三个页面（首页 / 定价页 / for/[slug]）各写各的 <details>：
       首页和定价页是「下边框 + 加号」列表，for/[slug] 是白卡片 + 加号伪元素，
       三套长相还不一样，而且 <details> 允许多个同时展开 —— 那不是手风琴。
    现在统一成这个组件：
      · 一次只展开一个（再点一下收起）
      · 展开有高度动画（grid-template-rows: 0fr → 1fr，不用 JS 量高度）
      · 样式自带一套变量，三个页面不用再各写一遍
  -->
  <div class="ck-acc">
    <div
      v-for="(f, i) in items"
      :key="f.q"
      class="ck-acc__item"
      :class="{ 'is-open': open === i }"
    >
      <h3 class="ck-acc__heading">
        <button
          :id="`${uid}-btn-${i}`"
          type="button"
          class="ck-acc__q"
          :aria-expanded="open === i"
          :aria-controls="`${uid}-panel-${i}`"
          @click="toggle(i)"
        >
          <span class="ck-acc__q-text">{{ f.q }}</span>
          <span class="ck-acc__icon" aria-hidden="true">
            <span class="i-ph-caret-down" />
          </span>
        </button>
      </h3>

      <div
        :id="`${uid}-panel-${i}`"
        class="ck-acc__panel"
        :class="{ 'is-open': open === i }"
        :aria-hidden="open !== i"
        role="region"
        :aria-labelledby="`${uid}-btn-${i}`"
      >
        <div class="ck-acc__panel-inner">
          <p class="ck-acc__a">{{ f.a }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  items: { q: string; a: string }[]
  /** 默认展开第几个（-1 = 全收起） */
  defaultOpen?: number
}>(), {
  defaultOpen: 0,
})

/** 同一个页面可能有多个手风琴 —— id 要唯一，否则 aria-controls 会指错 */
const uid = `ck-acc-${Math.random().toString(36).slice(2, 8)}`

/** 当前展开的索引；-1 = 全收起 */
const open = ref(props.defaultOpen)

function toggle(i: number) {
  // 再点一次已展开的那条 → 收起（手风琴也可以整个折起来）
  open.value = open.value === i ? -1 : i
}
</script>

<style scoped>
/* ------------------------------------------------------------------
   FAQ 手风琴 —— 自带一套浅色暖调
   ⚠️ 不要依赖宿主页面的变量名（首页/定价页叫 --ck-*，for/[slug] 叫 --lp-*），
      这里自己定义，三处共用同一套长相。
   ------------------------------------------------------------------ */
.ck-acc {
  --acc-surface: #fffdfa;
  --acc-cream: #f5ede1;
  --acc-ink: #2a2420;
  --acc-ink-2: #6b5f55;
  --acc-line: rgba(58, 46, 38, 0.12);
  --acc-coral: #c8543d;
  --acc-coral-deep: #a53f2c;

  display: grid;
  gap: 0.7rem;
}

.ck-acc__item {
  border: 1px solid var(--acc-line);
  border-radius: 0.9rem;
  background: var(--acc-surface);
  overflow: hidden;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.ck-acc__item.is-open {
  border-color: rgba(200, 84, 61, 0.45);
  box-shadow: 0 12px 28px -20px rgba(58, 46, 38, 0.55);
}

.ck-acc__heading { margin: 0; }

.ck-acc__q {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 1.05rem 1.15rem;
  border: none;
  background: none;
  font: inherit;
  font-size: 1.0625rem;
  font-weight: 700;
  line-height: 1.45;
  text-align: left;
  color: var(--acc-ink);
  cursor: pointer;
  transition: color 0.14s ease;
}
.ck-acc__q:hover { color: var(--acc-coral-deep); }
.ck-acc__q:focus-visible {
  outline: 2px solid var(--acc-coral);
  outline-offset: -2px;
  border-radius: 0.9rem;
}

/* 箭头：展开时转 180° */
.ck-acc__icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 999px;
  background: var(--acc-cream);
  color: var(--acc-coral);
  font-size: 1rem;
  transition: transform 0.24s ease, background 0.18s ease;
}
.ck-acc__item.is-open .ck-acc__icon {
  transform: rotate(180deg);
  background: rgba(200, 84, 61, 0.12);
}

/* 高度动画：0fr → 1fr（纯 CSS，不用 JS 量高度） */
.ck-acc__panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.26s ease;
}
.ck-acc__panel.is-open { grid-template-rows: 1fr; }
.ck-acc__panel-inner { overflow: hidden; min-height: 0; }

.ck-acc__a {
  margin: 0;
  padding: 0 1.15rem 1.25rem;
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--acc-ink-2);
  max-width: 62ch;
}

@media (max-width: 560px) {
  .ck-acc__q { font-size: 1rem; padding: 0.95rem 1rem; }
  .ck-acc__a { padding: 0 1rem 1.1rem; font-size: 0.9rem; }
}
</style>
