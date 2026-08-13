import { useHead } from '#imports'

export function useRobots() {
  if (!import.meta.client) return

  const hostname = window.location.hostname
  const isStaging = hostname.includes('staging') || hostname.includes('localhost') || hostname.includes('pages.dev')

  useHead({
    meta: [
      { name: 'robots', content: isStaging ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' },
    ],
  })
}
