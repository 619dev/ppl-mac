# Changelog / 更新日志

## 3.0.17

- Fixed end-to-end message decryption behavior when text appearance is unlocked so messages sent/received after unlock display plaintext instead of appearance-ciphertext.
- Ensured text-appearance unprotect runs on all desktop message decryption paths (live, history, and retry).
- Updated all macOS release artifact filenames and footer version displays to `3.0.17`.

- 修复文本外观已解锁状态下的解密问题：解锁后发送/接收消息可正常显示明文，不再停留在外观密文。
- 确保 macOS 桌面端在实时、历史与重试消息解密流程中都继续执行文本外观反解码。
- 将 macOS 发布包文件名和页面底部版本显示统一更新为 `3.0.17`。

## 3.0.16

- Synchronized the shared encryption and recovery fixes from PaperPhoneLite iOS 3.0.16.
- Aligned the private-message v2 hybrid KDF context with Android and iOS for cross-platform decryption.
- Applied text-appearance decryption after private-chat and Sender Key decryption for live, history, and retried messages.
- Restored the text-appearance password prompt for persisted sessions without persisting the password.
- Reconciles the server identity public key with the macOS Keychain-protected private key after startup and network recovery.
- Updated the macOS application version to `3.0.16`.

- 同步 PaperPhoneLite iOS 3.0.16 的共享加密与网络恢复修复。
- 对齐 Android、iOS 的私聊 v2 混合加密 KDF 上下文，恢复跨平台消息解密。
- 实时消息、历史消息和重试消息在私聊 E2EE／群聊 Sender Key 解密后继续解密文本外观层。
- 已登录会话启动时恢复文本外观密码提示，且仍不持久保存密码。
- 启动及网络恢复后，自动校准服务器身份公钥与 macOS 钥匙串保护的本地私钥。
- macOS 应用版本更新为 `3.0.16`。

## 3.0.13

- Synchronized the shared chat reliability updates from PaperPhoneLite iOS 3.0.13.
- Prevented rapid duplicate message sends, file uploads, and attachment saves with synchronous operation guards.
- File messages now show an in-progress clock and disable the active download button while the authenticated attachment is being prepared.
- Updated the macOS application version to `3.0.13`.

- 同步 PaperPhoneLite iOS 3.0.13 的聊天可靠性更新。
- 使用同步操作锁防止快速重复发送消息、上传文件和保存附件。
- 鉴权附件正在准备时，文件消息显示处理中图标并禁用当前下载按钮。
- macOS 应用版本更新为 `3.0.13`。

## 3.0.12

- Added authenticated same-origin attachment downloads with one automatic access-token refresh and retry.
- File messages now download through the configured PaperPhoneLite server instead of opening onion URLs in the system browser.
- Added localized download-failure messages and updated the macOS application version to `3.0.12`.

- 新增附件鉴权下载，访问令牌过期时会自动刷新一次并重试，且仅允许当前服务器同源的 `/api/files/` 地址。
- 文件消息改为通过当前 PaperPhoneLite 服务器下载，不再将 onion 地址交给系统浏览器。
- 补充多语言下载失败提示，macOS 应用版本更新为 `3.0.12`。

## 3.0.8

- Embedded the official Tor Project macOS Tor runtime for Apple Silicon and Intel.
- Tor starts automatically, enforces its local SOCKS proxy for Electron traffic, and falls back after 20 seconds to a Moat-fetched WebTunnel bridge with validated local caching.
- Added live Tor bootstrap/WebTunnel status reporting to the login screen and signed-binary packaging rules for Tor and lyrebird.
- Migrated the macOS client to the PaperPhoneLite 3.0.8 shared frontend baseline.
- Synchronized the latest login, Tor guidance, privacy/terms, localization, responsive layout, and shared messaging changes from the iOS client.
- Preserved the Electron desktop layout, macOS Keychain-backed secure storage, native proxy bridge, calls, and signed universal packaging flow.
- Changed the shared upstream source to <https://github.com/619dev/PaperPhoneLite>.

- macOS 客户端迁移至 PaperPhoneLite 3.0.8 公共前端基线。
- 同步 iOS 客户端最新的登录、Tor 引导、隐私/条款、多语言、自适应布局及共享消息逻辑。
- 保留 Electron 桌面布局、macOS 钥匙串安全存储、原生代理桥接、通话和签名 Universal 打包流程。
- 公共上游源码地址更新为 <https://github.com/619dev/PaperPhoneLite>。
- 内嵌 Tor Project 官方 Apple Silicon 与 Intel macOS Tor 运行时。
- Tor 自动启动并强制 Electron 流量使用本地 SOCKS；直连 20 秒未完成时从 Moat 自动抓取 WebTunnel，校验后缓存并切换连接。
- 登录页实时显示 Tor bootstrap/WebTunnel 状态，并为 Tor 与 lyrebird 增加正式打包签名规则。

All notable changes and new features are recorded here. Historical entries below were migrated from the repository documentation.

所有重要版本改动和新特性统一记录于此。下方历史条目由仓库原有文档迁移而来。

## 2.4.8

- Fixed incoming private messages failing to decrypt on macOS when the locally protected identity private key no longer matched the public key advertised by the server.
- The macOS client now verifies its published identity key during secure-state restoration, republishes the matching public bundle when stale, and resets obsolete Sender Key distributions without blocking offline startup.
- Updated the application version to `2.4.8`.

- 修复 macOS 本地安全存储中的身份私钥与服务器发布的公钥不一致时，收到的私聊消息无法解密的问题。
- macOS 客户端现在会在恢复安全状态时校验已发布的身份公钥；发现失效公钥后自动重新发布匹配的公钥包并重置过期的 Sender Key 分发，同时不影响离线启动。
- 应用版本更新为 `2.4.8`。

## 2.4.7

- Fixed E2EE safety-number mismatches by deriving both views from the same pair of published identity keys; text appearance and its extra password remain independent of the E2EE safety number.
- Fixed one-to-one video calls that could play audio while leaving the remote video black; remote LiveKit tracks now use native track attachment and explicit mobile playback.
- Fixed the call-duration race that could leave an established call at `00:00`.
- Added ordered multi-image sending with a maximum of 20 images per selection and per-image upload progress.
- Added per-account, per-conversation scroll-position memory and a one-tap button to jump to the latest message.
- Updated the application and native platform versions to `2.4.7`.

- 修复 E2EE 安全号码不一致：双方现在基于服务器发布的同一对身份公钥计算；文本外观及其额外密码仍与 E2EE 安全号码相互独立。
- 修复私聊视频通话只有声音、远端画面黑屏的问题；远端 LiveKit 媒体改用原生轨道绑定，并显式兼容移动端播放。
- 修复通话已经接通但计时器停留在 `00:00` 的事件竞态。
- 新增多图片发送：一次最多选择 20 张，保持选择顺序并显示逐张上传进度。
- 新增按账号、按会话保存屏幕滚动位置，以及一键跳到最新消息按钮。
- 应用及原生平台版本统一更新为 `2.4.7`。

---

# Historical entries from README.md

## ✨ Version 2.4.6 / 版本 2.4.6

- Text appearance is extra insurance above the existing E2EE: the shared extra password encrypts the body first, followed by private-chat E2EE or group Sender Key encryption. Both private-chat participants, or every group member, need the same password. Different passwords still allow delivery but show only styled ciphertext. / 文本外观是原有 E2EE 之上的额外保险：正文先由共享额外密码加密，再由私聊 E2EE 或群聊 Sender Key 加密。私聊双方或群内所有成员需使用相同密码；密码不一致时消息仍会送达，但只能看到文本外观密文。
- The password is never uploaded or synchronized, and this feature never replaces, bypasses, or downgrades E2EE. / 密码不会上传或自动同步；该功能不替代、不绕过也不降级原有 E2EE。

## ✨ Version 2.4.5 / 版本 2.4.5

- Fixed the unresponsive “Enable extra encryption” control in the desktop app by replacing the unsupported native password prompt with an in-app password dialog. / 修复桌面端“开启额外加密”按钮点击无反应的问题，使用应用内密码弹窗替代 Electron 不支持的原生密码提示框。

## ✨ Version 2.4.4 / 版本 2.4.4

- 修复额外加密锁定状态下的解锁密码提示，并同步全部 8 种语言。 / Fixed the locked extra-encryption password prompt across all eight languages.

Extra text-appearance encryption now always requires the correct extra password before it can be disabled, even while unlocked.

关闭额外文本外观加密时现在始终要求重新输入正确的额外密码，即使当前已解锁也不能绕过验证。

- 文本外观现已隐藏协议元数据，发送中的本地缓存不再保留消息原文。
- 额外聊天记录加密已移至个人信息 > 消息隐私，并全局应用于所有聊天。

Encrypted sends now fail closed and display their actual protocol. This release adds an optional chat-history password, eight presentation codecs, background auto-lock after 5/15/30/60 minutes, protected native key storage, and complete UI copy in eight languages.

加密失败时停止发送且不再回退明文，并显示实际协议版本。本版新增额外聊天记录密码、8 种文本外观编码、离开前台 5/15/30/60 分钟自动锁定、原生密钥安全存储及完整的 8 语言文案。

## ✨ Version 2.4.0 / 版本 2.4.0

Repairs legacy one-way friendship records when adding an existing friend and immediately refreshes the contact list.

修复历史单向好友记录导致“已是好友”但联系人不可见的问题；再次添加时会自动刷新联系人列表。

## ✨ Version 2.3.8 / 版本 2.3.8

Fixes fresh-install startup and interrupted secure-storage migration, reliably releases the camera when closing the QR scanner, and prevents duplicate friend requests from search results.

修复首次安装启动及安全存储迁移中断问题；关闭二维码扫描器时会可靠释放摄像头；好友搜索结果会识别已有好友，避免重复发送申请。

## Version 2.3.5 / 版本 2.3.5

Adds OS-protected local keys and authenticated encryption at rest for cached chat history. Legacy plaintext keys, message caches, and media caches are migrated or securely removed.

新增由 macOS 系统安全存储保护的本地密钥，以及带完整性校验的聊天记录静态加密；旧版明文密钥、消息缓存和媒体缓存会被迁移或安全清理。

## Version 2.3.1 / 版本 2.3.1

Adds durable refresh-token sessions, automatic access-token renewal, stronger WebSocket heartbeat and reconnection recovery, missed-message synchronization, and a persistent outbound queue with delivery acknowledgements.

新增持久化刷新令牌会话、访问令牌自动续期、增强的 WebSocket 心跳与重连恢复、漏收消息补同步，以及带送达确认的持久化发送队列。

## Version 2.2.9 / 版本 2.2.9

Adds persistent sticker caching for sticker-pack metadata and media, enabling faster loading and reliable reuse during server failures or offline sessions.

新增贴纸包元数据及贴纸媒体的持久化缓存，加快贴纸加载，并在服务异常或离线时可靠复用已缓存内容。

## Version 2.2.8 / 版本 2.2.8

Adds quoted-message replies, moves one-on-one voice and video calls to the LiveKit SFU, and improves call lifecycle handling and localized UI text.

新增消息引用回复，将一对一语音和视频通话全面迁移至 LiveKit SFU，并优化通话生命周期处理及多语言界面文案。

## Version 1.1.8 / 版本 1.1.8

Improves the chat composer layout and multiline editing, fixes remote audio playback in one-on-one calls, and makes voice effects switch reliably during a call.

优化聊天输入区布局和多行编辑体验，修复一对一通话的远端音频播放，并提升通话中变声模式切换的可靠性。

## Version 1.1.7 / 版本 1.1.7

Fixes unread message counters being incremented repeatedly when cached offline messages are replayed after reconnecting, and reliably clears the counter when a chat is opened from a notification or deep link.

修复重连后离线缓存消息重复推送导致未读数字反复增加的问题，并确保从通知或深链接进入聊天时正确清除未读数字。

## Version 1.1.6 / 版本 1.1.6

Improves one-on-one video calls and session handling, fixes Chinese username search with IMEs, and adds deeper offline caching with a user-accessible cache cleanup option.

改进一对一视频通话和会话状态处理，修复中文输入法下的用户名搜索，并新增更完整的离线缓存及用户可操作的缓存清理功能。

## Version 1.1.5 / 版本 1.1.5

Adds LiveKit SFU group video meetings for up to 100 participants, including a video grid, participant panel, mute-all controls, and lecture/discussion modes.

新增基于 LiveKit SFU 的百人群组视频会议，包括视频网格、参会者面板、全员静音及讲课/自由讨论模式。

---

# Historical entries from README_CN.md

### 🆕 2.4.6 更新

- 文本外观现已明确定位为原有端对端加密之上的额外保险：消息正文先由共享额外密码加密并转换为所选外观，再进入私聊 E2EE（X25519 / ML-KEM-768）或群聊 Sender Key 加密链路。
- 私聊双方或群内所有成员需要自行约定并设置相同的额外密码；密码不会上传服务器或自动同步。
- 密码不一致时，原有 E2EE 和消息送达仍正常，但接收方只能看到文本外观密文，无法查看原文。
- 该功能不会替代、绕过或降级原有 E2EE；个人信息 > 消息隐私页面的 8 种语言说明已同步更新。

### 🆕 2.4.5 更新

- 修复 macOS 桌面端“个人信息 > 消息隐私”中“开启额外加密”按钮点击无反应的问题
- 启用、解锁和关闭额外加密现统一使用应用内密码弹窗，不再依赖 Electron 不支持的原生 `prompt()`

### 2.4.4 更新

- 修复额外加密锁定状态下错误显示“设置密码”的问题；现在显示“输入解锁密码”，并同步全部 8 种语言。

- 修复关闭额外文本外观加密时未验证密码的安全问题；现在即使已解锁，也必须重新输入正确的额外密码才能关闭。
- 文本外观现已隐藏协议元数据，发送中的本地缓存不再保留消息原文。
- 额外聊天记录加密已移至个人信息 > 消息隐私，并全局应用于所有聊天。

- 加密失败时停止发送且不再回退明文，消息显示实际协议版本
- 新增额外聊天记录密码、8 种文本外观编码及 5/15/30/60 分钟后台自动锁定
- 未正确解锁时仅显示外观密文；私钥与 Sender Key 使用 macOS 安全存储保护，8 种语言文案完整同步

### 🆕 2.4.0 更新
- 修复历史单向好友记录导致“已是好友”但联系人不可见的问题；再次添加时会自动刷新联系人列表

### 🆕 2.3.8 更新
- 修复首次安装或保留登录态升级后缺少本地身份密钥时无法启动的问题
- 修复安全存储迁移中断留下无效数据后反复启动失败的问题
- 关闭二维码扫描器时可靠释放摄像头，并修复返回按钮的点击层级
- 好友搜索结果会标记已有好友，避免重复发送好友申请

### 2.3.5 更新
- 使用 macOS 系统安全存储保护设备密钥、身份私钥和群聊 Sender Keys
- 本地聊天记录使用账户与用途绑定的认证加密，密文保存至独立 IndexedDB
- 聊天明文仅保留在运行内存中，持久化前移除解密字段
- 自动迁移并删除旧版 localStorage、sessionStorage 和 IndexedDB 中的明文密钥及聊天缓存
- 清理旧版未加密媒体缓存；损坏或遭篡改的缓存会被安全丢弃

### 2.3.1 更新
- 新增刷新令牌持久化与访问令牌自动续期，减少短期令牌过期导致的重复登录
- 增强 WebSocket 鉴权、心跳检测与指数退避重连，并在网络恢复、页面唤醒或应用回到前台时主动恢复连接
- 重连成功后自动同步漏收消息，按服务端序列号去重并更新本地同步游标
- 新增持久化发送队列、客户端消息 ID 和送达确认，离线消息可在恢复连接后可靠重发

### 2.2.9 更新
- 新增贴纸包列表及内容的本地持久化缓存，服务异常或离线时仍可加载已缓存贴纸
- 新增独立的贴纸媒体缓存，按稳定的 `file_id` 复用静态、动态及视频贴纸
- 发送贴纸前完成本地缓存，并统一聊天消息与贴纸面板的缓存渲染逻辑
- 清理离线缓存时同步移除贴纸媒体缓存

### 2.2.8 更新
- 新增消息引用回复，可在私聊和群聊中查看被引用消息
- 一对一语音及视频通话全面迁移至 LiveKit SFU
- 优化通话响铃、接听、重连、挂断和媒体轨道生命周期处理
- 补充消息引用相关的多语言文案，并完善资料页的推送权限提示

### 1.1.8 更新
- 优化聊天输入区布局，支持输入框随多行内容自动扩展
- 调整语音、表情、更多附件和发送按钮的交互与排列
- 修复一对一语音及视频通话中远端音频可能无法播放的问题
- 修复通话期间切换正常、慢速和快速变声模式不生效的问题
- 优化视频通话中的联系人信息显示，避免遮挡远端画面

### 1.1.7 更新
- 修复重连后离线缓存消息重复推送导致未读数字反复增加的问题
- 仅在新消息真正写入本地缓存时增加未读数并触发通知
- 修复从通知或深链接直接进入聊天时未读数字未清除的问题

### 1.1.6 更新
- 修复一对一视频通话中本地及远端画面未正确挂载的问题
- 修复中文输入法组合输入时用户名搜索失效或使用旧文本的问题
- 优化登录会话处理，临时网络或鉴权异常不再错误清除本地登录状态
- 新增好友、群组、消息、朋友圈和时间线的离线缓存
- 新增设置页面缓存清理入口

---

# Historical entries from README_EN.md

### 🆕 What's New in 2.4.6

- Text appearance is now clearly documented as extra insurance above the existing end-to-end encryption: the shared extra password encrypts and renders the body first, followed by private-chat E2EE (X25519 / ML-KEM-768) or group Sender Key encryption.
- Both private-chat participants, or every group member, must agree on and configure the same extra password; it is never uploaded or synchronized.
- If passwords differ, E2EE and delivery still work, but recipients see only styled ciphertext and cannot read the original body.
- This feature never replaces, bypasses, or downgrades the original E2EE; the Profile > Message privacy explanation is updated in all eight UI languages.

### 🆕 What's New in 2.4.5

- Fixed the unresponsive “Enable extra encryption” control under Profile > Message privacy in the macOS desktop app
- Enabling, unlocking, and disabling extra encryption now use a consistent in-app password dialog instead of Electron's unsupported native `prompt()`

### What's New in 2.4.4

- Fixed the locked extra-encryption dialog so it requests the unlock password instead of asking users to set one, across all eight languages.

- Fixed a security issue that allowed extra text-appearance encryption to be disabled without password verification; the correct extra password must now be re-entered even while unlocked.
- Text appearance now hides protocol metadata and optimistic caches no longer retain original message bodies.
- Extra message-history encryption moved to Profile > Message privacy and applies globally to all chats.

- Encrypted sends fail closed instead of falling back to plaintext, with the actual protocol shown per message
- Adds an extra chat-history password, eight presentation codecs, and 5/15/30/60-minute background auto-lock
- Locked histories show presentation ciphertext only; private keys and Sender Keys use macOS secure storage, with all eight UI languages synchronized

### 🆕 What's New in 2.4.0
- Fixed legacy one-way friendship records causing an “Already friends” message while the contact remained invisible; adding the user again now repairs the relationship and refreshes the contact list immediately

### 🆕 What's New in 2.3.8
- Fixed startup when a fresh install or retained session has no local identity keys
- Recovered safely from invalid secure-storage data left by an interrupted migration
- Reliably releases the camera when closing the QR scanner and fixes the back button's click layering
- Identifies existing friends in search results to prevent duplicate friend requests

### What's New in 2.3.5
- Protects the device key, identity private keys, and group Sender Keys with macOS secure storage
- Encrypts cached chat history with account- and purpose-bound authenticated envelopes in a dedicated IndexedDB
- Keeps display plaintext in memory only and strips decrypted fields before persistence
- Migrates and removes legacy plaintext keys and chat caches from localStorage, sessionStorage, and IndexedDB
- Removes the former unencrypted media cache and safely discards corrupt or tampered cache data

### What's New in 2.3.1
- Added persistent refresh-token sessions and automatic access-token renewal to reduce unnecessary sign-ins when short-lived tokens expire
- Strengthened WebSocket authentication, heartbeat monitoring, and exponential-backoff reconnection, with active recovery after network and app lifecycle events
- Added missed-message synchronization after reconnect, including server-sequence deduplication and a persistent sync cursor
- Added a persistent outbound queue, client message IDs, and delivery acknowledgements so offline messages can be retried reliably

### What's New in 2.2.9
- Added persistent local caching for sticker-pack lists and contents, retaining cached stickers during server failures or offline sessions
- Added a dedicated media cache that reuses static, animated, and video stickers by stable `file_id`
- Stickers are cached before sending, with shared cached rendering in messages and the sticker picker
- Clearing offline data now also removes the sticker media cache

### What's New in 2.2.8
- Added quoted-message replies in private and group chats
- Migrated one-on-one voice and video calls to the LiveKit SFU
- Improved ringing, answering, reconnection, hang-up, and media-track lifecycle handling
- Added localized quoted-message text and improved push-permission guidance in Profile

### What's New in 1.1.8
- Improved the chat composer layout with automatic multiline expansion
- Refined the voice, emoji, attachment, and send-button interactions
- Fixed missing remote audio in one-on-one voice and video calls
- Fixed switching between normal, slow, and fast voice effects during a call
- Made contact information less intrusive over remote video

### What's New in 1.1.7
- Fixed unread counters increasing repeatedly when cached offline messages are replayed after reconnecting
- Unread counts and notifications now trigger only when a message is actually added to the local cache
- Fixed unread counters not clearing when opening a chat directly from a notification or deep link

### What's New in 1.1.6
- Fixed local and remote video attachment in one-on-one calls
- Fixed username searches while composing Chinese text with an IME
- Improved session handling so temporary network or authorization failures do not incorrectly clear local login state
- Added offline caching for contacts, groups, messages, Moments, and Timeline
- Added a cache cleanup option to Settings
