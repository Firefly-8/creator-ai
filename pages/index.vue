<template>
  <div>
    <!-- Hero Section -->
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent" />
      <div class="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:px-8">
        <div class="text-center">
          <h1 class="font-display text-4xl font-800 tracking-tight text-white sm:text-5xl lg:text-6xl">
            {{  $t('hero.title')  }}
            <span class="block text-accent-soft">{{  $t('hero.titleHighlight')  }}</span>
          </h1>
          <p class="mx-auto mt-6 max-w-2xl text-lg text-ink-300 sm:text-xl">
            {{  $t('hero.subtitle')  }}
          </p>
          <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <NuxtLink to="/create" class="btn-primary !h-12 !px-8 !text-base">
              {{  $t('hero.cta')  }}
            </NuxtLink>
            <NuxtLink to="/pricing" class="btn-secondary !h-12 !px-8 !text-base">
              {{  $t('hero.ctaSecondary')  }}
            </NuxtLink>
          </div>
          <p class="mt-4 text-sm text-ink-400">{{  $t('hero.noSignup') }}</p>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="border-t border-white/[0.06] py-20 sm:py-28">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <h2 class="font-display text-3xl font-700 text-white sm:text-4xl">
            {{  $t('features.title')  }}
          </h2>
          <p class="mt-4 text-lg text-ink-300">
            {{  $t('features.subtitle')  }}
          </p>
        </div>
        <div class="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div class="panel p-8">
            <div class="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent/20">
              <span class="i-ph-waveform text-2xl text-accent-soft" />
            </div>
            <h3 class="font-display text-xl font-600 text-white">{{  $t('features.music.title')  }}</h3>
            <p class="mt-2 text-ink-300">{{  $t('features.music.description')  }}</p>
            <NuxtLink to="/create" class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-soft hover:text-accent">
              {{  $t('features.music.cta')  }} <span class="i-ph-arrow-right" />
            </NuxtLink>
          </div>
          <div class="panel p-8">
            <div class="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent/20">
              <span class="i-ph-image text-2xl text-accent-soft" />
            </div>
            <h3 class="font-display text-xl font-600 text-white">{{  $t('features.image.title')  }}</h3>
            <p class="mt-2 text-ink-300">{{  $t('features.image.description')  }}</p>
            <NuxtLink to="/image" class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-soft hover:text-accent">
              {{  $t('features.image.cta')  }} <span class="i-ph-arrow-right" />
            </NuxtLink>
          </div>
          <div class="panel p-8">
            <div class="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent/20">
              <span class="i-ph-magic-wand text-2xl text-accent-soft" />
            </div>
            <h3 class="font-display text-xl font-600 text-white">{{  $t('features.lyrics.title')  }}</h3>
            <p class="mt-2 text-ink-300">{{  $t('features.lyrics.description')  }}</p>
            <NuxtLink to="/create" class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-soft hover:text-accent">
              {{  $t('features.lyrics.cta')  }} <span class="i-ph-arrow-right" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="border-t border-white/[0.06] py-20">
      <div class="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
        <h2 class="font-display text-3xl font-700 text-white">{{  $t('cta.title')  }}</h2>
        <p class="mx-auto mt-4 max-w-2xl text-lg text-ink-300">{{  $t('cta.subtitle')  }}</p>
        <NuxtLink to="/create" class="btn-primary mt-8 inline-flex !h-12 !px-8 !text-base">
          {{  $t('cta.button')  }}
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// 如果是 admin 域名，跳转到后台登录页
if (import.meta.client) {
  const hostname = window.location.hostname
  if (hostname === 'admin.yozzytools.com' || hostname === 'staging.admin.yozzytools.com') {
    navigateTo('/admin')
  }
}
</script>
