import type { JobPublic } from '~/utils/types'

export function useJobStream(jobId: Ref<string | null> | string | null) {
  const job = ref<JobPublic | null>(null)
  const error = ref<string | null>(null)
  let source: EventSource | null = null

  const idRef = computed(() => (typeof jobId === 'string' ? jobId : jobId?.value || null))

  function stop() {
    source?.close()
    source = null
  }

  function start(id: string) {
    stop()
    error.value = null
    source = new EventSource(`/api/jobs/${id}/events`)
    source.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        job.value = data.job
        if (data.job?.status === 'done' || data.job?.status === 'error') {
          stop()
        }
      } catch (e: any) {
        error.value = e?.message || 'Failed to parse job event'
      }
    }
    source.onerror = () => {
      // Fallback poll once
      $fetch<{ job: JobPublic }>(`/api/jobs/${id}`)
        .then((res) => {
          job.value = res.job
          if (res.job.status === 'done' || res.job.status === 'error') stop()
        })
        .catch(() => {
          error.value = 'Lost connection to job stream'
        })
    }
  }

  watch(
    idRef,
    (id) => {
      if (!id) {
        stop()
        job.value = null
        return
      }
      start(id)
    },
    { immediate: true },
  )

  onBeforeUnmount(stop)

  return { job, error, stop }
}
