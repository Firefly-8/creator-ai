<template>
  <div class="flex min-h-[80vh] items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="panel p-8">
        <div class="text-center">
          <h1 class="font-display text-2xl font-700 text-white">Welcome back</h1>
          <p class="mt-2 text-ink-300">Sign in to your account</p>
        </div>

        <form class="mt-8 space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="field-label" for="email">Email</label>
            <input
              id="email"
              v-model="email"
              type="email"
              class="field mt-1"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label class="field-label" for="password">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="field mt-1"
              placeholder="Enter your password"
              required
            />
          </div>
          <div v-if="error" class="rounded-xl bg-danger/10 p-3 text-sm text-danger">
            {{ error }}
          </div>
          <button type="submit" class="btn-primary w-full" :disabled="loading">
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-white/10" /></div>
            <div class="relative flex justify-center text-sm"><span class="bg-[#12101a] px-2 text-ink-400">Or continue with</span></div>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-3">
            <button class="btn-secondary !h-10" :disabled="loading" @click="handleGoogleSignIn">
              <span class="i-ph-google-logo text-lg" /> Google
            </button>
            <button class="btn-secondary !h-10" :disabled="loading" @click="handleGitHubSignIn">
              <span class="i-ph-github-logo text-lg" /> GitHub
            </button>
          </div>
        </div>

        <p class="mt-6 text-center text-sm text-ink-400">
          Don't have an account?
          <NuxtLink to="/signup" class="text-accent-soft hover:text-accent">Sign up</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { signInWithEmail, signInWithGoogle } = useAuth()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  loading.value = true
  error.value = ''
  try {
    await signInWithEmail(email.value, password.value)
    await navigateTo('/dashboard')
  } catch (e: any) {
    error.value = getFirebaseErrorMessage(e.code)
  } finally {
    loading.value = false
  }
}

async function handleGoogleSignIn() {
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

async function handleGitHubSignIn() {
  error.value = 'GitHub login coming soon'
}

function getFirebaseErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/too-many-requests': 'Too many attempts, please try later',
    'auth/popup-closed-by-user': 'Login cancelled',
    'auth/network-request-failed': 'Network error, please check your connection',
  }
  return messages[code] || 'Login failed, please try again'
}

useHead({ title: 'Sign In — Creator' })
</script>
