/**
 * 生成管理员初始化 SQL
 * 运行: node server/scripts/generate-admin-sql.mjs > /tmp/seed-admin.sql
 * 然后: npx wrangler d1 execute craftai-db --file=/tmp/seed-admin.sql --remote
 */

async function hashPassword(password) {
  const PBKDF2_ITERATIONS = 100000
  const SALT_BYTES = 16
  const KEY_BYTES = 32

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')

  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('admin-auth-secret-v1' + Array.from(salt).map(b => String.fromCharCode(b)).join('')),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    KEY_BYTES * 8
  )
  const hashBytes = new Uint8Array(bits)
  const hashHex = Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('')

  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`
}

const password = 'zjs970310'
const hash = await hashPassword(password)
const id = 'admin_001'
const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

const sql = `-- 初始化管理员账号
-- 账号: admin / 密码: zjs970310
INSERT OR REPLACE INTO admins (id, username, password_hash, display_name, is_active, created_at, updated_at)
VALUES ('${id}', 'admin', '${hash}', 'Administrator', 1, '${now}', '${now}');
`

console.log(sql)
