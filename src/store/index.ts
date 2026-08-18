import { create } from 'zustand'
import { applyNativeProxy, clearNativeProxy } from '../api/proxy-bridge'
import { MEDIA_CACHE_NAME, readOfflineData, writeOfflineData } from '../utils/offlineCache'
import { hasNativeSecureStorage, openForAccount, sealForAccount } from '../api/secure-storage'
import { deleteSecureCache, readSecureCache, writeSecureCache } from '../utils/secureCacheDb'

// ── Message cache persistence helpers ──────────────────────────
const LEGACY_MSG_CACHE_KEY = 'pp_msg_cache'
const MSG_CACHE_VERSION = 2
const messageCacheKey = (account: string) => `pp_msg_cache:v2:${account}`

function storageSafeMessages(messages: Record<string, ChatMessage[]>): Record<string, ChatMessage[]> {
  const result: Record<string, ChatMessage[]> = {}
  for (const [chatId, msgs] of Object.entries(messages)) {
    // Defense in depth: display plaintext is memory-only even though the entire
    // resulting blob is also authenticated and encrypted by the native layer.
    result[chatId] = msgs.slice(-2000).map(({ decrypted: _plaintext, ...stored }) => stored)
  }
  return result
}

let _saveMsgTimer: ReturnType<typeof setTimeout> | null = null
function persistMessages(messages: Record<string, ChatMessage[]>) {
  if (_saveMsgTimer) clearTimeout(_saveMsgTimer)
  _saveMsgTimer = setTimeout(() => {
    const account = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null')?.id as string | undefined } catch { return undefined } })()
    if (!account || !hasNativeSecureStorage()) return
    const safe = storageSafeMessages(messages)
    void sealForAccount(account, 'message-cache', JSON.stringify({ _v: MSG_CACHE_VERSION, messages: safe }))
      .then(ciphertext => writeSecureCache(messageCacheKey(account), ciphertext))
      .catch(err => console.warn('[Store] Encrypted message cache write failed:', err))
  }, 500) // debounce 500ms
}

export async function hydrateEncryptedMessageCache(account: string): Promise<void> {
  if (!account || !hasNativeSecureStorage()) {
    localStorage.removeItem(LEGACY_MSG_CACHE_KEY)
    return
  }
  try {
    let messages: Record<string, ChatMessage[]> = {}
    let encrypted = await readSecureCache(messageCacheKey(account))
    // Import an intermediate v2 localStorage envelope if one was ever written.
    const localEnvelope = localStorage.getItem(messageCacheKey(account))
    if (!encrypted && localEnvelope) {
      encrypted = JSON.parse(localEnvelope).ciphertext
      await writeSecureCache(messageCacheKey(account), encrypted!)
    }
    localStorage.removeItem(messageCacheKey(account))
    if (encrypted) {
      const plaintext = await openForAccount(account, 'message-cache', encrypted)
      const parsed = JSON.parse(plaintext)
      if (parsed._v === MSG_CACHE_VERSION) messages = parsed.messages || {}
    } else {
      // One-time migration from the old plaintext cache. Plaintext display fields
      // are deliberately discarded before the encrypted replacement is written.
      const legacyRaw = localStorage.getItem(LEGACY_MSG_CACHE_KEY)
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw)
        const { _v: _legacyVersion, ...legacyMessages } = legacy
        messages = storageSafeMessages(legacyMessages)
        const ciphertext = await sealForAccount(account, 'message-cache', JSON.stringify({ _v: MSG_CACHE_VERSION, messages }))
        await writeSecureCache(messageCacheKey(account), ciphertext)
      }
    }
    localStorage.removeItem(LEGACY_MSG_CACHE_KEY)
    // Previous versions cached attachment bodies as unencrypted Web Cache data.
    if ('caches' in window) await caches.delete(MEDIA_CACHE_NAME)
    useStore.setState({ messages })
  } catch (err) {
    // Corrupt/tampered cache must never fall back to plaintext.
    console.warn('[Store] Encrypted message cache hydration failed; cache discarded:', err)
    await deleteSecureCache(messageCacheKey(account))
    localStorage.removeItem(messageCacheKey(account))
    localStorage.removeItem(LEGACY_MSG_CACHE_KEY)
    useStore.setState({ messages: {} })
  }
}

export function clearEncryptedMessageCache(account?: string): void {
  if (account) {
    localStorage.removeItem(messageCacheKey(account))
    void deleteSecureCache(messageCacheKey(account))
  }
  localStorage.removeItem(LEGACY_MSG_CACHE_KEY)
}

export interface User {
  id: string
  username: string
  nickname: string
  avatar?: string
  ik_pub?: string
  spk_pub?: string
  spk_sig?: string
  kem_pub?: string
}

export interface Friend {
  id: string
  username: string
  nickname: string
  avatar?: string
  is_online: boolean
  auto_delete: number
  ik_pub?: string
  kem_pub?: string
  remark?: string
}

export interface ChatMessage {
  id: string
  from: string
  to?: string
  group_id?: string
  from_nickname?: string
  from_avatar?: string
  msg_type: string
  ciphertext: string
  header?: string
  self_ciphertext?: string
  self_header?: string
  nonce?: string
  sender_key_version?: number
  ts: number
  read_at?: number
  offline?: boolean
  decrypted?: string
  client_msg_id?: string
  delivery_status?: 'queued' | 'sent' | 'failed'
  server_seq?: number
}

export interface Group {
  id: string
  name: string
  avatar?: string
  owner_id: string
  notice?: string
  auto_delete: number
  muted?: boolean
  encrypted?: boolean
  members?: GroupMember[]
}

export interface GroupMember {
  id: string
  username: string
  nickname: string
  avatar?: string
  role: string
  muted: boolean
}

export interface ProxyConfig {
  id: string
  name: string
  type: 'socks5' | 'http' | 'https'
  host: string
  port: string
  username: string
  password: string
}

export type SidebarView = 'chats' | 'contacts' | 'discover'

interface AppStore {
  // Server URL
  serverUrl: string
  setServerUrl: (url: string) => void

  // Proxy (list of up to 5, with one active)
  proxyList: ProxyConfig[]
  activeProxyId: string | null
  addProxy: (proxy: ProxyConfig) => void
  updateProxy: (proxy: ProxyConfig) => void
  removeProxy: (id: string) => void
  setActiveProxy: (id: string | null) => void

  // Auth
  token: string | null
  user: User | null
  setAuth: (token: string, user: User, refreshToken?: string) => void
  setToken: (token: string, refreshToken?: string) => void
  logout: () => void

  // Theme
  theme: 'dark' | 'light'
  toggleTheme: () => void

  // Language
  lang: string
  setLang: (lang: string) => void

  // Desktop layout
  activeChatId: string | null
  activeChatIsGroup: boolean
  sidebarView: SidebarView
  sidebarWidth: number
  mainView: 'chat' | 'profile' | 'userProfile' | 'groupInfo' | 'moments' | 'timeline' | 'privacy' | 'terms' | null
  mainViewId: string | null
  setActiveChat: (id: string | null, isGroup?: boolean) => void
  setSidebarView: (view: SidebarView) => void
  setSidebarWidth: (w: number) => void
  setMainView: (view: 'chat' | 'profile' | 'userProfile' | 'groupInfo' | 'moments' | 'timeline' | 'privacy' | 'terms' | null, id?: string | null) => void

  // Friends
  friends: Friend[]
  setFriends: (friends: Friend[]) => void
  updateFriendOnline: (id: string, online: boolean) => void

  // Groups
  groups: Group[]
  setGroups: (groups: Group[]) => void

  // Chat Messages (keyed by chatId)
  messages: Record<string, ChatMessage[]>
  /**
   * Adds a message if its server ID is not already cached.
   * Returns true only when the message was actually inserted.
   */
  addMessage: (chatId: string, msg: ChatMessage) => boolean
  updateMessage: (chatId: string, msgId: string, patch: Partial<ChatMessage>) => void
  setMessages: (chatId: string, msgs: ChatMessage[]) => void
  prependMessages: (chatId: string, msgs: ChatMessage[]) => void
  markMessagesRead: (msgIds: string[], ts: number) => void

  // Unread counts
  unread: Record<string, number>
  incrementUnread: (chatId: string) => void
  clearUnread: (chatId: string) => void

  // WS
  wsConnected: boolean
  setWsConnected: (v: boolean) => void

  // Blocked users
  blockedUsers: string[]
  setBlockedUsers: (users: string[]) => void
  addBlockedUser: (userId: string) => void
  removeBlockedUser: (userId: string) => void
  clearCachedContent: () => void
}

export const useStore = create<AppStore>((set, get) => ({
  // Server URL
  serverUrl: localStorage.getItem('serverUrl') || '',
  setServerUrl: (url) => {
    localStorage.setItem('serverUrl', url)
    set({ serverUrl: url })
    window.dispatchEvent(new Event('paperphone:network-changed'))
  },

  // Proxy list (up to 5) + active selection
  proxyList: (() => {
    // Migration: convert old single-proxy format to list
    const oldProxy = JSON.parse(localStorage.getItem('proxyConfig') || 'null')
    let list: ProxyConfig[] = JSON.parse(localStorage.getItem('proxyList') || '[]')
    if (oldProxy && oldProxy.host && list.length === 0) {
      const migrated: ProxyConfig = {
        id: Date.now().toString(),
        name: `${oldProxy.type.toUpperCase()} ${oldProxy.host}`,
        type: oldProxy.type, host: oldProxy.host, port: oldProxy.port,
        username: oldProxy.username || '', password: oldProxy.password || '',
      }
      list = [migrated]
      localStorage.setItem('proxyList', JSON.stringify(list))
      if (oldProxy.enabled) localStorage.setItem('activeProxyId', migrated.id)
      localStorage.removeItem('proxyConfig')
    }
    return list
  })(),
  activeProxyId: localStorage.getItem('activeProxyId') || null,
  addProxy: (proxy) => {
    const list = [...get().proxyList, proxy].slice(0, 5)
    localStorage.setItem('proxyList', JSON.stringify(list))
    set({ proxyList: list })
  },
  updateProxy: (proxy) => {
    const list = get().proxyList.map(p => p.id === proxy.id ? proxy : p)
    localStorage.setItem('proxyList', JSON.stringify(list))
    set({ proxyList: list })
    // Re-apply if this is the active proxy
    if (get().activeProxyId === proxy.id) {
      applyNativeProxy(proxy)
      window.dispatchEvent(new Event('paperphone:network-changed'))
    }
  },
  removeProxy: (id) => {
    const list = get().proxyList.filter(p => p.id !== id)
    localStorage.setItem('proxyList', JSON.stringify(list))
    // If removing the active proxy, deactivate
    if (get().activeProxyId === id) {
      localStorage.removeItem('activeProxyId')
      set({ proxyList: list, activeProxyId: null })
      clearNativeProxy()
    } else {
      set({ proxyList: list })
    }
  },
  setActiveProxy: (id) => {
    if (id) {
      localStorage.setItem('activeProxyId', id)
      set({ activeProxyId: id })
      const proxy = get().proxyList.find(p => p.id === id)
      if (proxy) applyNativeProxy(proxy)
      window.dispatchEvent(new Event('paperphone:network-changed'))
    } else {
      localStorage.removeItem('activeProxyId')
      set({ activeProxyId: null })
      clearNativeProxy()
      window.dispatchEvent(new Event('paperphone:network-changed'))
    }
  },

  // Auth
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  setAuth: (token, user, refreshToken) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    set({ token, user })
  },
  setToken: (token, refreshToken) => {
    localStorage.setItem('token', token)
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    set({ token })
  },
  logout: () => {
    const currentUserId = get().user?.id
    if (currentUserId) {
      localStorage.removeItem(`pp_sync_cursor:${currentUserId}`)
      localStorage.removeItem(`pp_outbox:${currentUserId}`)
    }
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    clearEncryptedMessageCache(currentUserId)
    set({ token: null, user: null, friends: [], groups: [], messages: {}, unread: {} })
  },

  // Theme
  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'light',
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
    set({ theme: next })
  },

  // Desktop layout
  activeChatId: null,
  activeChatIsGroup: false,
  sidebarView: 'chats',
  sidebarWidth: parseInt(localStorage.getItem('sidebarWidth') || '360', 10),
  mainView: null,
  mainViewId: null,
  setActiveChat: (id, isGroup = false) => {
    set({ activeChatId: id, activeChatIsGroup: isGroup, mainView: id ? 'chat' : null, mainViewId: id })
    if (id) {
      get().clearUnread(id)
    }
  },
  setSidebarView: (view) => set({ sidebarView: view }),
  setSidebarWidth: (w) => {
    localStorage.setItem('sidebarWidth', String(w))
    set({ sidebarWidth: w })
  },
  setMainView: (view, id = null) => set({ mainView: view, mainViewId: id, activeChatId: view === 'chat' ? id : get().activeChatId }),

  // Language
  lang: localStorage.getItem('lang') || 'zh',
  setLang: (lang) => {
    localStorage.setItem('lang', lang)
    set({ lang })
  },

  // Friends
  friends: readOfflineData<Friend[]>('friends', []),
  setFriends: (friends) => {
    writeOfflineData('friends', friends)
    set({ friends })
  },
  updateFriendOnline: (id, online) => set(s => {
    const friends = s.friends.map(f => f.id === id ? { ...f, is_online: online } : f)
    writeOfflineData('friends', friends)
    return { friends }
  }),

  // Groups
  groups: readOfflineData<Group[]>('groups', []),
  setGroups: (groups) => {
    writeOfflineData('groups', groups)
    set({ groups })
  },

  // Messages (initialized from localStorage cache)
  messages: {},
  addMessage: (chatId, msg) => {
    let inserted = false
    set(s => {
      const existing = s.messages[chatId] || []
      // Offline messages are replayed after every reconnect. Keep insertion
      // and its return value atomic so callers do not count a replay as new.
      if (msg.id && existing.some(m => m.id === msg.id)) {
        return s
      }
      const optimisticIndex = msg.client_msg_id
        ? existing.findIndex(m => m.client_msg_id === msg.client_msg_id)
        : -1
      if (optimisticIndex >= 0) {
        const reconciled = [...existing]
        reconciled[optimisticIndex] = { ...reconciled[optimisticIndex], ...msg, delivery_status: 'sent' }
        const updated = { ...s.messages, [chatId]: reconciled }
        persistMessages(updated)
        return { messages: updated }
      }
      const updated = {
        ...s.messages,
        [chatId]: [...existing, msg],
      }
      inserted = true
      persistMessages(updated)
      return { messages: updated }
    })
    return inserted
  },
  updateMessage: (chatId, msgId, patch) => set(s => {
    const msgs = s.messages[chatId]
    if (!msgs) return s
    const idx = msgs.findIndex(m => m.id === msgId)
    if (idx === -1) return s
    const newMsgs = [...msgs]
    newMsgs[idx] = { ...newMsgs[idx], ...patch }
    const updated = { ...s.messages, [chatId]: newMsgs }
    persistMessages(updated)
    return { messages: updated }
  }),
  setMessages: (chatId, msgs) => set(s => {
    const updated = { ...s.messages, [chatId]: msgs }
    persistMessages(updated)
    return { messages: updated }
  }),
  prependMessages: (chatId, msgs) => set(s => {
    const existing = s.messages[chatId] || []
    const existingIds = new Set(existing.filter(m => m.id).map(m => m.id))
    const deduped = msgs.filter(m => !m.id || !existingIds.has(m.id))
    const updated = {
      ...s.messages,
      [chatId]: [...deduped, ...existing],
    }
    persistMessages(updated)
    return { messages: updated }
  }),
  markMessagesRead: (msgIds, ts) => set(s => {
    const updated = { ...s.messages }
    for (const chatId of Object.keys(updated)) {
      const msgs = updated[chatId]
      if (msgs?.some(m => msgIds.includes(m.id))) {
        updated[chatId] = msgs.map(m => msgIds.includes(m.id) ? { ...m, read_at: ts } : m)
      }
    }
    persistMessages(updated)
    return { messages: updated }
  }),

  // Unread
  unread: {},
  incrementUnread: (chatId) => set(s => ({
    unread: { ...s.unread, [chatId]: (s.unread[chatId] || 0) + 1 }
  })),
  clearUnread: (chatId) => set(s => ({
    unread: { ...s.unread, [chatId]: 0 }
  })),

  // WS
  wsConnected: false,
  setWsConnected: (v) => set({ wsConnected: v }),

  // Blocked users
  blockedUsers: JSON.parse(localStorage.getItem('blockedUsers') || '[]'),
  setBlockedUsers: (users) => {
    localStorage.setItem('blockedUsers', JSON.stringify(users))
    set({ blockedUsers: users })
  },
  addBlockedUser: (userId) => {
    const list = [...new Set([...get().blockedUsers, userId])]
    localStorage.setItem('blockedUsers', JSON.stringify(list))
    set({ blockedUsers: list })
  },
  removeBlockedUser: (userId) => {
    const list = get().blockedUsers.filter(id => id !== userId)
    localStorage.setItem('blockedUsers', JSON.stringify(list))
    set({ blockedUsers: list })
  },
  clearCachedContent: () => set({ friends: [], groups: [], messages: {}, unread: {} }),
}))
