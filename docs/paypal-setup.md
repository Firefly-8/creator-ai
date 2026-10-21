# PayPal 配置指南（订阅 + 一次性支付 + 沙箱账号）

> 面向：Create Keepsakes（create.yozzytools.com）
> 最后更新：2026-10-21

## 0. 先搞清一件事：PayPal 里「产品」到底是什么

PayPal 的对象分三层，**搞混了会白折腾**：

| 对象 | 用途 | 我们的场景 |
|---|---|---|
| **Product**（目录产品） | 一个"卖的东西"的壳，带名字/描述/类型 | 订阅档位共用一个 Product |
| **Plan**（订阅计划） | 挂在 Product 上，定义**计费周期和价格** | $9.99/月、$99/年 |
| **Order**（订单） | 一次性的付款单，直接带金额 | **$3.99 单张、$19.99 买断 20 张** |

**关键结论**：
- **订阅** = Product + Plan + 订阅实例 → 需要 plan id
- **一次性支付** = 直接建 Order，**不需要 Product，也不需要 Plan** ✅
  → 所以 $3.99 / $19.99 两个档位只要在代码里写金额即可，后台一个都不用建

---

## 1. 准备沙箱账号

### 1.1 进开发者后台

1. 打开 <https://developer.paypal.com/dashboard>
2. 用你的 **普通 PayPal 账号**登录（不用注册开发者账号，那套已经废弃了）
3. **右上角确认切到 `Sandbox`（沙箱）** ⚠️ 这一步是「我的 key 不工作」支持工单的头号原因

### 1.2 沙箱账号（买家 + 卖家）

左侧导航 → **Testing Tools → Sandbox Accounts**

PayPal 注册时已经自动给你建好了一对：

```
sb-xxxxxxxxxx@business.example.com   ← 卖家（收钱）
sb-xxxxxxxxxx@personal.example.com   ← 买家（付钱）
```

需要更多就点 **Create account**：

| 字段 | 填什么 | 说明 |
|---|---|---|
| Account Type | `Personal` / `Business` | Personal = 买家，Business = 商家 |
| Country/Region | 你实际卖的国家 | **决定币种和支付方式，改不了** ⚠️ |
| | | 卖英国就建英国买家，否则会碰到根本不存在���的货币问题 |

想要指定余额/密码/绑定测试卡，点左下角 **Create Custom Account**：

- `PayPal balance` — 虚拟余额（测大额时调高）
- `Password` — 自己设一个，别到时候在后台翻
- `Payment card` — 绑张测试卡，可以顺便测刷卡路径

**查账号密码**：账号那一行的 `…` → **View/Edit Account** → **Profile** 标签 → 里面有邮箱和密码（可点复制）。

### 1.3 拿到 API 凭据

左侧导航 → **Apps & Credentials**（确认右上角还是 `Sandbox`）

- 默认会给你一个 **Default Application**，点进去复制 **Client ID**
- **Secret key** 点 `Show` 再复制
- 想用另一个卖家账号收钱，就点 **Create App**（Type 选 `Merchant`，选对应的 sandbox business account）

⚠️ **沙箱和正式的 Client ID / Secret 完全不通用**，贴错就是"认证失败"且没有有用提示。

---

## 2. 沙箱账号怎么登录付款

沙箱有独立的登录页：**<https://www.sandbox.paypal.com>**

- 用你在 1.2 拿到的买家邮箱 + 密码登录
- **建议开一个隐身窗口** —— 沙箱和正式站共用 cookie 空间，混着登录很容易搞不清自己在哪个环境
- 付款完成后钱会出现在商家的沙箱账号里，可以直接看到 ✅

### 测试卡（想测刷卡而不是 PayPal 余额时）

| 卡号 | 品牌 | CVV | 效果 |
|---|---|---|---|
| `4032 0356 8578 4487` | Visa | 任意 3 位 | 正常通过 |
| `4012 8888 8888 1881` | Visa | 任意 3 位 | 长期测试号 |
| `2223 0000 4840 0011` | Mastercard | 任意 3 位 | 2 系列 BIN |
| `3714 4963 5398 431` | Amex | 任意 4 位 | 15 位卡号 |

**故意让它失败**：把持卡人姓名填成触发词（卡号金额照常有效）：

| 持卡人姓名 | 结果 |
|---|---|
| `CCREJECT-REFUSED` | 通用发卡行拒绝 |
| `CCREJECT-SF` | 疑似欺诈拒绝 |
| `CCREJECT-EC` | 过期卡拒绝 |

**一半的 bug 藏在失败路径里** —— 建一个余额 $0 的买家账号专门测这个。

---

## 3. 创建订阅产品（后台点选路径）

想用后台点，就去 **<https://www.sandbox.paypal.com/billing/plans>**，跟着提示走完"产品 + 计划"两步。

但**更推荐用 API 建**（可重复、可脚本化）—— 我们仓库里已经带了脚本：

```bash
node scripts/paypal-check.mjs --create
```

它会：
1. 建一个 Product `Create Keepsakes`（已存在就复用）
2. 建两个 Plan：
   - `Create Keepsakes Monthly` — $9.99 / MONTH
   - `Create Keepsakes Yearly` — $99.00 / YEAR

建完把 plan id 填进 `.env`：

```bash
PAYPAL_CREATOR_PLAN_ID=P-xxxxxxxxxxxx     # $9.99/月
PAYPAL_PRO_PLAN_ID=P-xxxxxxxxxxxx        # $19.99/月（要保留才填）
PAYPAL_SANDBOX=true
```

### 手动建的话，最小请求体长这样

```bash
# 1) 建产品
curl -X POST https://api-m.sandbox.paypal.com/v1/catalogs/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Create Keepsakes","type":"SERVICE","category":"SOFTWARE"}'

# 2) 建计划（product_id 用上一步的）
curl -X POST https://api-m.sandbox.paypal.com/v1/billing/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "product_id": "PROD-XXXX",
    "name": "Create Keepsakes Monthly",
    "status": "ACTIVE",
    "billing_cycles": [{
      "frequency": {"interval_unit":"MONTH","interval_count":1},
      "tenure_type": "REGULAR","sequence":1,"total_cycles":0,
      "pricing_scheme": {"fixed_price":{"value":"9.99","currency_code":"USD"}}
    }],
    "payment_preferences": {
      "auto_bill_outstanding": true,
      "setup_fee_failure_action": "CONTINUE",
      "payment_failure_threshold": 3
    }
  }'
```

---

## 4. 一次性支付（$3.99 / $19.99）—— 后台什么都不用建

一次性支付走 **Orders v2**，直接带金额：

```
前端点「Pay once」
  → POST /api/paypal/order  { planId: 'lifetime' }
  → 服务端向 PayPal 建 order（金额由服务端按 planId 决定）
  → 返回 orderId → PayPal 按钮渲染 → 用户在 PayPal 批准
  → POST /api/paypal/order/capture { orderId }
  → 服务端 capture 确认 → 发放额度
```

**金额在服务端**（`server/api/paypal/order.post.ts` 的 `ONE_TIME_PLANS`）：

| planId | 金额 | 张数 |
|---|---|---|
| `single` | $3.99 | 1 |
| `lifetime` | $19.99 | 20 |

⚠️ 绝不能接受前端传来的金额 —— 否则改个请求参数就能 3.99 买 20 张。

想手工验一下 Orders v2 能不能用：

```bash
node scripts/paypal-check.mjs --order
```

会打印一个 approve 链接，用沙箱买家账号打开付掉即可。

---

## 5. 配 Webhook

**Dashboard ▸ Apps & Credentials ▸ 你的应用 ▸ Sandbox Webhooks ▸ Add Webhook**

- Webhook URL：`https://staging.creator.yozzytools.com/api/subscriptions/webhook`
  （生产环境换成 `https://create.yozzytools.com/...`）
- 事件勾选：
  - `BILLING.SUBSCRIPTION.ACTIVATED`
  - `BILLING.SUBSCRIPTION.CANCELLED`
  - `BILLING.SUBSCRIPTION.SUSPENDED`
  - `BILLING.SUBSCRIPTION.EXPIRED`
  - `PAYMENT.CAPTURE.COMPLETED`
  - `CHECKOUT.ORDER.COMPLETED`

保存后把 **Webhook ID** 填进 `.env`：

```bash
PAYPAL_WEBHOOK_ID=8AB12345CD67890E
```

⚠️ **不填 Webhook ID 的话，签名验证会被跳过**（仅限非生产环境）。
生产环境必须配 —— 否则任何人都能伪造「用户已付款」来白嫖额度。

**手工触发一次事件**（不用真付款就能测 webhook）：
Dashboard ▸ **Testing Tools → Webhooks Simulator** → 选事件类型 → Send Test Event。

**沙箱不发真邮件**，所有通知在 Dashboard ▸ **Testing Tools → Sandbox Notifications** 里看。

---

## 6. 把凭据配到 Cloudflare

```bash
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=9fb668990196a42386f3544fa69d5b76

# ⚠️ 只提交要改的键 + 真值；要保留的键**完全不要进 body**
#    （GET 回来的 secret_text 永远是空值，原样 PATCH 回去 = 静默清空密钥）
npx wrangler pages secret put PAYPAL_CLIENT_ID --project-name craftai-staging
npx wrangler pages secret put PAYPAL_CLIENT_SECRET --project-name craftai-staging
npx wrangler pages secret put PAYPAL_CREATOR_PLAN_ID --project-name craftai-staging
npx wrangler pages secret put PAYPAL_WEBHOOK_ID --project-name craftai-staging
```

`PAYPAL_SANDBOX` 不是 secret，用 `wrangler.toml` 或 Pages 项目的环境变量配。

---

## 7. 自检清单

配完之后跑一遍：

```bash
node scripts/paypal-check.mjs
```

它会告诉你：token 能不能拿到、账号下有哪些产品和计划。

然后端到端验一遍：

1. 注册一个沙箱买家（Personal，余额给 $50）
2. 打开 `/pricing`，点「Pay once — 20 cards」
3. 在 PayPal 弹窗里用买家账号登录并付款
4. 回到站内应看到提示，额度 +20
5. 去 <https://sandbox.paypal.com> 用卖家账号登录，确认收到了钱

**如果 PayPal 按钮不出来**，按这个顺序查：

| 症状 | 大概率原因 |
|---|---|
| 按钮空白 | client id 没配 / 沙箱正式搞反了 |
| 提示 "Invalid webhook" | Webhook ID 没配或配错 |
| 订单创建失败 502 | Client ID/Secret 复制时带了空格或换行 |
| 一直跳回登录 | 买家和卖家是同一个沙箱账号（PayPal 不允许自己付自己） |
| 金额/币种不匹配 | 买家国家和你卖的地区不一致 |

---

## 8. 切生产要改什么

| 项 | 沙箱 | 生产 |
|---|---|---|
| base URL | `api-m.sandbox.paypal.com` | `api-m.paypal.com` |
| Client ID / Secret | 沙箱的 | **完全不同的另一套** |
| `PAYPAL_SANDBOX` | `true` | `false` |
| Webhook URL | staging 域名 | `create.yozzytools.com` |
| 订阅计划 | 沙箱建的 | **要在正式环境重新建一遍**（产品/计划不跨环境） |

⚠️ 正式环境的产品和计划**必须重建** —— 沙箱建的东西在正式环境不存在。
