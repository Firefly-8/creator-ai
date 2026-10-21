/**
 * 获取付费方案列表
 *
 * ⚠️ 2026-10-21 修正：这里原来是一张**写死的假表**
 *   （free 档写的是「每月 10 次音乐 / 20 次图片」），
 *   跟实际定价完全对不上，而且 generation 次数早在改用
 *   「每日免费额度」后就作废了 —— 现在付费点是**画质**不是次数。
 *
 * 现在的定价（与 pages/pricing.vue 保持一致）：
 *   - 单张      $3.99  一次性   1 张，无水印 2K + 300 DPI 打印规格
 *   - 月付      $9.99  每月     5 张
 *   - 买断      $19.99 一次性  20 张，不过期
 *
 * kind:
 *   'one_time' —— 一次性支付（Orders v2）
 *   'subscription' —— 订阅（Billing Subscriptions）
 *   'free' —— 免费档
 */
export default defineEventHandler(() => {
  return {
    plans: [
      {
        id: 'free',
        name: 'Free',
        kind: 'free',
        price: 0,
        currency: 'USD',
        cards: 0,
        features: [
          '2 free generations every day',
          'Standard resolution',
          'Watermark on downloads',
        ],
      },
      {
        id: 'single',
        name: 'One card',
        kind: 'one_time',
        price: 3.99,
        currency: 'USD',
        cards: 1,
        description: 'One card, printed and ready.',
        features: [
          '1 card — yours forever',
          '2K, no watermark',
          '300 DPI print file (5×7 / 4×6 / A6)',
        ],
      },
      {
        id: 'creator',
        name: 'Monthly',
        kind: 'subscription',
        price: 9.99,
        currency: 'USD',
        interval: 'month',
        cards: 5,
        description: 'Five cards a month, for when it is your turn to send one.',
        popular: true,
        features: [
          '5 cards every month',
          '2K, no watermark',
          '300 DPI print file',
          'Canvas prints (16×20 / A3)',
          'Cancel any time',
        ],
      },
      {
        id: 'lifetime',
        name: 'One-off pack',
        kind: 'one_time',
        price: 19.99,
        currency: 'USD',
        cards: 20,
        description: 'Twenty cards. They never expire.',
        features: [
          '20 cards — no expiry',
          '2K, no watermark',
          '300 DPI print file',
          'Canvas prints (16×20 / A3)',
          'One payment, done',
        ],
      },
    ],
  }
})
