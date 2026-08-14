# 邮箱验证流程设计

## 核心规则

> **未验证邮箱 = 账号未完成注册 = 不能正常使用**

---

## 完整流程

### 1. 注册流程

```
用户填写邮箱密码 → 点击"创建账号"
  │
  ├─ Firebase createUserWithEmailAndPassword
  │
  ├─ Firebase sendEmailVerification()  ← 自动发送验证邮件
  │
  ├─ 同步用户到 D1（email_verified = false）
  │
  ├─ Firebase 自动登录
  │
  └─ 前端检测到 emailVerified = false
      └─ 显示"请验证邮箱"页面（全页遮罩，不可跳过）
```

### 2. 登录流程（未验证用户）

```
用户输入邮箱密码 → 点击"登录"
  │
  ├─ Firebase signInWithEmailAndPassword  ← 登录成功
  │
  ├─ 获取 user.emailVerified
  │
  ├─ true  → 正常进入应用
  │
  └─ false → 显示"请验证邮箱"页面
      │
      ├─ "重新发送验证邮件"按钮
      ├─ "我已验证，刷新状态"按钮
      └─ "退出登录"按钮
```

### 3. 验证完成

```
用户点击邮件中的验证链接
  │
  ├─ Firebase 标记 email_verified = true
  │
  ├─ 用户回到应用点击"我已验证，刷新状态"
  │  或重新登录
  │
  ├─ Firebase token 刷新，emailVerified = true
  │
  └─ 进入应用，恢复正常
```

### 4. Google 登录

```
用户点击"使用 Google 登录"
  │
  ├─ Firebase signInWithPopup(Google)
  │
  ├─ Google 账号默认已验证邮箱
  │
  └─ 直接正常进入（无需额外验证）
```

---

## 前端实现

### useAuth.ts 状态

```typescript
export function useAuth() {
  // ...existing code...
  const emailVerified = ref(false)
  
  // 监听认证状态
  onAuthStateChanged(auth, async (u) => {
    user.value = u
    emailVerified.value = u?.emailVerified || false
    authReady.value = true
    if (u) syncUser(u)
  })
  
  // 刷新验证状态（用户点击"我已验证"时调用）
  async function refreshVerificationStatus() {
    const auth = nuxtApp.$auth
    if (auth?.currentUser) {
      await auth.currentUser.reload()
      emailVerified.value = auth.currentUser.emailVerified
    }
  }
  
  return { user, emailVerified, refreshVerificationStatus, ... }
}
```

### EmailVerificationGuard.vue 组件

```vue
<template>
  <div v-if="user && !emailVerified" class="verification-guard">
    <div class="verification-card">
      <h2>请验证您的邮箱</h2>
      <p>验证邮件已发送至 {{ user.email }}</p>
      <p>请查收邮件并点击验证链接，验证完成后点击下方按钮</p>
      
      <button @click="resendEmail">重新发送验证邮件</button>
      <button @click="checkVerification">我已验证，刷新状态</button>
      <button @click="logout">退出登录</button>
    </div>
  </div>
</template>
```

### layouts/default.vue 集成

```vue
<template>
  <div>
    <!-- 未验证邮箱时显示全页遮罩 -->
    <EmailVerificationGuard />
    
    <!-- 正常内容（已验证或未登录时显示） -->
    <slot v-if="!user || emailVerified" />
  </div>
</template>
```

---

## 后端改动

### auth/sync.post.ts

```typescript
// 注册时记录 email_verified
const emailVerified = payload.email_verified || false

// 写入 D1
await d1.prepare(`
  INSERT INTO users (id, email, name, avatar, email_verified, ...)
  VALUES (?, ?, ?, ?, ?, ...)
`).bind(uid, email, name, avatar, emailVerified ? 1 : 0, ...).run()
```

### auth/me.get.ts

```typescript
// 返回 email_verified 状态
return {
  user: {
    ...
    emailVerified: user.email_verified,
  },
  ...
}
```

---

## 邮件发送策略

| 时机 | 行为 |
|------|------|
| 注册成功 | Firebase 自动发送 |
| 点击"重新发送" | 调用 `sendEmailVerification()` |
| 重新发送冷却 | 60 秒内不可重复发送 |

---

## 安全注意事项

1. **防止滥用**：重新发送按钮加 60 秒冷却
2. **Token 过期**：Firebase ID Token 1 小时过期，自动刷新
3. **会话管理**：退出登录后清除所有本地状态
4. **Google 登录**：Google 账号邮箱已验证，直接放行

---

## 改动清单

| 文件 | 改动 |
|------|------|
| `composables/useAuth.ts` | 增加 `emailVerified` 状态 + `refreshVerificationStatus()` |
| `components/auth/EmailVerificationGuard.vue` | 新增：验证引导页面 |
| `layouts/default.vue` | 集成 EmailVerificationGuard |
| `server/api/auth/sync.post.ts` | 同步 `email_verified` 到 D1 |
| `server/api/user/me.get.ts` | 返回 `email_verified` |
