<template>
  <div class="flex min-h-[80vh] items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="panel p-8">
        <div class="text-center">
          <h1 class="font-display text-2xl font-700 text-white">Create your account</h1>
          <p class="mt-2 text-ink-300">Start creating with AI for free</p>
        </div>

        <form class="mt-8 space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="field-label" for="name">Name</label>
            <input id="name" v-model="name" type="text" class="field mt-1" placeholder="Your name" />
          </div>
          <div>
            <label class="field-label" for="email">Email</label>
            <input id="email" v-model="email" type="email" class="field mt-1" placeholder="you@example.com" required />
          </div>
          <div>
            <label class="field-label" for="password">Password</label>
            <input id="password" v-model="password" type="password" class="field mt-1" placeholder="Min 8 characters" required />
          </div>
          <div v-if="error" class="rounded-xl bg-danger/10 p-3 text-sm text-danger">
            {{  error  }}
          </div>
          <button type="submit" class="btn-primary w-full" :disabled="loading">
            {{  loading ? 'Creating...' : 'Create Account'  }}
          </button>
        </form>

        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-white/10" /></div>
            <div class="relative flex justify-center text-sm"><span class="bg-[#12101a] px-2 text-ink-400">Or continue with</span></div>
          </div>
          <div class="mt-4">
            <button class="btn-secondary w-full !h-10" :disabled="loading" @click="signUpWithGoogle">
              <span class="i-ph-google-logo text-lg" /> Continue with Google
            </button>
          </div>
        </div>

        <p class="mt-4 text-center text-xs text-ink-400">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>

        <p class="mt-6 text-center text-sm text-ink-400">
          Already have an account?
          <NuxtLink to="/login" class="text-accent-soft hover:text-accent">Sign in</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { signUpWithEmail, signInWithGoogle } = useAuth()

const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await signUpWithEmail(email.value, password.value)
    await navigateTo('/dashboard')
  } catch (e: any) {
    error.value = getFirebaseErrorMessage(e.code)
  } finally {
    loading.value = false
  }
}

async function signUpWithGoogle() {
  loading.value = true
  error.value = ''
  try {
    await signInWithGoogle()
    await navigateTo('/dashboard')
  } catch (e: any) {
    error.value = getFirebaseErrorMessage(e.code)
  } finally {
    loading.value = false
  }
}

function getFirebaseErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/invalid-email': 'Invalid email address',
    'auth/weak-password': 'Password must be at least 8 characters',
    'auth/too-many-requests': 'Too many attempts, please try later',
    'auth/popup-closed-by-user': 'Signup cancelled',
    'auth/network-request-failed': 'Network error, please check your connection',
  }
  return messages[code] || 'Signup failed, please try again'
}

useHead({ title: 'Sign Up — Creator' })
</script>
