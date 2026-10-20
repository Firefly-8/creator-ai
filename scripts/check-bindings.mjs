/**
 * 绑定一致性检查 —— 防止 CF Pages 把站点接到错误的数据库上
 *
 * 背景：CF Pages 的 Git 集成把仓库根目录的 wrangler.toml 当作 source of truth，
 * 每个环境用「自己那次部署所在分支」上的那份文件：
 *   craftai          production ← master 分支的 wrangler.toml
 *   craftai          preview    ← 非 master 分支的 wrangler.toml（当前是 test）
 *   craftai-staging  production ← test 分支的 wrangler.toml
 *
 * 所以两个分支的 wrangler.toml 必须分别指向各自的库：
 *   master → craftai-db          (bb60e6ae-...)
 *   test   → craftai-db-staging  (8e812571-...)
 *
 * 一旦合并分支时把 test 的 wrangler.toml 带进 master，生产环境就会被接到
 * 预发布库上——数据错乱且很难察觉。这个脚本就是用来提前发现这种事故的。
 *
 * 用法: node scripts/check-bindings.mjs [--branch=master]
 */
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const EXPECTED = {
  master: { db: 'bb60e6ae-597c-4cd7-a958-46942f5dffec', name: 'craftai-db' },
  test: { db: '8e812571-57b0-4232-bfc4-13264dc9e420', name: 'craftai-db-staging' },
}

const args = process.argv.slice(2)
const branchArg = args.find(a => a.startsWith('--branch='))?.split('=')[1]

function readConfig(ref) {
  try {
    return execSync(`git show ${ref}:wrangler.toml`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return null
  }
}

function extract(content) {
  if (!content) return null
  const db = content.match(/database_id\s*=\s*"([0-9a-f-]+)"/)
  const name = content.match(/database_name\s*=\s*"([^"]+)"/)
  const hasOutput = /pages_build_output_dir\s*=/.test(content)
  return { db: db?.[1] ?? null, name: name?.[1] ?? null, hasOutput }
}

const results = []
const branches = branchArg ? [branchArg] : Object.keys(EXPECTED)

for (const branch of branches) {
  const config = extract(readConfig(branch))
  if (!config) {
    results.push({ branch, ok: false, msg: '读不到该分支的 wrangler.toml' })
    continue
  }
  const expected = EXPECTED[branch]
  if (!expected) {
    results.push({ branch, ok: true, msg: `${config.name} (${config.db?.slice(0, 8)}) — 无预期值，跳过校验` })
    continue
  }
  if (!config.hasOutput) {
    results.push({ branch, ok: false, msg: '缺少 pages_build_output_dir —— CF 部署阶段会直接失败' })
    continue
  }
  if (config.db !== expected.db) {
    results.push({
      branch,
      ok: false,
      msg: `数据库指向错误：期望 ${expected.name} (${expected.db.slice(0, 8)})，实际 ${config.name} (${config.db?.slice(0, 8)})`,
    })
    continue
  }
  results.push({ branch, ok: true, msg: `${config.name} (${config.db.slice(0, 8)})` })
}

console.log('=== CF Pages 绑定一致性检查 ===')
let failed = false
for (const r of results) {
  console.log(`  ${r.ok ? '✅' : '❌'} ${r.branch.padEnd(8)} ${r.msg}`)
  if (!r.ok) failed = true
}

if (!failed && Object.keys(EXPECTED).length > 1) {
  const master = extract(readConfig('master'))
  const test = extract(readConfig('test'))
  if (master?.db && test?.db && master.db !== test.db) {
    console.log('\n  ℹ️  master 与 test 指向不同数据库 —— 这是预期行为（生产/预发布隔离）。')
    console.log('     合并分支时务必保留 master 的 wrangler.toml，否则生产会连到预发布库。')
  }
}

process.exit(failed ? 1 : 0)
