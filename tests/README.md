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
- `mediaCache.test.cjs`: deduplication, offline reads, reconnect revalidation, account isolation and unavailable storage.
- `nativeCache.test.cjs`: native asynchronous cache writes, ciphertext-only persistence, disk failures, logout ordering and hydration account isolation.
- `securityI18n.test.cjs`: 92 security keys across eight languages, placeholders, duplicates and locale changes.

Crypto suites use real sodium, X25519, PBKDF2 and AES-GCM. Secret storage is mocked at the macOS secure-storage adapter; these tests do not validate the OS Keychain, Electron IPC, Tor, notifications or a live server. Native development uses `npm run dev:electron`.

Use a PaperPhoneLite 3.1.7 server for live checks. Confirm historical friendship repair at server startup, friend list and request refresh on both clients, group sending without the private handshake, and offline recovery after membership changes.

Run `npm run verify:mac` to check architecture, Developer ID signatures, notarization, and Gatekeeper on packaged builds.

See [English guide](../README_EN.md) and [中文说明](../README_CN.md).

Also verify that Profile shows 3.1.8, offers the five inactivity periods, and reloads a saved setting. Use a disposable account to check immediate deletion and the `account_deleted` session event. With two-factor authentication enabled, reset a test password using the current authenticator code, sign in with the new password, and confirm that previous sessions were revoked. Open media online, reopen it offline after restarting Electron, and confirm that Clear cache removes its local copy.

Check the verification badge and group signature, pending key, and failed signature icons. Open the emoji picker, send an emoji and find it under Recent, then send a sticker. Check the QR scanner and language picker on macOS.
