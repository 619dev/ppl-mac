# macOS security and localization tests

Run from this macOS repository with Node.js 22+:

```bash
npm ci
npm run typecheck
npm run test:security
npm run test:i18n
npm run build
```

Ported from the iOS 3.1.1 source (`c9b22d4`), originally imported from upstream `9bf6aaf`. Group and private-message coverage is updated from PaperPhoneLite 3.1.5 (`d0b21db`).

- `authenticatedMessaging.test.cjs`: signed round trips, tampering, mutual verification, replay, key replacement and trust invalidation.
- `signedGroups.test.cjs`: signed distributions, membership, rotations, historical epochs, account isolation, group operation without private verification, and decryption of older text-appearance-protected messages.
- `sync.test.cjs`: pagination, deduplication, asynchronous cache-before-cursor persistence, failures and account changes.
- `nativeCache.test.cjs`: native asynchronous cache writes, ciphertext-only persistence, disk failures, logout ordering and hydration account isolation.
- `securityI18n.test.cjs`: 92 security keys across eight languages, placeholders, duplicates and locale changes.

Crypto suites use real sodium, X25519, PBKDF2 and AES-GCM. Secret storage is mocked at the macOS secure-storage adapter; these tests do not validate the OS Keychain, Electron IPC, Tor, notifications or a live server. Native development uses `npm run dev:electron`.

Use a PaperPhoneLite 3.1.5 server for live checks. Confirm historical friendship repair at server startup, friend list and request refresh on both clients, group sending without the private handshake, and offline recovery after membership changes.

Run `npm run verify:mac` to check architecture, Developer ID signatures, notarization, and Gatekeeper on packaged builds.

See [English guide](../README_EN.md) and [中文说明](../README_CN.md).
