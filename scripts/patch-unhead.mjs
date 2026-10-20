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

// ---- 临时探针（排查 CF 构建环境用，排查完请删）----
try {
  const { writeFileSync, mkdirSync } = await import('fs')
  const applied = c.includes('from "unhead/legacy"')
  mkdirSync('public', { recursive: true })
  writeFileSync('public/.build-probe.json', JSON.stringify({
    patched: applied,
    node: process.version,
    hasCfPages: !!process.env.CF_PAGES,
    cfCommit: process.env.CF_PAGES_COMMIT_SHA || null,
    cwd: process.cwd(),
    at: new Date().toISOString(),
  }, null, 2))
  console.log('[probe] written public/.build-probe.json')
} catch (e) {
  console.log('[probe] failed', e.message)
}
