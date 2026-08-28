import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['server/utils/**/*.ts', 'server/middleware/**/*.ts', 'server/api/**/*.ts'],
    },
    testTimeout: 10000,
  },
})
