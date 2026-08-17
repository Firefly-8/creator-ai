import { readFileSync, writeFileSync, existsSync } from 'fs'

const p = 'node_modules/@nuxtjs/i18n/dist/runtime/composables/index.js'
if (!existsSync(p)) {
  console.log('[patch] i18n file not found, skipping')
  process.exit(0)
}

let c = readFileSync(p, 'utf8')
if (c.includes('from "unhead"')) {
  c = c.replace(/from "unhead"/g, 'from "unhead/legacy"')
  writeFileSync(p, c)
  console.log('[patch] Fixed unhead import in @nuxtjs/i18n')
} else {
  console.log('[patch] Already patched or no changes needed')
}
