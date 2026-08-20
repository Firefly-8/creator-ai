export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  modules: [
    '@pinia/nuxt',
    '@unocss/nuxt',
    '@nuxtjs/i18n',
  ],

  components: [
    { path: '~/components/ui', pathPrefix: false },
    '~/components',
  ],

  css: ['~/assets/css/tokens.css', '~/assets/css/main.css'],

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
      title: 'CraftAI — AI Music & Image Studio',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'description', content: 'Create AI music, images, and more — all in one studio. Powered by advanced AI models.' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'CraftAI' },
        { property: 'og:image', content: 'https://creator.yozzytools.com/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://creator.yozzytools.com/og-image.png' },
      ],
      script: [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'CraftAI',
          url: 'https://creator.yozzytools.com',
          description: 'Create AI music, images, and more — all in one studio.',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://creator.yozzytools.com/search?q={search_term_string}',
            'query-input': 'required name=search_term_string'
          }
        })
      }, {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'CraftAI',
          url: 'https://creator.yozzytools.com',
          logo: 'https://creator.yozzytools.com/logo.png',
          sameAs: []
        })
      }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/logo.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500+600+700&family=Sora:wght@500;600+700+800&display=swap' },
      ],
    },
  },

  i18n: {
    locales: [
      { code: 'en', name: 'English', iso: 'en-US', file: 'en.json' },
      { code: 'ja', name: 'Japanese', iso: 'ja-JP', file: 'ja.json' },
      { code: 'de', name: 'Deutsch', iso: 'de-DE', file: 'de.json' },
      { code: 'fr', name: 'Français', iso: 'fr-FR', file: 'fr.json' },
      { code: 'ko', name: '한국어', iso: 'ko-KR', file: 'ko.json' },
      { code: 'es', name: 'Español', iso: 'es-ES', file: 'es.json' },
      { code: 'pt', name: 'Português', iso: 'pt-BR', file: 'pt.json' },
      { code: 'it', name: 'Italiano', iso: 'it-IT', file: 'it.json' },
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
    seo: true,
  },

  nitro: {
    preset: 'cloudflare-pages',
    compressPublicAssets: true,
    minify: false,
  },

  vite: {
    optimizeDeps: {
      exclude: ['better-sqlite3'],
    },
    plugins: [
      {
        name: 'fix-app-manifest',
        resolveId(id) {
          if (id === '#app-manifest') {
            return { id: 'virtual:app-manifest', external: false }
          }
        },
        load(id) {
          if (id === 'virtual:app-manifest') {
            return 'export default {}'
          }
        },
      },
    ],
  },

  experimental: {
    payloadExtraction: false,
  },
})
