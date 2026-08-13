// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@unocss/nuxt',
    '@nuxtjs/i18n',
  ],

  components: [
    { path: '~/components/ui', pathPrefix: false },
    '~/components',
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    encryptionMasterKey: process.env.ENCRYPTION_MASTER_KEY || '',
    urlSigningSecret: process.env.URL_SIGNING_SECRET || '',
    requestSigningSecret: process.env.REQUEST_SIGNING_SECRET || '',
    encryptedMinimaxApiKey: process.env.ENCRYPTED_MINIMAX_API_KEY || '',
    minimaxApiKey: process.env.MINIMAX_API_KEY || '',
    minimaxBaseUrl: process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com',
    appSecret: process.env.APP_SECRET || '',
    
    public: {
      appName: 'Creator',
      appVersion: '1.0.0',
      firebaseApiKey: process.env.FIREBASE_API_KEY || '',
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      firebaseAppId: process.env.FIREBASE_APP_ID || '',
      firebaseMeasurementId: process.env.FIREBASE_MEASUREMENT_ID || '',
    },
  },

  app: {
    head: {
      title: 'Creator — AI Music & Image Studio',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'description', content: 'Create AI music, images, and more — all in one studio. Powered by advanced AI models.' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'robots', content: 'index, follow' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500+600+700&family=Sora:wght@500;600+700+800&display=swap',
        },
      ],
    },
  },

  i18n: {
    restructureDir: '',
    locales: [
      { code: 'en', name: 'English', iso: 'en-US', file: 'en.json' },
      { code: 'ja', name: '日本語', iso: 'ja-JP', file: 'ja.json' },
      { code: 'de', name: 'Deutsch', iso: 'de-DE', file: 'de.json' },
      { code: 'fr', name: 'Français', iso: 'fr-FR', file: 'fr.json' },
      { code: 'ko', name: '한국어', iso: 'ko-KR', file: 'ko.json' },
    ],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'craftai_locale',
      redirectOn: 'root',
    },
    lazy: false,
    langDir: 'locales/',
  },

  nitro: {
    preset: 'cloudflare-pages',
    compressPublicAssets: true,
  },

  vite: {
    optimizeDeps: {
      exclude: ['better-sqlite3'],
    },
  },

  experimental: {
    payloadExtraction: false,
  },
})
