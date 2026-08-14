import { ref } from 'vue'

const isOpen = ref(false)
const contentId = ref<string | undefined>(undefined)
const source = ref<string>('creator')

export function useFeedback() {
  function openFeedback(options?: { contentId?: string; source?: string }) {
    contentId.value = options?.contentId
    source.value = options?.source || 'creator'
    isOpen.value = true
  }

  function closeFeedback() {
    isOpen.value = false
  }

  return {
    isOpen,
    contentId,
    source,
    openFeedback,
    closeFeedback,
  }
}
