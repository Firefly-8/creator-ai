/**
 * 获取订阅计划列表
 */

export default defineEventHandler(() => {
  return {
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'USD',
        interval: 'month',
        features: [
          '10 music generations/month',
          '20 image generations/month',
          'Basic quality',
          'Watermark on outputs',
        ],
        credits: 10,
      },
      {
        id: 'creator',
        name: 'Creator',
        price: 9.99,
        currency: 'USD',
        interval: 'month',
        features: [
          '100 music generations/month',
          '200 image generations/month',
          'HD quality',
          'No watermark',
          'Commercial license',
          'Priority queue',
        ],
        credits: 300,
        popular: true,
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 19.99,
        currency: 'USD',
        interval: 'month',
        features: [
          '300 music generations/month',
          '500 image generations/month',
          'HD quality',
          'No watermark',
          'Commercial license',
          'Priority queue',
          'API access',
        ],
        credits: 800,
      },
    ],
  }
})
