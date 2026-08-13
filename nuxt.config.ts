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
      firebaseApiKey: process.env.FIREBASE_API_KEY || 'AIzaSyAwoUulU3NBq7QsXr_wleNtvoHk534iwtM',
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN || 'creator-cab02.firebaseapp.com',
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'creator-cab02',
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'creator-cab02.firebasestorage.app',
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '893647905635',
      firebaseAppId: process.env.FIREBASE_APP_ID || '1:893647905635:web:9c4d855477f5e51954e956',
      firebaseMeasurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-GNMBFM5513',
    },
  },

  app: {
    head: {
      title: 'Creator — AI Music & Image Studio',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'description', content: 'Create AI music, images, and more — all in one studio. Powered by advanced AI models.' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/logo.png' },
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
      { code: 'es', name: 'Español', iso: 'es-ES', file: 'es.json' },
      { code: 'pt', name: 'Português', iso: 'pt-BR', file: 'pt.json' },
      { code: 'it', name: 'Italiano', iso: 'it-IT', file: 'it.json' },
      { code: 'zh', name: '中文', iso: 'zh-CN', file: 'zh.json' },
      { code: 'ar', name: 'العربية', iso: 'ar-SA', file: 'ar.json' },
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
