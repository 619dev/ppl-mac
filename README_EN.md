<div align="center">
  <img src="public/icons/icon-512.png" width="128" height="128" alt="PaperPhoneLite" style="border-radius: 24px;" />
  <h1>PaperPhoneLite Desktop</h1>
  <p><strong>End-to-End Encrypted Messaging macOS Desktop Client</strong></p>

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

## 3.1.1 security and compatibility (2026-10-17)

Shared changes were ported from the local iOS repository through `c9b22d4`, including upstream security baseline `9bf6aaf` (3.1.0). Mac retains Electron navigation, embedded Tor/WebTunnel, Keychain-protected keys, encrypted IndexedDB message caches, desktop notifications, and attachment downloads. iOS Bark, APNs, Share Extension, and Capacitor UI are not desktop features.

- Open a contact profile, agree a strong text-appearance password offline, enable and unlock message privacy on both devices, and complete mutual verification and signed receipts. Compare safety numbers through an independent trusted channel. A key change invalidates prior trust and requires verification again; a matching number alone is not an absolute security guarantee.
- Signed groups verify member identities and key distributions, rotate sender keys with membership changes, and retain historical key epochs for offline recovery. Untrusted identities and invalid signatures block the protected operation rather than silently downgrading it.
- Use a server compatible with the PaperPhoneLite 3.1.0 signed-message/group APIs and matching clients. Older unsigned clients are not guaranteed to interoperate. Transport metadata remains visible to the server.
- Signed private messages use X25519, XSalsa20-Poly1305, and Ed25519. Existing hybrid crypto helpers do not mean signed sends use ML-KEM, and the implementation must not be described as Double Ratchet.
- Message sync paginates until complete and advances its account cursor only after the encrypted cache write completes. Display plaintext and cached signature verdicts are excluded from persistence; signatures are rechecked after restoration.

Development requires Node.js 22+ and npm. From this macOS repository run `npm ci`, `npm run typecheck`, `npm run test:security`, `npm run test:i18n`, and `npm run build`. Use `npm run dev:electron` for the native bridge; browser-only preview cannot access Keychain. `npm run build:mac` additionally requires signing/notarization credentials and packages arm64 DMG/ZIP artifacts under `release/3.1.1/`.

Validation scope: automated crypto/sync/localization tests use network and storage adapters. Live cross-device/server tests, Keychain/Tor runtime checks, and signed/notarized installer verification remain separate release checks. The 3.1.1 release provides arm64 DMG/ZIP artifacts; see the Release notes for signing and notarization status. See [test notes](tests/README.md).

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
- **Message authentication**: Ed25519 signatures bind private messages to their sender, recipient, type, and encrypted payload.
- **Actual sending path**: X25519 + XSalsa20-Poly1305 + Ed25519; ML-KEM is not enabled in signed sends. This is not a Double Ratchet implementation.
- **Crypto Library**: libsodium (X25519, XSalsa20-Poly1305, Ed25519)

### 🌐 Tor networking
- Embedded Tor and WebTunnel for Apple Silicon only
- Tor starts automatically; login waits for complete bootstrap
- Electron HTTP and WebSocket traffic uses the local Tor SOCKS listener
- The Profile proxy entry and subpage have been removed; embedded Tor manages networking

### 🖥️ Desktop Features
- macOS arm64 (Apple Silicon only)
- Telegram-style desktop layout (left sidebar + right main panel)
- Draggable sidebar width (280px–480px)
- Window position & size persistence
- External links open in system browser
- Dark mode support

## 🔐 Extra-encrypted text appearance: design and security boundary

This feature is **extra insurance on top of the existing end-to-end encryption (E2EE)**. It does not replace E2EE with a visual encoding, and it never bypasses or weakens the original encryption. Private chats remain protected by the X25519 key agreement, XSalsa20-Poly1305 encryption, and Ed25519 message signatures; group chats continue to use the Sender Key protocol. Identity private keys and group Sender Keys remain protected by macOS secure storage.

When enabled, every message is processed in this order:

1. The sender first protects the message body with the extra password shared by both participants or by all group members. PBKDF2-SHA-256 (210,000 iterations and a random salt) derives an AES-256-GCM key; every message has an independent random IV and an authentication tag for integrity.
2. The complete extra-encryption frame (version, salt, IV, and ciphertext) is then encoded with one of eight selectable text appearances. This is not merely decorative character substitution: the visible characters carry the extra encrypted ciphertext.
3. That appearance ciphertext then enters the project's original encryption path: private-chat E2EE or group Sender Key encryption. The server still receives the original E2EE/Sender-Key ciphertext plus metadata required for delivery.
4. The recipient reverses the order: first decrypt the original E2EE/Sender-Key layer, then decode the text-appearance frame and decrypt the body with the extra password.

The extra password is never uploaded, synchronized automatically, or distributed by the server. Both people in a private chat must set the same password; every group member who needs to read the plaintext must also set that same password. Text appearances do not need to match: every message carries its own appearance identifier, so the recipient automatically detects and decodes the sender's choice. For example, one person may send Buddhist text while another sends Hangul; if the extra password matches, both decrypt normally. A user's appearance setting controls only the ciphertext appearance of messages they send. If the password is missing, locked, or different, messages are still sent and received normally and the original E2EE layer still decrypts successfully, but the app can display only the appearance ciphertext—not the original text.

The app does not persist the extra password. While unlocked it exists only in the current process memory; locally, the app stores only a random salt and AES-GCM verification data used to check whether an entered password is correct. Users can lock immediately or automatically 5, 15, 30, or 60 minutes after the app leaves the foreground. This layer adds an independent shared secret beyond E2EE; it does not replace a strong password, device lock, or system secure storage, and it cannot provide absolute protection on a fully compromised device while the password remains in memory.

## 📦 Installation

### Download from Releases

Published installers are available on the [Releases](../../releases) page. The following are the expected filenames when packaging 3.1.1 locally; updating source does not publish these artifacts:

| File | Description |
|------|-------------|
| `PaperPhoneLite-3.1.1-macOS-arm64.dmg` | Recommended arm64 DMG installer |
| `PaperPhoneLite-3.1.1-arm64-mac.zip` | ZIP archive |

The 3.1.1 packaging configuration targets Apple Silicon (arm64) only, requires Developer ID signing, and enables notarization. A source build alone does not prove that a release has been signed or notarized. Validate the produced artifacts with `npm run verify:mac`.

## 🧅 Embedded Tor and WebTunnel

The macOS client embeds the official Tor Project Tor and lyrebird runtimes for Apple Silicon in the 3.1.1 release. It starts Tor automatically and switches Electron networking to the local SOCKS5 listener. If direct bootstrap has not completed within 20 seconds, it fetches and validates a WebTunnel bridge from Tor Project Moat, caches a valid bridge, and restarts Tor. Authentication remains disabled until Tor reaches 100% bootstrap, with no clearnet fallback for `.onion` requests.

If Moat is temporarily unavailable, the client tries the last successfully cached bridge. The login screen displays live bootstrap status and provides manual retry.

### Build from Source

#### Prerequisites

- Node.js >= 22
- npm >= 9
- macOS system

#### Steps

```bash
# Use this macOS repository (the shared upstream client has no Electron packaging)
cd /path/to/ppl-mac

# Install dependencies
npm ci

# Development mode (Vite HMR + Electron)
npm run dev:electron

# Production build
npm run build

# Package for macOS
npm run build:mac
```

## 🔧 Network operation

Start the desktop app and wait for Tor bootstrap to reach 100%. If direct bootstrap takes longer than 20 seconds, the embedded runtime tries a validated WebTunnel bridge from Moat or its last valid cached bridge. The login screen offers retry. The Mac Profile proxy entry and subpage have been removed, matching iOS 3.1.1.

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
│  │  Crypto (libsodium signatures)     │   │
│  │  Signed private/group E2EE          │   │
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

3.1.1 release validation: Apple Silicon (arm64) only, Developer ID signed, without an Apple notarization ticket. The strict `npm run verify:mac` still requires notarization and fails at the ticket check for this release. Security/localization/type checks and production builds passed; live interoperability remains unverified.
