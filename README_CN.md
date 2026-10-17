<div align="center">
  <img src="public/icons/icon-512.png" width="128" height="128" alt="PaperPhoneLite" style="border-radius: 24px;" />
  <h1>PaperPhoneLite Desktop</h1>
  <p><strong>端对端加密即时通讯 macOS 桌面客户端</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Platform-macOS-blue?style=flat-square&logo=apple" alt="Platform" />
    <img src="https://img.shields.io/badge/Version-3.1.1-green?style=flat-square" alt="Version" />
    <img src="https://img.shields.io/badge/Electron-36-47848F?style=flat-square&logo=electron" alt="Electron" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square" alt="License" />
  </p>
</div>

---

## 3.1.1 安全更新与兼容性（2026-10-17）

本次吸收本地 iOS 仓库至 `c9b22d4` 的共享改动，安全基线为上游 `9bf6aaf`（3.1.0）。保留 Electron 桌面导航、内嵌 Tor/WebTunnel、钥匙串密钥保护、IndexedDB 加密消息缓存、桌面通知和附件下载。Bark、APNs、分享扩展及 iOS 原生界面不属于 Mac 功能。

- 在联系人资料中，使用线下约定的强文本外观密码，双方启用并解锁消息隐私后完成身份验证及签名回执。通过独立可信渠道核对安全号码；身份密钥变化后需重新验证，号码一致本身并非绝对安全保证。
- 签名群聊验证成员身份及密钥分发，随成员变化轮换发送密钥，保留历史密钥时期以恢复离线消息。身份不可信或签名无效时阻止相关操作，不静默降级。
- 服务端需兼容 PaperPhoneLite 3.1.0 的签名消息、群组及密钥接口，通信端也应匹配；不保证旧版未签名客户端互通。服务器仍可见投递元数据。
- 私聊实际发送使用 X25519、XSalsa20-Poly1305 和 Ed25519；签名发送未启用 ML-KEM，不能宣称为 Double Ratchet。
- 离线同步持续分页，等待加密缓存写入完成后才推进账号游标；显示明文与签名校验结果不落盘，恢复后重新验签。

开发环境要求 Node.js 22+ 和 npm。在本 Mac 仓库执行 `npm ci`、`npm run typecheck`、`npm run test:security`、`npm run test:i18n`、`npm run build`。原生开发使用 `npm run dev:electron`；仅浏览器预览无法访问钥匙串。`npm run build:mac` 还需要签名、公证凭据，arm64 DMG/ZIP 输出至 `release/3.1.1/`。

验证范围：密码学、同步及翻译自动测试使用网络和存储适配器；跨设备/真实服务器联调、钥匙串和 Tor 运行验证、签名公证安装包验证仍需单独完成。3.1.1 发布产物仅提供 arm64 DMG/ZIP；签名与公证状态以 Release 说明为准。参见[测试说明](tests/README.md)。

## 📖 简介

PaperPhoneLite Desktop 是 [PaperPhoneLite](https://github.com/619dev/PaperPhoneLite) 的 macOS 桌面客户端版本，基于 Electron 构建。它将原项目的 React 前端封装为原生桌面应用，提供完整的即时通讯功能，并内置网络代理支持。

## ✨ 功能特性

### 更新日志

完整版本更新记录已迁移至 [changelog.md](changelog.md)。

---

### 💬 即时通讯
- 私聊 & 群聊，支持文字、图片、视频、文件、语音消息
- 联系人管理、扫码添加好友
- Lite 版不包含私聊/群聊音视频通话、朋友圈、时间线及“发现”页面

### 🔐 端对端加密
- **E2EE（端对端加密）**：所有消息在发送前加密，服务器无法读取
- **消息认证**：使用 Ed25519 签名绑定发送者、接收者、消息类型及密文；当前实现不提供 Double Ratchet。
- **实际发送路径**：X25519 + XSalsa20-Poly1305 + Ed25519，签名发送不启用 ML-KEM。
- **加密库**：libsodium (X25519, XSalsa20-Poly1305, Ed25519)

### 🌐 Tor 网络
- 仅打包 Apple Silicon 的 Tor/WebTunnel
- 自动启动 Tor，完成 bootstrap 后允许登录
- Electron 的 HTTP 与 WebSocket 通过本地 Tor SOCKS 连接
- 个人信息页已移除代理入口和子页面，网络由内嵌 Tor 自动管理

### 🖥️ 桌面特性
- macOS arm64（仅 Apple Silicon）
- Telegram 风格桌面横屏布局（左侧边栏 + 右侧主面板）
- 侧边栏宽度可拖拽调整（280px–480px）
- 窗口位置 & 大小记忆
- 外部链接自动在系统浏览器中打开
- 暗色模式支持

## 🔐 额外加密文本外观：工作原理与安全边界

这项功能是**建立在原有端到端加密（E2EE）之上的额外保险**，不是用文本外观代替 E2EE，也不会绕过或降低原有加密。私聊仍由 X25519 密钥协商、XSalsa20-Poly1305 加密和 Ed25519 消息签名保护；群聊仍使用 Sender Key 协议。身份私钥和群聊 Sender Key 继续由 macOS 系统安全存储保护。

启用后，每条消息按以下顺序处理：

1. 发送方先用双方或群内全员约定的额外密码处理消息正文。密码通过 PBKDF2-SHA-256（210,000 次迭代及随机盐）派生 AES-256-GCM 密钥；每条消息使用独立随机 IV，并通过认证标签校验完整性。
2. 额外加密后的完整数据帧（版本、盐、IV 和密文）再转换成所选的 8 种文本外观之一。这不是单纯替换字符的装饰效果，外观字符实际承载的是额外加密密文。
3. 该外观密文随后才进入项目原有加密链路：私聊使用 E2EE，群聊使用 Sender Key；服务器接收到的仍是原有 E2EE／Sender Key 密文及投递所需元数据。
4. 接收端执行相反流程：先用原有 E2EE／Sender Key 解密消息，再还原文本外观数据，并用额外密码解密出正文。

额外密码不会上传、自动同步或由服务器分发。私聊双方必须设置相同密码；群聊中希望阅读正文的所有成员也必须设置相同密码。文本外观不需要一致：每条消息都会携带自己的外观类型标记，接收端会自动识别并还原发送方选择的外观。例如一方发送“与佛论禅”、另一方发送“韩文”，只要额外密码相同，双方都能正常解密；每个人的外观设置只决定自己发出的密文样式。密码缺失、仍处于锁定状态或密码不一致时，消息依然能够正常发送、接收并完成原有 E2EE 解密，但应用只能显示文本外观密文，无法显示原文。

应用不会持久保存额外密码：解锁后密码只保留在当前运行内存中，本地仅保存随机盐和用于验证密码是否正确的 AES-GCM 验证数据。用户可以立即锁定，也可在应用离开前台 5、15、30 或 60 分钟后自动锁定。此额外层用于在原有 E2EE 之外增加一个独立的共享秘密；它不能替代强密码、设备锁、系统安全存储，也不能在设备已被完全控制且密码仍驻留内存时提供绝对保护。

## 📦 安装

### 从 Release 下载

已发布版本见 [Releases](../../releases)。下表为本地打包 3.1.1 时的预期文件名；更新源码不会发布这些文件：

| 文件 | 说明 |
|------|------|
| `PaperPhoneLite-3.1.1-macOS-arm64.dmg` | 推荐：DMG 安装镜像（arm64） |
| `PaperPhoneLite-3.1.1-arm64-mac.zip` | ZIP 压缩包 |

3.1.1 打包配置仅面向 Apple Silicon（arm64），要求 Developer ID 签名并启用公证。源码构建不代表安装包已签名或公证；产物需通过 `npm run verify:mac` 验证。

## 🧅 内嵌 Tor 与 WebTunnel

macOS 客户端内嵌 Tor Project 官方 Tor 与 lyrebird 运行时，3.1.1 仅打包 Apple Silicon 运行时。应用启动后自动建立 Tor 线路并将 Electron 网络会话切换到本地 SOCKS5；直连 20 秒仍未完成 bootstrap 时，会自动从 Tor Project Moat 获取并校验 WebTunnel bridge，缓存有效 bridge 后重启 Tor。登录按钮只会在 Tor 完成 100% bootstrap 后启用，不会把 `.onion` 请求回退到明网。

WebTunnel 获取失败时会尝试上次成功缓存的 bridge；用户也可在登录页查看实时状态并手动重试。

### 从源码构建

#### 环境要求

- Node.js >= 22
- npm >= 9
- macOS 系统

#### 步骤

```bash
# 使用本 macOS 仓库；公共上游前端不包含 Electron 打包配置
cd /path/to/ppl-mac

# 安装依赖
npm ci

# 开发模式（Vite 热重载 + Electron）
npm run dev:electron

# 构建生产版本
npm run build

# 打包 macOS 安装包
npm run build:mac
```

## 🔧 网络使用

启动应用后等待 Tor bootstrap 达到 100%。直连超过 20 秒时尝试通过 Moat 获取已校验的 WebTunnel bridge，失败时使用有效缓存；登录页提供重试。Mac 个人信息页与 iOS 一致，已移除代理入口和子页面。

## 🏗️ 技术架构

```
┌─────────────────────────────────────────┐
│            Electron Main Process         │
│  ┌─────────┐  ┌──────────┐  ┌────────┐ │
│  │  Proxy  │  │  Window  │  │  IPC   │ │
│  │ Manager │  │ Manager  │  │Handler │ │
│  └─────────┘  └──────────┘  └────────┘ │
│       ↕ session.setProxy()    ↕ IPC     │
├─────────────────────────────────────────┤
│          Preload (contextBridge)         │
├─────────────────────────────────────────┤
│          Renderer (React 19 + Vite)      │
│       ┌──────┐       ┌──────────┐       │
│       │Login │       │  Chats   │       │
│       └──────┘       └──────────┘       │
│  ┌─────────────────────────────────┐   │
│  │  Crypto (libsodium signatures)     │   │
│  │  Signed private/group E2EE          │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 36 |
| 前端框架 | React 19 + TypeScript 5.7 |
| 构建工具 | Vite 6 |
| 状态管理 | Zustand 5 |
| 加密 | libsodium-wrappers-sumo + crystals-kyber-js |
| 打包 | electron-builder |
| 持久化 | electron-store |

## 📁 项目结构

```
├── electron/
│   ├── main.ts          # 主进程：窗口、代理、IPC
│   └── preload.ts       # 预加载：安全 API 桥接
├── src/
│   ├── api/             # HTTP、WebSocket、代理桥接
│   ├── components/      # UI 组件
│   ├── crypto/          # E2EE 加密模块
│   ├── hooks/           # 自定义 Hooks
│   ├── i18n/            # 国际化
│   ├── pages/           # 页面组件
│   ├── store/           # Zustand 状态管理
│   ├── utils/           # 工具函数
│   ├── App.tsx          # React 根组件
│   ├── electron.d.ts    # Electron API 类型声明
│   ├── index.css        # 全局样式
│   ├── main.tsx         # React 入口
│   └── vite-env.d.ts    # Vite 类型声明
├── build/               # 应用图标资源
├── electron-builder.yml # 打包配置
├── tsconfig.electron.json # Electron TypeScript 配置
├── vite.config.ts       # Vite 构建配置
└── package.json         # 项目配置
```

## 📄 许可证

本项目基于 [PaperPhoneLite](https://github.com/619dev/PaperPhoneLite) 开发，采用 [AGPL-3.0](LICENSE) 许可证发布。

3.1.1 发布验证：仅 Apple Silicon（arm64）；Developer ID 签名，不附 Apple 公证票据。严格的 `npm run verify:mac` 仍要求公证，因此当前发布会在票据检查处失败。安全/翻译/类型及生产构建检查通过，真实服务联调待完成。
