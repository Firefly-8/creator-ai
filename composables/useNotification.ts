/**
 * 浏览器通知 — 生成完成时通知用户
 */
export function useNotification() {
  const permission = ref<NotificationPermission>('default')

  onMounted(() => {
    if ('Notification' in window) {
      permission.value = Notification.permission
    }
  })

  async function requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false
    try {
      const result = await Notification.requestPermission()
      permission.value = result
      return result === 'granted'
    } catch {
      return false
    }
  }

  function notify(title: string, options?: NotificationOptions) {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    try {
      const notification = new Notification(title, {
        icon: '/logo.png',
        badge: '/logo.png',
        ...options,
      })

      // 点击通知时聚焦窗口
      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      return notification
    } catch {
      // 静默失败
    }
  }

  function notifyGenerationComplete(type: 'music' | 'image' | 'cover') {
    const labels = { music: 'song', image: 'image', cover: 'cover' }
    notify('Generation Complete! 🎵', {
      body: `Your ${labels[type]} is ready to view and download.`,
      tag: 'generation-complete',
    })
  }

  return {
    permission,
    requestPermission,
    notify,
    notifyGenerationComplete,
  }
}
