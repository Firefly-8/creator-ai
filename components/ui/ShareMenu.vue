<template>
  <div class="share-menu">
    <button
      class="btn-secondary !h-9 !px-3 text-sm"
      @click="showMenu = !showMenu"
    >
      <span class="i-ph-share-network text-[14px]" />
      Share
    </button>

    <div v-if="showMenu" class="share-menu__dropdown">
      <button class="share-menu__item" @click="shareTwitter">
        <span class="i-ph-twitter-logo text-[14px]" /> Twitter
      </button>
      <button class="share-menu__item" @click="shareFacebook">
        <span class="i-ph-facebook-logo text-[14px]" /> Facebook
      </button>
      <button class="share-menu__item" @click="shareLinkedIn">
        <span class="i-ph-linkedin-logo text-[14px]" /> LinkedIn
      </button>
      <button class="share-menu__item" @click="copyLink">
        <span class="i-ph-link text-[14px]" /> {{ copied ? 'Copied!' : 'Copy Link' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  url: string
  title: string
  description?: string
}>()

const showMenu = ref(false)
const copied = ref(false)

const fullUrl = computed(() => {
  if (props.url.startsWith('http')) return props.url
  return 'https://creator.yozzytools.com' + props.url
})

function shareTwitter() {
  const text = encodeURIComponent(`Check out this ${props.title} created with CraftAI!`)
  const url = encodeURIComponent(fullUrl.value)
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
  showMenu.value = false
}

function shareFacebook() {
  const url = encodeURIComponent(fullUrl.value)
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
  showMenu.value = false
}

function shareLinkedIn() {
  const url = encodeURIComponent(fullUrl.value)
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank')
  showMenu.value = false
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(fullUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // fallback
    const input = document.createElement('input')
    input.value = fullUrl.value
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
  showMenu.value = false
}

// Close menu on outside click
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as Node
    const menu = document.querySelector('.share-menu')
    if (menu && !menu.contains(target)) {
      showMenu.value = false
    }
  })
})
</script>

<style scoped>
.share-menu {
  position: relative;
  display: inline-flex;
}

.share-menu__dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 160px;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(18, 16, 26, 0.95);
  backdrop-filter: blur(10px);
  padding: 0.35rem;
  z-index: 50;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.share-menu__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  color: var(--ink-2, #d0cbe0);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}

.share-menu__item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}
</style>
