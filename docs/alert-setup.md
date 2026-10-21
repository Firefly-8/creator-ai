# 多人生成失败告警（运维配置手册）

> 需求：**多个人尝试生图失败时，给所有者发一封告警邮件。**
> 触发条件 = 最近 N 分钟内，**≥ M 位不同用户**出现非用户侧失败。

---

## 1. 它长什么样

真实告警邮件（纯文本，避免进垃圾箱）：

```
多人生成失败告警

站点：https://creator.yozzytools.com
时间窗口：最近 10 分钟（2026-10-21T04:38:00Z ~ 2026-10-21T04:48:00Z）
涉及用户：4 位
失败次数：7 次

错误分布：
  2056    Token plan quota exhausted                × 5（2 位用户）
  1002    Rate limited (too many requests)          × 2（2 位用户）

最近失败样本：
  2026-10-21T04:47:31.000Z  user=abc12345…  image/generate  code=2056
      usage limit exceeded
  ...

判定规则：最近 10 分钟内，≥ 3 位不同用户出现非用户侧失败
冷却规则：同一波故障 30 分钟内只发一封
```

---

## 2. 判定规则（重要，先看这个）

### 用「不同用户数」，不是「失败次数」

| 场景 | 结果 |
|---|---|
| 1 个人连点 20 次重试 | ❌ 不告警（只是个用户 prompt 有问题） |
| 2 个人各失败 1 次 | ❌ 不告警（样本太少） |
| 3 个不同的人各失败 1 次 | ✅ 告警 |
| 1 个人批量出 4 张全失败 | ❌ 不告警（还是一个人） |

### 排除「用户自己的锅」

MiniMax 这些错误码归为用户侧，**不进告警统计**：

| 码 | 含义 |
|---|---|
| 1026 | 输入触发内容审核（用户写了敏感词） |
| 1027 | 输出触发内容审核 |
| 2013 | 参数非法（最常见是 prompt 超 1500 字符） |

想把它们也算进去：设 `ALERT_COUNT_USER_ERRORS=true`。
（它们的流水**照样记录**，事后能查。）

### 进告警统计的

| 分类 | 错误码 |
|---|---|
| quota | 1008 余额不足、2056 Token Plan 额度耗尽 |
| system | 1002 限流、1004 鉴权失败、1024 内部错误、2045 增长限流、2049 key 无效、HTTP 4xx/5xx |
| unknown | 拿不到错误码（保守当 system 处理） |

### 冷却期

同一波故障只发一封，默认 30 分钟。并发请求用 D1 单条 UPSERT 原子占位，
不会各发一封（靠 `meta.changes` 判定谁抢到了）。

---

## 3. 需要配的环境变量

在 Cloudflare Pages → Settings → Environment variables（**四个环境都要配**）。

### 必填

| 变量 | 说明 | 例子 |
|---|---|---|
| `ALERT_EMAIL_TO` | 收件人，逗号分隔 | `your@qq.com` |
| `RESEND_API_KEY` | Resend 的 API key（`re_` 开头） | `re_xxxxx` |
| `OPS_ALERT_SECRET` | 运维端点的调用密钥（自己编一个长随机串） | `a3f9c2e1...` |

### 可选（有默认值）

| 变量 | 默认 | 说明 |
|---|---|---|
| `ALERT_PROVIDER` | 自动判断 | `resend` / `brevo` / `none` |
| `ALERT_EMAIL_FROM` | `Create Keepsakes Alerts <alerts@yozzytools.com>` | 发件人 |
| `ALERT_MIN_DISTINCT_USERS` | `3` | 几位不同用户才告警 |
| `ALERT_WINDOW_MINUTES` | `10` | 统计窗口（分钟） |
| `ALERT_COOLDOWN_MINUTES` | `30` | 冷却期（分钟） |
| `ALERT_COUNT_USER_ERRORS` | `false` | 是否把用户侧错误也算进去 |
| `BREVO_API_KEY` | — | 用 Brevo 时才需要 |

> ⚠️ **改 secret 不需要重新部署** —— 代码运行时读的是 `globalThis.__env__`（真实运行时 env），
> 不是构建期内联的 `process.env`。改完下一个请求就生效。
> （`nuxt.config.ts` 里的 `process.env` 只是本地开发和构建期兜底。）

---

## 4. Resend 配置（发信方）

QQ 邮箱只是**收件方**，发信需要一个 HTTP 邮件 API —— 因为
Cloudflare Workers/Pages 不支持裸 TCP，没法用 nodemailer 直连 `smtp.qq.com`。

1. <https://resend.com> 注册（免费版 3000 封/月 + 100 封/天）
2. Dashboard → Domains → Add Domain → 填 `yozzytools.com`（或子域 `mail.yozzytools.com`）
3. Resend 会给 3 条 DNS 记录，加到 Cloudflare DNS：

   | 类型 | 名称 | 值 |
   |---|---|---|
   | TXT | `_resend` | `v=spf1 include:_spf.resend.com ~all` |
   | TXT | `resend._domainkey` | Resend 给的 DKIM 公钥 |
   | CNAME | `resend` | `resend.com` |

4. 等状态变 **Verified**（1~5 分钟）
5. API Keys → Create API Key → 权限选 **Sending access** → 复制 `re_...`
6. 把 `re_...` 写进 CF 的 `RESEND_API_KEY`

> 不想搞 DNS？用 **Brevo**（免费 300 封/天，不用自有域名也能发），
> 设 `ALERT_PROVIDER=brevo` + `BREVO_API_KEY` 即可。缺点是免费版带品牌标识、送达率一般。
>
> 告警是低频（一天几封），100 封/天完全够用。

---

## 5. 配完之后怎么验证

### 5.1 发一封测试邮件

```bash
curl -X POST https://<你的域名>/api/ops/alert \
  -H 'X-Ops-Secret: <你的 OPS_ALERT_SECRET>' \
  -H 'Content-Type: application/json' \
  -d '{"action":"test"}'
```

返回：

```json
{
  "ok": true,
  "config": { "provider": "resend", "configured": true, "recipients": ["your@qq.com"], ... },
  "sent": true,
  "message": "测试邮件已发送，去收件箱看看（记得看垃圾箱）"
}
```

`ok: false` 时看 `reason` 字段（常见：域名没验证 / API key 无效 / 没配收件人）。

### 5.2 看最近失败统计

```bash
curl -X POST https://<你的域名>/api/ops/alert \
  -H 'X-Ops-Secret: <你的 OPS_ALERT_SECRET>' \
  -H 'Content-Type: application/json' \
  -d '{"action":"stats"}'
```

### 5.3 模拟一次真实告警

用 3 个不同的 uid 触发失败（阈值 3 位用户）：

```bash
for uid in test-u1 test-u2 test-u3; do
  curl -X POST https://<你的域名>/api/image/generate \
    -H "Authorization: Bearer <某个用户的 token>" \
    -H 'Content-Type: application/json' \
    -d '{"prompt":"a test"}'
done
```

注意：同一个 token 换 3 次不算 3 个用户 —— 判定看的是 **uid**。
要真模拟 3 个用户，得用 3 个不同的登录账号。

---

## 6. 代码位置

| 文件 | 作用 |
|---|---|
| `server/utils/failure-monitor.ts` | 记录失败 + 判定「多个人失败」+ 触发告警 |
| `server/utils/alert.ts` | 邮件发送（resend / brevo / none） |
| `server/utils/minimax-guard.ts` | 错误码分类（user / quota / system） |
| `server/utils/env.ts` | 运行时 env 读取（`globalThis.__env__` 优先） |
| `server/api/ops/alert.post.ts` | 运维端点：测试邮件 + 失败统计 |
| `server/db/migrations/0008_ops_monitoring.sql` | `ops_generation_failures` + `ops_alerts` 两张表 |
| `tests/failure-monitor.test.ts` | 单元测试（20 个用例） |

接入的入口：`image/generate`、`image/generate-batch`、`music/generate`、
`image/optimize`、`image/message`、`lyrics`。

---

## 7. 顺带修掉的两个坑

### ① MiniMax 业务错误以前是「静默失败」

MiniMax 的业务错误（2056 额度耗尽 / 1008 余额不足 / 1026 内容审核）
**全部是 HTTP 200 + `body.base_resp.status_code != 0`**，不是 4xx/5xx。

以前 `image/generate` 等入口只判断 `if (!res.ok)`，于是额度用完会走成：

```
HTTP 200 + {base_resp:{status_code:2056}}, data 为空
  → res.ok === true，不抛错
  → processImageResult() 拿到空数组
  → 图片记录 status='ready' 但 image_path=null
  → 用户看到「生成成功」但没有图，日志里一行错误都没有
```

现在三个生图入口统一走 `generateImage()` / `generateMusic()`（内部会检查
`base_resp.status_code`），错误码能准确落到 `MiniMaxError.statusCode`，
告警才有可能知道发生了什么。

### ② `/api/minimax/quota` 以前是公开的

它在 auth 中间件的公开白名单里，而且带 `?probe=N` 会**真的调 MiniMax 生成 N 张图**
—— 等于把额度白送出去。

现在：整个端点要求登录；`probe` 模式额外要求 admin 身份
（`user_privileges` 表里有 `admin` 记录）。

---

## 8. 还能加的（还没做）

- **恢复通知**：告警后恢复时发一封「已恢复」。当前没做 —— 邮件场景下可能太啰嗦。
- **企业微信 / 飞书机器人**：一个 webhook URL 就完事、零费用、国内秒达，适合当主通道或备份。
- **MiniMax 额度阈值告警**（提前预警，剩 20% 就提醒充值）—— 需要定时轮询，
  而 **Cloudflare Pages 没有 Cron Trigger**（只有 Workers 有），
  要么单独建 Worker，要么用 GitHub Actions 打 `/api/ops/alert`。
  MiniMax 后台自带的余额告警可以先开着顶一顶。
