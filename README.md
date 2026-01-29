# Agent Modal - 飞书深度集成网页应用模板

本项目是一个基于 **Next.js 15** 构建的移动优先、深度集成飞书（Lark）能力的网页 AI 应用模板。它完整实现了飞书官方推荐的 JSSDK 鉴权、应用免登以及基于 JWT 的持久化会话管理逻辑。

## 🚀 功能特性

- **深度集成飞书 JSSDK**：支持获取 JSAPI 临时授权凭证（ticket），自动完成签名计算，支持调用飞书原生 API。
- **全自动免登录**：用户在飞书客户端内打开网页时，自动获取授权码（Code）并交换用户信息，实现无感登录。
- **JWT 持久化会话**：引入 `jose` 库，通过 HttpOnly Cookie 存储加密的 JWT，刷新页面无需重复请求飞书授权码，提升用户体验。
- **响应式 UI**：基于移动优先设计，适配飞书内置浏览器环境。
- **工程化基础**：集成官方 `@larksuiteoapi/node-sdk`，支持 Zod 环境变量校验，类型定义完备。

---

## 🛠️ 飞书后台配置指南

在开始运行项目前，请确保您已经在 [飞书开放平台](https://open.feishu.cn/app) 创建了应用并完成以下配置：

1. **凭证获取**：
   - 进入 `应用凭证`，获取 `App ID` 和 `App Secret`。
2. **启用网页能力**：
   - 进入 `添加能力` -> `网页`，点击“启用网页”。
3. **配置安全域名**（关键）：
   - 进入 `安全设置`：
     - **H5 可信域名**：添加您的项目运行域名（如 `https://your-domain.com` 或开发环境地址）。
     - **重定向 URL**：添加同样的域名。
4. **权限范围**：
   - 进入 `权限管理`，搜索并启用以下权限（用于获取用户信息）：
     - `获取用户基本信息`
     - `通过手机号或邮箱获取用户 ID`（可选，根据需求）

---

## ⚙️ 环境变量配置

在项目根目录下创建 `.env` 文件，参考以下配置：

```bash
# 飞书应用配置
FEISHU_APP_ID=cli_xxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FEISHU_DOMAIN=https://open.feishu.cn

# 前端可访问的 App ID (用于 tt.requestAuthCode)
NEXT_PUBLIC_FEISHU_APP_ID=cli_xxxxxxxxxxxxxx

# JWT 密钥 (请务必使用长随机字符串)
# 生成方式: openssl rand -base64 32
JWT_SECRET=您的随机密钥

# 运行环境
NODE_ENV=development
```

---

## 🏗️ 核心架构说明

### 1. JSSDK 鉴权流程
- **后端**：使用 `tenant_access_token` 请求 `jsapi_ticket`，结合当前页面 URL 生成 SHA1 签名。
- **前端**：通过 `window.h5sdk.config` 进行校验，校验成功后执行 `tt.ready`。

### 2. 免登与会话恢复
- **优先恢复**：应用挂载后，前端先请求 `/api/auth/me`。如果本地 Cookie 中的 JWT 有效，直接获取用户信息。
- **免登兜底**：若 Session 失效，则调用 `tt.requestAuthCode` 获取授权码，并发送至 `/api/feishu/auth/login` 换取新 Token。

---

## 💻 前端使用指南

本项目封装了 `FeishuProvider`，您可以在任何子组件中轻松获取飞书状态：

```tsx
"use client";

import { useFeishu } from "@/components/FeishuProvider";

export default function UserProfile() {
  const { user, isLark, isReady } = useFeishu();

  if (!isLark) return <div>请在飞书内打开</div>;
  if (!isReady) return <div>环境初始化中...</div>;
  if (!user) return <div>正在登录...</div>;

  return (
    <div>
      <img src={user.avatar_url} alt={user.name} />
      <h1>你好，{user.name}</h1>
    </div>
  );
}
```

---

## 🛠️ 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产环境构建
npm run build
```

---

## 📂 目录结构预览

- `app/api/feishu/`：飞书相关的后端 API（鉴权、登录）。
- `components/FeishuProvider.tsx`：前端核心容器组件。
- `lib/feishu/`：飞书 SDK 封装与工具类。
- `lib/auth.ts`：JWT 签发与校验逻辑。


<!-- 启用内网穿透 -->
<!-- https://dashboard.ngrok.com/get-started/setup/windows -->