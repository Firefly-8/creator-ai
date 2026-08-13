import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getAnalytics, isSupported } from 'firebase/analytics'

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig()

  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId,
    measurementId: config.public.firebaseMeasurementId,
  }

  // Only initialize on client side
  if (!import.meta.client) {
    return {
      provide: {
        auth: null,
        firebaseApp: null,
      },
    }
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)

  // Initialize Analytics (client-side only)
  isSupported().then((yes) => yes && getAnalytics(app))

  return {
    provide: {
      auth,
      firebaseApp: app,
    },
  }
})
