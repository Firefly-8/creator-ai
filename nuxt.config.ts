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

  css: ['~/assets/css/tokens.css', '~/assets/css/main.css', '~/assets/css/brand-fonts.css'],

  runtimeConfig: {
    encryptionMasterKey: process.env.ENCRYPTION_MASTER_KEY || '',
    urlSigningSecret: process.env.URL_SIGNING_SECRET || '',
    requestSigningSecret: process.env.REQUEST_SIGNING_SECRET || '',
    encryptedMinimaxApiKey: process.env.ENCRYPTED_MINIMAX_API_KEY || '',
    minimaxApiKey: process.env.MINIMAX_API_KEY || '',
    minimaxBaseUrl: process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com',
    appSecret: process.env.APP_SECRET || '',

    // ── 告警（多人生成失败 → 邮件通知所有者）─────────────────
    // ⚠️ 这里 process.env 是**构建期**内联进产物的，改完 CF secret 不重新部署不生效。
    //    运行时优先读 globalThis.__env__（真实运行时 env），见 server/utils/env.ts。
    //    留在这里是为了本地开发和「构建时就有值」的场景兜底。
    alertEmailTo: process.env.ALERT_EMAIL_TO || '',
    alertEmailFrom: process.env.ALERT_EMAIL_FROM || '',
    alertProvider: process.env.ALERT_PROVIDER || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
    brevoApiKey: process.env.BREVO_API_KEY || '',
    alertMinDistinctUsers: process.env.ALERT_MIN_DISTINCT_USERS || '',
    alertWindowMinutes: process.env.ALERT_WINDOW_MINUTES || '',
    alertCooldownMinutes: process.env.ALERT_COOLDOWN_MINUTES || '',
    alertCountUserErrors: process.env.ALERT_COUNT_USER_ERRORS || '',

    public: {
      appName: 'Create Keepsakes',
      appVersion: '1.0.0',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || '',
      firebaseApiKey: process.env.FIREBASE_API_KEY || 'AIzaSyAwoUulU3NBq7QsXr_wleNtvoHk534iwtM',
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN || 'creator-cab02.firebaseapp.com',
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'creator-cab02',
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'creator-cab02.firebasestorage.app',
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '893647905635',
      firebaseAppId: process.env.FIREBASE_APP_ID || '1:893647905635:web:9c4d855477f5e51954e956',
      firebaseMeasurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-GNMBFM5513',
      plausibleDomain: process.env.PLAUSIBLE_DOMAIN || '',
    },
  },

  app: {
    head: {
      title: 'Create Keepsakes — Personalised Cards & Canvas Prints',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'description', content: 'Create personalised cards and canvas prints for the people you love. Choose an occasion, pick a style, add a photo and a message — no design skills needed.' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Create Keepsakes' },
        { property: 'og:image', content: 'https://assets.yozzytools.com/og-image.jpg' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://assets.yozzytools.com/og-image.jpg' },
      ],
      script: [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Create Keepsakes',
          url: 'https://creator.yozzytools.com',
          description: 'Personalised cards and canvas prints for the people you love.',
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
          name: 'Create Keepsakes',
          url: 'https://creator.yozzytools.com',
          logo: 'https://creator.yozzytools.com/logo.png',
          sameAs: []
        })
      }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/logo.png' },
      ],
    },
  },

  i18n: {
    locales: [
      { code: 'en', name: 'English', iso: 'en-US', file: 'en.json' },
      { code: 'zh', name: '中文', iso: 'zh-CN', file: 'zh.json' },
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
      alwaysRedirect: false,
      fallbackLocale: 'en',
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

  hooks: {
    'nitro:build:public-assets': (nitro) => {
      const fs = require('fs')
      const path = require('path')
      const redirectsPath = path.join(nitro.options.output.publicDir, '_redirects')
      let redirectContent = ''
      if (fs.existsSync(redirectsPath)) {
        redirectContent = fs.readFileSync(redirectsPath, 'utf-8')
      }
      if (!redirectContent.includes('/*  /index.html')) {
        redirectContent += '\n# SPA fallback for i18n locale routes\n/*  /index.html  200\n'
        fs.writeFileSync(redirectsPath, redirectContent)
      }
    },
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
