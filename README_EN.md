<div align="center">
  <img src="public/icons/icon-512.png" width="128" height="128" alt="PaperPhoneLite" style="border-radius: 24px;" />
  <h1>PaperPhoneLite Desktop</h1>
  <p><strong>End-to-End Encrypted Messaging macOS Desktop Client</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Platform-macOS-blue?style=flat-square&logo=apple" alt="Platform" />
    <img src="https://img.shields.io/badge/Version-3.0.21-green?style=flat-square" alt="Version" />
    <img src="https://img.shields.io/badge/Electron-36-47848F?style=flat-square&logo=electron" alt="Electron" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square" alt="License" />
  </p>
</div>

---

## 📖 Introduction

PaperPhoneLite Desktop is the macOS desktop client of [PaperPhoneLite](https://github.com/619dev/PaperPhoneLite), built with Electron. It wraps the original React frontend into a native desktop application with full instant messaging capabilities and built-in network proxy support.

## ✨ Features

### Changelog

The complete release history has moved to [changelog.md](changelog.md).

---

### 💬 Instant Messaging
- Private & group chat with text, images, videos, files, and voice messages
- Contact management, QR code friend requests
- Lite excludes private/group voice and video calls, Moments, Timeline, and the Discover page

### 🔐 End-to-End Encryption
- **E2EE**: All messages encrypted before sending; the server cannot read them
- **Forward Secrecy**: Based on the Double Ratchet algorithm, each message uses a unique key
- **Post-Quantum Encryption**: Integrated CRYSTALS-Kyber for resistance against quantum computing attacks
- **Crypto Library**: libsodium (X25519, XSalsa20-Poly1305, Ed25519)

### 🌐 Network Proxy
- Supports **SOCKS5**, **HTTP**, and **HTTPS** proxy protocols
- System-level transparent proxy — all HTTP and WebSocket traffic automatically routed through proxy
- Multiple proxy profile management with one-click switching
- Proxy latency testing
- Persistent configuration, auto-restored on restart

### 🖥️ Desktop Features
- macOS Universal Binary (Intel + Apple Silicon)
- Telegram-style desktop layout (left sidebar + right main panel)
- Draggable sidebar width (280px–480px)
- Window position & size persistence
- External links open in system browser
- Dark mode support

## 🔐 Extra-encrypted text appearance: design and security boundary

This feature is **extra insurance on top of the existing end-to-end encryption (E2EE)**. It does not replace E2EE with a visual encoding, and it never bypasses or weakens the original encryption. Private chats remain protected by the existing X25519 / ML-KEM-768 key agreement and message-encryption path; group chats continue to use the Sender Key protocol. Identity private keys and group Sender Keys remain protected by macOS secure storage.

When enabled, every message is processed in this order:

1. The sender first protects the message body with the extra password shared by both participants or by all group members. PBKDF2-SHA-256 (210,000 iterations and a random salt) derives an AES-256-GCM key; every message has an independent random IV and an authentication tag for integrity.
2. The complete extra-encryption frame (version, salt, IV, and ciphertext) is then encoded with one of eight selectable text appearances. This is not merely decorative character substitution: the visible characters carry the extra encrypted ciphertext.
3. That appearance ciphertext then enters the project's original encryption path: private-chat E2EE or group Sender Key encryption. The server still receives the original E2EE/Sender-Key ciphertext plus metadata required for delivery.
4. The recipient reverses the order: first decrypt the original E2EE/Sender-Key layer, then decode the text-appearance frame and decrypt the body with the extra password.

The extra password is never uploaded, synchronized automatically, or distributed by the server. Both people in a private chat must set the same password; every group member who needs to read the plaintext must also set that same password. Text appearances do not need to match: every message carries its own appearance identifier, so the recipient automatically detects and decodes the sender's choice. For example, one person may send Buddhist text while another sends Hangul; if the extra password matches, both decrypt normally. A user's appearance setting controls only the ciphertext appearance of messages they send. If the password is missing, locked, or different, messages are still sent and received normally and the original E2EE layer still decrypts successfully, but the app can display only the appearance ciphertext—not the original text.

The app does not persist the extra password. While unlocked it exists only in the current process memory; locally, the app stores only a random salt and AES-GCM verification data used to check whether an entered password is correct. Users can lock immediately or automatically 5, 15, 30, or 60 minutes after the app leaves the foreground. This layer adds an independent shared secret beyond E2EE; it does not replace a strong password, device lock, or system secure storage, and it cannot provide absolute protection on a fully compromised device while the password remains in memory.

## 📦 Installation

### Download from Releases

Go to the [Releases](../../releases) page and download the installer:

| File | Description |
|------|-------------|
| `PaperPhoneLite-3.0.21-macOS.dmg` | Recommended Universal DMG installer |
| `PaperPhoneLite-3.0.21-universal-mac.zip` | ZIP archive |

The installer supports both Intel and Apple Silicon Macs and is signed with an Apple Developer ID certificate. This build does not yet have an Apple notarization ticket stapled to it. If Gatekeeper blocks the first launch, Control-click the app in Finder, select **Open**, and confirm.

## 🧅 Embedded Tor and WebTunnel

The macOS client embeds the official Tor Project Tor and lyrebird runtimes for both Apple Silicon and Intel. It starts Tor automatically and switches Electron networking to the local SOCKS5 listener. If direct bootstrap has not completed within 20 seconds, it fetches and validates a WebTunnel bridge from Tor Project Moat, caches a valid bridge, and restarts Tor. Authentication remains disabled until Tor reaches 100% bootstrap, with no clearnet fallback for `.onion` requests.

If Moat is temporarily unavailable, the client tries the last successfully cached bridge. The login screen displays live bootstrap status and provides manual retry.

### Build from Source

#### Prerequisites

- Node.js >= 18
- npm >= 9
- macOS system

#### Steps

```bash
# Clone the new shared upstream; its frontend lives in client/
git clone https://github.com/619dev/PaperPhoneLite.git
cd PaperPhoneLite/client

# Install dependencies
npm install

# Development mode (Vite HMR + Electron)
npm run dev:electron

# Production build
npm run build

# Package for macOS
npm run build:mac
```

## 🔧 Proxy Configuration

1. Open the app and go to the login page
2. Tap the proxy settings icon
3. Add a proxy node (SOCKS5 / HTTP / HTTPS)
4. Enter host, port, username (optional), and password (optional)
5. Activate the proxy and test the connection

The proxy is implemented via Electron's `session.setProxy()` API, transparently covering all network requests including WebSocket connections.

## 🏗️ Architecture

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
│  │  Crypto (libsodium + Kyber)     │   │
│  │  Double Ratchet + E2EE          │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------:|
| Desktop Framework | Electron 36 |
| Frontend | React 19 + TypeScript 5.7 |
| Build Tool | Vite 6 |
| State Management | Zustand 5 |
| Encryption | libsodium-wrappers-sumo + crystals-kyber-js |
| Packaging | electron-builder |
| Persistence | electron-store |

## 📁 Project Structure

```
├── electron/
│   ├── main.ts          # Main process: window, proxy, IPC
│   └── preload.ts       # Preload: secure API bridge
├── src/
│   ├── api/             # HTTP, WebSocket, proxy bridge
│   ├── components/      # UI components
│   ├── crypto/          # E2EE encryption modules
│   ├── hooks/           # Custom hooks
│   ├── i18n/            # Internationalization
│   ├── pages/           # Page components
│   ├── store/           # Zustand state management
│   ├── utils/           # Utility functions
│   ├── App.tsx          # React root component
│   ├── electron.d.ts    # Electron API type declarations
│   ├── index.css        # Global styles
│   ├── main.tsx         # React entry point
│   └── vite-env.d.ts    # Vite type declarations
├── build/               # App icon assets
├── electron-builder.yml # Packaging configuration
├── tsconfig.electron.json # Electron TypeScript config
├── vite.config.ts       # Vite build configuration
└── package.json         # Project configuration
```

## 📄 License

This project is built upon [PaperPhoneLite](https://github.com/619dev/PaperPhoneLite) and is licensed under the [AGPL-3.0](LICENSE).
