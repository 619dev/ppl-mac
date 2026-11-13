<div align="center">
  <img src="public/icons/icon-512.png" width="128" height="128" alt="PaperPhoneLite" style="border-radius: 24px;" />
  <h1>PaperPhoneLite Desktop</h1>
  <p><strong>端对端加密即时通讯 macOS 桌面客户端</strong></p>
  <p><strong>End-to-End Encrypted Messaging macOS Desktop Client</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Platform-macOS-blue?style=flat-square&logo=apple" alt="Platform" />
    <img src="https://img.shields.io/badge/Version-3.1.5-green?style=flat-square" alt="Version" />
    <img src="https://img.shields.io/badge/Electron-36-47848F?style=flat-square&logo=electron" alt="Electron" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square" alt="License" />
  </p>
</div>

---

## 3.1.5 更新与兼容性（2026-11-14）

本版同步上游 PaperPhoneLite 3.1.5 客户端（`d0b21db`、`2823996`）。

- 好友关系变更后在线刷新好友列表和请求，重连时同步好友列表。升级到对应的 3.1.5 服务端后，服务端启动时会补齐历史单向好友关系。
- 新群消息使用 Ed25519 签名和 Sender Key 加密，按成员变化轮换密钥。群密钥分发和签名验证使用服务端公布的身份公钥，无需逐个完成私聊的线下验证。建议群成员一并升级。
- 新消息的额外文本外观加密仅用于私聊。使用过该功能的历史群消息仍可用原密码解密。私聊继续支持线下约定密码的双向身份验证及安全号码核对。

开发环境要求 Node.js 22+ 和 npm。在本 Mac 仓库执行 `npm ci`、`npm run typecheck`、`npm run test:security`、`npm run test:i18n`、`npm run build`。原生开发使用 `npm run dev:electron`；仅浏览器预览无法访问钥匙串。`npm run build:mac` 还需要签名、公证凭据，arm64 DMG/ZIP 输出至 `release/3.1.5/`。

验证范围：密码学、同步及翻译自动测试使用网络和存储适配器；跨设备/真实服务器联调、钥匙串和 Tor 运行验证、签名公证安装包验证仍需单独完成。3.1.5 发布提供 arm64 DMG；签名与公证状态以 Release 说明为准。参见[测试说明](tests/README.md)。

## 3.1.5 changes and compatibility (2026-11-14)

This release ports the upstream PaperPhoneLite 3.1.5 client changes (`d0b21db`, `2823996`).

- Refresh the friend list and requests after friendship changes, and refresh the list on reconnect. The corresponding 3.1.5 server repairs historical one-sided friendships at startup.
- New group messages use Ed25519 signatures and Sender Key encryption, with key rotation on membership changes. Group key distribution and signature verification use server-published identity keys and work without private offline verification of every member. Group members should upgrade together.
- The extra text-appearance encryption layer applies to new private messages. Older group messages protected by that layer remain readable with their original password. Private chats still support mutual offline-password verification and safety-number checks.

Development requires Node.js 22+ and npm. From this macOS repository run `npm ci`, `npm run typecheck`, `npm run test:security`, `npm run test:i18n`, and `npm run build`. Use `npm run dev:electron` for the native bridge; browser-only preview cannot access Keychain. `npm run build:mac` additionally requires signing/notarization credentials and packages arm64 DMG/ZIP artifacts under `release/3.1.5/`.

Validation scope: automated crypto/sync/localization tests use network and storage adapters. Live cross-device/server tests, Keychain/Tor runtime checks, and signed/notarized installer verification remain separate release checks. The 3.1.5 release provides an arm64 DMG; see the Release notes for signing and notarization status. See [test notes](tests/README.md).

## 📖 Documentation / 文档

- [中文文档 (Chinese)](README_CN.md)
- [English Documentation](README_EN.md)

## 更新日志

完整版本更新记录已迁移至 [changelog.md](changelog.md)。

---

## 🔐 Extra-encrypted text appearance: design and security boundary

This feature is **extra insurance on top of the existing end-to-end encryption (E2EE)**. It does not replace E2EE with a visual encoding, and it never bypasses or weakens the original encryption. Private chats remain protected by the X25519 key agreement, XSalsa20-Poly1305 encryption, and Ed25519 message signatures; group chats continue to use the Sender Key protocol. Identity private keys and group Sender Keys remain protected by macOS secure storage.

When enabled, every message is processed in this order:

1. The sender first protects the message body with the extra password shared by both private-chat participants. PBKDF2-SHA-256 (210,000 iterations and a random salt) derives an AES-256-GCM key; every message has an independent random IV and an authentication tag for integrity.
2. The complete extra-encryption frame (version, salt, IV, and ciphertext) is then encoded with one of eight selectable text appearances. This is not merely decorative character substitution: the visible characters carry the extra encrypted ciphertext.
3. That appearance ciphertext then enters the project's original encryption path: private-chat E2EE or group Sender Key encryption. The server still receives the original E2EE/Sender-Key ciphertext plus metadata required for delivery.
4. The recipient reverses the order: first decrypt the original E2EE/Sender-Key layer, then decode the text-appearance frame and decrypt the body with the extra password.

The extra password is never uploaded, synchronized automatically, or distributed by the server. Both people in a private chat must set the same password. Older group messages protected by the extra layer still require their original password. Text appearances do not need to match: every message carries its own appearance identifier, so the recipient automatically detects and decodes the sender's choice. For example, one person may send Buddhist text while another sends Hangul; if the extra password matches, both decrypt normally. A user's appearance setting controls only the ciphertext appearance of messages they send. If the password is missing, locked, or different, messages are still sent and received normally and the original E2EE layer still decrypts successfully, but the app can display only the appearance ciphertext—not the original text.

The app does not persist the extra password. While unlocked it exists only in the current process memory; locally, the app stores only a random salt and AES-GCM verification data used to check whether an entered password is correct. Users can lock immediately or automatically 5, 15, 30, or 60 minutes after the app leaves the foreground. This layer adds an independent shared secret beyond E2EE; it does not replace a strong password, device lock, or system secure storage, and it cannot provide absolute protection on a fully compromised device while the password remains in memory.

## 🔐 额外加密文本外观：工作原理与安全边界

这项功能是**建立在原有端到端加密（E2EE）之上的额外保险**，不是用文本外观代替 E2EE，也不会绕过或降低原有加密。私聊仍由 X25519 密钥协商、XSalsa20-Poly1305 加密和 Ed25519 消息签名保护；群聊仍使用 Sender Key 协议。身份私钥和群聊 Sender Key 继续由 macOS 系统安全存储保护。

启用后，每条消息按以下顺序处理：

1. 发送方先用私聊双方约定的额外密码处理消息正文。密码通过 PBKDF2-SHA-256（210,000 次迭代及随机盐）派生 AES-256-GCM 密钥；每条消息使用独立随机 IV，并通过认证标签校验完整性。
2. 额外加密后的完整数据帧（版本、盐、IV 和密文）再转换成所选的 8 种文本外观之一。这不是单纯替换字符的装饰效果，外观字符实际承载的是额外加密密文。
3. 该外观密文随后才进入项目原有加密链路：私聊使用 E2EE，群聊使用 Sender Key；服务器接收到的仍是原有 E2EE／Sender Key 密文及投递所需元数据。
4. 接收端执行相反流程：先用原有 E2EE／Sender Key 解密消息，再还原文本外观数据，并用额外密码解密出正文。

额外密码不会上传、自动同步或由服务器分发。私聊双方必须设置相同密码。历史群消息如启用了额外加密，仍需原密码。文本外观不需要一致：每条消息都会携带自己的外观类型标记，接收端会自动识别并还原发送方选择的外观。例如一方发送“与佛论禅”、另一方发送“韩文”，只要额外密码相同，双方都能正常解密；每个人的外观设置只决定自己发出的密文样式。密码缺失、仍处于锁定状态或密码不一致时，消息依然能够正常发送、接收并完成原有 E2EE 解密，但应用只能显示文本外观密文，无法显示原文。

应用不会持久保存额外密码：解锁后密码只保留在当前运行内存中，本地仅保存随机盐和用于验证密码是否正确的 AES-GCM 验证数据。用户可以立即锁定，也可在应用离开前台 5、15、30 或 60 分钟后自动锁定。此额外层用于在原有 E2EE 之外增加一个独立的共享秘密；它不能替代强密码、设备锁、系统安全存储，也不能在设备已被完全控制且密码仍驻留内存时提供绝对保护。

## 📄 License / 许可证

This project is built upon [PaperPhoneLite](https://github.com/619dev/PaperPhoneLite) and is licensed under the [AGPL-3.0](LICENSE).

本项目基于 [PaperPhoneLite](https://github.com/619dev/PaperPhoneLite) 开发，采用 [AGPL-3.0](LICENSE) 许可证发布。
