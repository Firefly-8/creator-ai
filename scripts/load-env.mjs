/**
 * 简易 .env 加载器
 * 在脚本启动时自动加载项目根目录的 .env 文件到 process.env
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, '..', '.env');

export function loadEnv() {
  if (!existsSync(ENV_PATH)) return;
  
  const content = readFileSync(ENV_PATH, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // 去除引号
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // 只设置未定义的环境变量
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();
