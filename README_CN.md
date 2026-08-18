<div align="center">
  <img src="public/icons/icon-512.png" width="128" height="128" alt="PaperPhoneLite" style="border-radius: 24px;" />
  <h1>PaperPhoneLite Desktop</h1>
  <p><strong>端对端加密即时通讯 macOS 桌面客户端</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Platform-macOS-blue?style=flat-square&logo=apple" alt="Platform" />
    <img src="https://img.shields.io/badge/Version-3.0.8-green?style=flat-square" alt="Version" />
    <img src="https://img.shields.io/badge/Electron-36-47848F?style=flat-square&logo=electron" alt="Electron" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square" alt="License" />
  </p>
</div>

---

## 📖 简介

PaperPhoneLite Desktop 是 [PaperPhoneLite](https://github.com/619dev/PaperPhoneLite) 的 macOS 桌面客户端版本，基于 Electron 构建。它将原项目的 React 前端封装为原生桌面应用，提供完整的即时通讯功能，并内置网络代理支持。

## ✨ 功能特性

### 更新日志

完整版本更新记录已迁移至 [changelog.md](changelog.md)。

---

### 💬 即时通讯
- 私聊 & 群聊，支持文字、图片、视频、文件、语音消息
- 一对一视频/语音通话
- 基于 LiveKit SFU 的群组视频会议，支持最高 100 人
- 视频网格、参会者列表、发言状态及摄像头/静音状态显示
- 主席全员静音，以及讲课模式与自由讨论模式
- 朋友圈（Moments）动态发布与浏览
- 联系人管理、扫码添加好友

### 🔐 端对端加密
- **E2EE（端对端加密）**：所有消息在发送前加密，服务器无法读取
- **前向保密（Forward Secrecy）**：基于 Double Ratchet 算法，每条消息使用不同密钥
- **抗量子加密**：集成 CRYSTALS-Kyber 后量子密钥封装，抵御量子计算攻击
- **加密库**：libsodium (X25519, XSalsa20-Poly1305, Ed25519)

### 🌐 网络代理
- 支持 **SOCKS5**、**HTTP**、**HTTPS** 代理协议
- 系统级透明代理 — 所有 HTTP 和 WebSocket 流量自动走代理
- 多代理配置管理，一键切换
- 代理延迟测试
- 配置持久化，重启自动恢复

### 🖥️ 桌面特性
- macOS Universal Binary（同时支持 Intel 和 Apple Silicon）
- Telegram 风格桌面横屏布局（左侧边栏 + 右侧主面板）
- 侧边栏宽度可拖拽调整（280px–480px）
- 窗口位置 & 大小记忆
- 外部链接自动在系统浏览器中打开
- 暗色模式支持

## 🔐 额外加密文本外观：工作原理与安全边界

这项功能是**建立在原有端到端加密（E2EE）之上的额外保险**，不是用文本外观代替 E2EE，也不会绕过或降低原有加密。私聊仍由 X25519 / ML-KEM-768 密钥协商及原有消息加密链路保护；群聊仍使用 Sender Key 协议。身份私钥和群聊 Sender Key 继续由 macOS 系统安全存储保护。

启用后，每条消息按以下顺序处理：

1. 发送方先用双方或群内全员约定的额外密码处理消息正文。密码通过 PBKDF2-SHA-256（210,000 次迭代及随机盐）派生 AES-256-GCM 密钥；每条消息使用独立随机 IV，并通过认证标签校验完整性。
2. 额外加密后的完整数据帧（版本、盐、IV 和密文）再转换成所选的 8 种文本外观之一。这不是单纯替换字符的装饰效果，外观字符实际承载的是额外加密密文。
3. 该外观密文随后才进入项目原有加密链路：私聊使用 E2EE，群聊使用 Sender Key；服务器接收到的仍是原有 E2EE／Sender Key 密文及投递所需元数据。
4. 接收端执行相反流程：先用原有 E2EE／Sender Key 解密消息，再还原文本外观数据，并用额外密码解密出正文。

额外密码不会上传、自动同步或由服务器分发。私聊双方必须设置相同密码；群聊中希望阅读正文的所有成员也必须设置相同密码。文本外观不需要一致：每条消息都会携带自己的外观类型标记，接收端会自动识别并还原发送方选择的外观。例如一方发送“与佛论禅”、另一方发送“韩文”，只要额外密码相同，双方都能正常解密；每个人的外观设置只决定自己发出的密文样式。密码缺失、仍处于锁定状态或密码不一致时，消息依然能够正常发送、接收并完成原有 E2EE 解密，但应用只能显示文本外观密文，无法显示原文。

应用不会持久保存额外密码：解锁后密码只保留在当前运行内存中，本地仅保存随机盐和用于验证密码是否正确的 AES-GCM 验证数据。用户可以立即锁定，也可在应用离开前台 5、15、30 或 60 分钟后自动锁定。此额外层用于在原有 E2EE 之外增加一个独立的共享秘密；它不能替代强密码、设备锁、系统安全存储，也不能在设备已被完全控制且密码仍驻留内存时提供绝对保护。

## 📦 安装

### 从 Release 下载

前往 [Releases](../../releases) 页面下载安装包：

| 文件 | 说明 |
|------|------|
| `PaperPhoneLite-3.0.8-macOS.dmg` | 推荐：DMG 安装镜像（Universal） |
| `PaperPhoneLite-3.0.8-universal-mac.zip` | ZIP 压缩包 |

当前安装包同时支持 Intel 和 Apple Silicon Mac，并已使用 Apple Developer ID 证书签名；当前构建尚未装订 Apple 公证票据。如果 Gatekeeper 阻止首次启动，请在 Finder 中按住 Control 点击应用，选择“打开”，再确认启动。

## 🧅 内嵌 Tor 与 WebTunnel

macOS 客户端内嵌 Tor Project 官方 Tor 与 lyrebird 运行时，同时支持 Apple Silicon 和 Intel。应用启动后自动建立 Tor 线路并将 Electron 网络会话切换到本地 SOCKS5；直连 20 秒仍未完成 bootstrap 时，会自动从 Tor Project Moat 获取并校验 WebTunnel bridge，缓存有效 bridge 后重启 Tor。登录按钮只会在 Tor 完成 100% bootstrap 后启用，不会把 `.onion` 请求回退到明网。

WebTunnel 获取失败时会尝试上次成功缓存的 bridge；用户也可在登录页查看实时状态并手动重试。

## 🎥 视频会议

1. 进入群聊，点击语音会议或视频会议按钮。
2. 首次使用时，按 macOS 提示授予麦克风和摄像头权限。
3. 群主作为会议主席，可以执行全员静音，并在讲课模式与自由讨论模式之间切换。
4. 讲课模式下，普通参会者默认保持静音；切回自由讨论模式后可自行解除静音。

群组会议及一对一通话均使用 LiveKit SFU。Mac 客户端必须连接到包含 `/api/calls/meeting-token` 和 `/api/calls/direct-token` 接口的新版 PaperPhoneLite 服务端。服务端生产环境需配置：

```text
LIVEKIT_URL=wss://meeting.example.com
LIVEKIT_API_KEY=<API key>
LIVEKIT_API_SECRET=<至少 32 字节的 secret>
```

LiveKit 与 PaperPhoneLite 服务端必须使用相同的 key 和 secret。生产环境还需开放 TCP 7881 和 UDP 7882；复杂网络环境建议配置 TURN/TLS。

### 从源码构建

#### 环境要求

- Node.js >= 18
- npm >= 9
- macOS 系统

#### 步骤

```bash
# 克隆新的公共上游仓库；共享前端位于 client/ 目录
git clone https://github.com/619dev/PaperPhoneLite.git
cd PaperPhoneLite/client

# 安装依赖
npm install

# 开发模式（Vite 热重载 + Electron）
npm run dev:electron

# 构建生产版本
npm run build

# 打包 macOS 安装包
npm run build:mac
```

## 🔧 代理配置

1. 打开应用，进入登录页面
2. 点击代理设置图标
3. 添加代理节点（支持 SOCKS5 / HTTP / HTTPS）
4. 填写主机、端口、用户名（可选）、密码（可选）
5. 激活代理并测试连接

代理通过 Electron 的 `session.setProxy()` API 实现，对所有网络请求（包括 WebSocket）透明生效。

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
│  ┌──────┐ ┌───────┐ ┌──────┐ ┌──────┐ │
│  │Login │ │ Chats │ │Calls │ │Moments│ │
│  └──────┘ └───────┘ └──────┘ └──────┘ │
│  ┌─────────────────────────────────┐   │
│  │  Crypto (libsodium + Kyber)     │   │
│  │  Double Ratchet + E2EE          │   │
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
| 视频会议 | LiveKit Client 2.20（SFU） |
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
│   ├── contexts/        # React Context（通话等）
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
