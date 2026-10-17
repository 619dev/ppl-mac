# macOS security and localization tests

Run from this macOS repository with Node.js 22+:

```bash
npm ci
npm run typecheck
npm run test:security
npm run test:i18n
npm run build
```

Ported from the iOS 3.1.1 source (`c9b22d4`), originally imported from upstream `9bf6aaf`.

- `authenticatedMessaging.test.cjs`: signed round trips, tampering, mutual verification, replay, key replacement and trust invalidation.
- `signedGroups.test.cjs`: signed distributions, membership, rotations, historical epochs and account isolation.
- `sync.test.cjs`: pagination, deduplication, asynchronous cache-before-cursor persistence, failures and account changes.
- `nativeCache.test.cjs`: native asynchronous cache writes, ciphertext-only persistence, disk failures, logout ordering and hydration account isolation.
- `securityI18n.test.cjs`: 92 security keys across eight languages, placeholders, duplicates and locale changes.

Crypto suites use real sodium, X25519, PBKDF2 and AES-GCM. Secret storage is mocked at the macOS secure-storage adapter; these tests do not validate the OS Keychain, Electron IPC, Tor, notifications or a live server. Native development uses `npm run dev:electron`.

For 3.1.1, validate signing/notarization separately with `npm run build:mac` and `npm run verify:mac`. Cross-device private/group messages, verification, key changes, offline rotations, account switching and cold-start cache recovery need live testing against a compatible PaperPhoneLite 3.1.0 server. No installer is published by the test commands above.

See [English guide](../README_EN.md) / [中文说明](../README_CN.md).

On 2026-10-17, typecheck, all security suites (including the Mac cache suite), eight-language checks, and the Electron/renderer production build passed. The build emits dependency annotation, crypto externalization, eval and chunk-size warnings. No signed installer or live interoperability result is claimed.

3.1.1 release validation: Apple Silicon (arm64) only, Developer ID signed, without an Apple notarization ticket. The strict `npm run verify:mac` still requires notarization and fails at the ticket check for this release. Security/localization/type checks and production builds passed; live interoperability remains unverified.
