<template>
  <!--
    账号菜单（登录后显示在顶栏 / 侧栏）
    ⚠️ 以前是「My cards」+「Log out」两个按钮并排，占地方而且看不出是谁登的。
    现在显示头像 + 名字，点开是一个菜单（My cards / Sign out）。
    · 名字：Firebase displayName → 没有就用邮箱 @ 前面的那段
    · 头像：Google 头像 → 没有就用名字首字母
  -->
  <div ref="rootEl" class="um" :class="[`um--${tone}`, `um--align-${align}`, { 'is-open': open }]">
    <button
      type="button"
      class="um__trigger"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="toggle"
    >
      <span class="um__avatar" aria-hidden="true">
        <img v-if="photo" :src="photo" alt="" class="um__photo" />
        <template v-else>{{ initial }}</template>
      </span>
      <span class="um__name">{{ label }}</span>
      <span class="i-ph-caret-down um__caret" aria-hidden="true" />
    </button>

    <Transition name="um">
      <div v-if="open" class="um__panel" role="menu">
        <div class="um__head">
          <p class="um__head-name">{{ label }}</p>
          <p class="um__head-mail">{{ mail }}</p>
        </div>
        <div class="um__sep" role="separator" />

        <NuxtLink
          v-for="it in visibleLinks"
          :key="it.to"
          :to="it.to"
          class="um__item"
          role="menuitem"
          @click="close"
        >
          <span class="um__item-icon" :class="it.icon" aria-hidden="true" />
          <span>{{ it.label }}</span>
        </NuxtLink>
        <div v-if="visibleLinks.length" class="um__sep" role="separator" />

        <button type="button" class="um__item um__item--danger" role="menuitem" @click="onSignOut">
          <span class="um__item-icon i-ph-sign-out" aria-hidden="true" />
          <span>{{ signOutLabel }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** 登录用户 —— 由宿主页面的 useAuth() 传进来（两边同一个来源，也方便测试） */
  user?: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null
  /** light = 浅色营销页（顶栏）；dark = 深色工作台（侧栏） */
  tone?: 'light' | 'dark'
  /** 菜单里的站内链接（当前页面的会自动去掉） */
  links?: { to: string; label: string; icon?: string }[]
  signOutLabel?: string
  /** 下拉面板跟触发器哪边对齐 —— 触发器在右边就用 right，在左边就用 left */
  align?: 'left' | 'right'
}>(), {
  user: undefined,
  tone: 'light',
  links: () => [],
  signOutLabel: 'Sign out',
  align: 'right',
})

const { user: authUser, logout } = useAuth()
const route = useRoute()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

/** 传了就用传的，没传就自己读 auth */
const currentUser = computed(() => (props.user !== undefined ? props.user : authUser.value))

const mail = computed(() => currentUser.value?.email || '')

/** 名字：displayName → 邮箱 @ 前面的那段 → Account */
const label = computed(() => {
  const dn = (currentUser.value?.displayName || '').trim()
  if (dn) return dn
  const m = mail.value
  if (!m) return 'Account'
  const local = m.split('@')[0] || 'Account'
  return local.charAt(0).toUpperCase() + local.slice(1)
})

const initial = computed(() => label.value.charAt(0).toUpperCase() || 'A')
const photo = computed(() => currentUser.value?.photoURL || '')

/** 已经在这一页了就不用再放一个同名链接 */
const visibleLinks = computed(() => props.links.filter(l => route.path !== l.to))

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

async function onSignOut() {
  close()
  await logout()
  await navigateTo('/')
}

function onDocPointer(e: PointerEvent) {
  if (!open.value || !rootEl.value) return
  if (!rootEl.value.contains(e.target as Node)) open.value = false
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointer)
  document.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointer)
  document.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
/* ------------------------------------------------------------------
   账号菜单 —— 两套配色（浅色营销页 / 深色工作台）
   ⚠️ 刻意不用宿主页面的变量名（顶栏是 --mk-*，工作台是 --surface/--accent），
      两边长得不一样，所以这里自己定义两套。
   ------------------------------------------------------------------ */
.um {
  --um-ink: #2a2420;
  --um-ink-2: #6b5f55;
  --um-line: rgba(58, 46, 38, 0.12);
  --um-coral: #c8543d;
  --um-cream: #f5ede1;
  --um-surface: #fffdfa;
  --um-avatar-bg: #c8543d;
  --um-danger: #b3402c;

  position: relative;
  display: inline-flex;
}

.um--dark {
  --um-ink: #fff;
  --um-ink-2: rgba(255, 255, 255, 0.62);
  --um-line: rgba(255, 255, 255, 0.12);
  --um-cream: rgba(255, 255, 255, 0.07);
  --um-surface: #1b1826;
  --um-avatar-bg: rgba(139, 124, 255, 0.3);
  --um-danger: #ff9d8a;
}

/* ---------- 触发器 ---------- */
.um__trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.7rem 0.25rem 0.25rem;
  border: 1.5px solid var(--um-line);
  border-radius: 999px;
  background: transparent;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--um-ink);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.14s ease, background 0.14s ease;
}
.um__trigger:hover { border-color: var(--um-coral); }
.um--dark .um__trigger:hover { border-color: var(--um-line); background: var(--um-cream); }

.um__avatar {
  flex: none;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: var(--um-avatar-bg);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  overflow: hidden;
}
.um__photo { width: 100%; height: 100%; object-fit: cover; }

.um__name {
  max-width: 9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.um__caret {
  flex: none;
  font-size: 0.8rem;
  color: var(--um-ink-2);
  transition: transform 0.18s ease;
}
.um.is-open .um__caret { transform: rotate(180deg); }

/* ---------- 下拉面板 ---------- */
.um__panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  z-index: 60;
  min-width: 14rem;
  padding: 0.4rem;
  border: 1px solid var(--um-line);
  border-radius: 0.85rem;
  background: var(--um-surface);
  box-shadow: 0 22px 44px -22px rgba(36, 31, 27, 0.45);
}
/* 触发器在页面右边（顶栏）→ 面板右对齐；在左边（侧栏/移动端菜单）→ 左对齐，
   否则 14rem 宽的面板会溢出屏幕左边 */
.um--align-right .um__panel { right: 0; }
.um--align-left .um__panel { left: 0; }

.um__head { padding: 0.6rem 0.7rem 0.5rem; }
.um__head-name {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--um-ink);
}
.um__head-mail {
  margin: 0.15rem 0 0;
  font-size: 0.8125rem;
  color: var(--um-ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.um__sep { height: 1px; margin: 0.35rem 0; background: var(--um-line); }

.um__item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: none;
  border-radius: 0.55rem;
  background: none;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--um-ink);
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}
.um__item:hover { background: var(--um-cream); }
.um__item--danger { color: var(--um-danger); }
.um__item-icon { flex: none; font-size: 1.05rem; color: var(--um-ink-2); }
.um__item--danger .um__item-icon { color: var(--um-danger); }

/* ---------- 过渡 ---------- */
.um-enter-active,
.um-leave-active { transition: opacity 0.14s ease, transform 0.14s ease; }
.um-enter-from,
.um-leave-to { opacity: 0; transform: translateY(-4px); }

@media (max-width: 520px) {
  .um__name { max-width: 6.5rem; }
}
</style>
