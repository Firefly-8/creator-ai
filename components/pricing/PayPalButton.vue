<template>
  <div class="pp-btn">
    <!-- 未登录 / 未配置：给替代入口 -->
    <button
      v-if="!ready && !errorMsg"
      class="pp-btn__fallback"
      type="button"
      @click="handleClick"
    >
      {{ label }}
    </button>

    <p v-else-if="errorMsg" class="pp-btn__note">
      <span class="i-ph-info" />
      <span>{{ errorMsg }}</span>
    </p>

    <!-- PayPal 按钮挂载点 -->
    <div v-show="ready && !errorMsg" :id="containerId" class="pp-btn__host" />

    <p v-if="sandbox" class="pp-btn__sandbox">
      <span class="i-ph-flask" />
      Sandbox — no real money moves
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * PayPal 按钮（订阅 + 一次性支付共用）
 *
 * ⚠️ 一次性支付（$6.99 / $59.99）走 Orders v2：
 *    createOrder 时调我们自己的 /api/paypal/order，金额由服务端决定 ✅
 *    （金额来自 utils/pricing.ts，不接受前端传值）
 * 订阅走 createSubscription，需要 PayPal plan id
 *    —— ⚠️ 订阅的实收金额由 **PayPal 后台的 plan 对象**决定，
 *       提价后要跑 node scripts/paypal-check.mjs --sync-price 同步。
 *
 * 没登录时先弹登录框（父组件通过 need-login 事件通知）。
 *
 * ⚠️ 为什么按钮样式写在这里而不写在页面里：
 *   父页面的 scoped CSS **进不到子组件内部**（scoped 只给子组件的根节点加属性），
 *   所以放在页面里的 .ck-btn 样式对这里的 <button> 完全无效 ——
 *   渲染出来是个浏览器默认按钮（灰的、小的、系统字体），插在卡片里特别怪。
 *   组件自带样式，谁用都长一样 ✅
 */
const props = withDefaults(
  defineProps<{
    planId: string
    /** one_time = Orders v2；subscription = Billing Subscriptions */
    kind?: 'one_time' | 'subscription'
    label?: string
    loggedIn?: boolean
  }>(),
  { kind: 'one_time', label: 'Pay with PayPal', loggedIn: true },
)

const emit = defineEmits<{ (e: 'need-login'): void; (e: 'paid', info: any): void }>()

const containerId = `pp-btn-${Math.random().toString(36).slice(2, 10)}`
const ready = ref(false)
const errorMsg = ref('')
const sandbox = ref(false)
const api = useApi()

/** 加载 PayPal JS SDK（只加载一次） */
let sdkPromise: Promise<any> | null = null
function loadSdk(clientId: string): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if ((window as any).paypal) return Promise.resolve((window as any).paypal)
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    // 不传 intent —— 让 PayPal 根据 createOrder / createSubscription 自动判断
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&components=buttons`
    s.async = true
    s.onload = () => {
      if ((window as any).paypal) resolve((window as any).paypal)
      else reject(new Error('PayPal SDK loaded but window.paypal is missing'))
    }
    s.onerror = () => reject(new Error('Could not load the PayPal SDK'))
    document.head.appendChild(s)
  })
  return sdkPromise
}

async function init() {
  if (!props.loggedIn) return
  try {
    const cfg = await api.get<{ clientId: string; sandbox: boolean; configured: boolean }>(
      '/api/paypal/config',
    )
    sandbox.value = !!cfg.sandbox
    if (!cfg.configured || !cfg.clientId) {
      errorMsg.value = 'Payments are not set up on this environment yet.'
      return
    }

    const paypal = await loadSdk(cfg.clientId)
    const style = { layout: 'vertical', shape: 'pill', label: 'paypal', height: 44 }

    if (props.kind === 'subscription') {
      paypal.Buttons({
        style,
        createSubscription: async () => {
          const res = await api.post<{ paypalPlanId: string }>('/api/subscriptions/create', {
            planId: props.planId,
          })
          if (!res.paypalPlanId) throw new Error('Subscription plan is not configured')
          return { id: res.paypalPlanId }
        },
        onApprove: async (data: any) => {
          try {
            await api.post('/api/subscriptions/activate', {
              subscriptionId: data.subscriptionID,
              planId: props.planId,
            })
            emit('paid', { type: 'subscription', id: data.subscriptionID })
          } catch (e: any) {
            errorMsg.value = e?.data?.statusMessage || 'Could not activate the subscription.'
          }
        },
        onError: (e: any) => {
          errorMsg.value = e?.message || 'PayPal could not start the payment.'
        },
      }).render(`#${containerId}`)
    } else {
      paypal.Buttons({
        style,
        createOrder: async () => {
          const res = await api.post<{ orderId: string }>('/api/paypal/order', {
            planId: props.planId,
          })
          return res.orderId
        },
        onApprove: async (data: any) => {
          try {
            const res = await api.post<{ ok: boolean; cards: number; message: string }>(
              '/api/paypal/order/capture',
              { orderId: data.orderID },
            )
            emit('paid', { type: 'one_time', ...res })
          } catch (e: any) {
            errorMsg.value = e?.data?.statusMessage || 'Payment went through but we could not apply it.'
          }
        },
        onError: (e: any) => {
          errorMsg.value = e?.message || 'PayPal could not start the payment.'
        },
      }).render(`#${containerId}`)
    }
    ready.value = true
  } catch (e: any) {
    errorMsg.value = e?.message || 'Payments are not available right now.'
  }
}

function handleClick() {
  if (!props.loggedIn) {
    emit('need-login')
    return
  }
}

onMounted(() => {
  init()
})
</script>

<style scoped>
.pp-btn { display: block; }

/* 备用按钮（PayPal SDK 还没加载 / 用户没登录时先显示这个）
   —— 样式必须写在组件里：父页面的 scoped CSS 进不到子组件内部 */
.pp-btn__fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-width: 13rem;
  padding: 0.85rem 1.6rem;
  border: 1.5px solid transparent;
  border-radius: 999px;
  background: var(--ck-coral, #c8543d);
  color: #fff;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  cursor: pointer;
  transition: background 0.14s ease, transform 0.14s ease;
  box-shadow: 0 12px 26px -14px rgba(200, 84, 61, 0.8);
}
.pp-btn__fallback:hover { background: var(--ck-coral-deep, #a53f2c); }
.pp-btn__fallback:active { transform: translateY(1px); }

/* 没配好支付时的提示 —— 安静的一行小字，别做成「报错框」
   （卡片里并排三个红框会非常难看） */
.pp-btn__note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 0;
  color: var(--ck-ink-2, #6b5f55);
  font-size: 0.8125rem;
  line-height: 1.5;
  text-align: center;
}
.pp-btn__note .i-ph-info { flex: none; color: var(--ck-ink-2, #6b5f55); }

/* PayPal 官方按钮挂载点 —— 宽度撑满、居中，高度和备用按钮一致（不跳版） */
.pp-btn__host {
  min-height: 3.2rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.pp-btn__sandbox {
  margin: 0.55rem 0 0;
  font-size: 0.78rem;
  color: var(--ck-ink-2, #6b5f55);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  justify-content: center;
}
</style>
