import { useEffect, useState, useCallback, useRef } from 'react'
import { get, post } from '../api/http'
import { useStore, Friend, Group, SidebarView } from '../store'
import { useI18n } from '../hooks/useI18n'
import { MessageCircle, Users, User, Search, UserPlus, X } from 'lucide-react'

/* ── Chat List (embedded in sidebar) ─────────────────────────── */
function ChatList() {
  const { t } = useI18n()
  const friends = useStore(s => s.friends)
  const groups = useStore(s => s.groups)
  const messages = useStore(s => s.messages)
  const unread = useStore(s => s.unread)
  const activeChatId = useStore(s => s.activeChatId)
  const setActiveChat = useStore(s => s.setActiveChat)
  const [search, setSearch] = useState('')

  const chatList = [
    ...friends.map(f => ({
      id: f.id,
      name: f.nickname || f.username,
      avatar: f.avatar,
      isOnline: f.is_online,
      isGroup: false,
      lastMsg: messages[f.id]?.at(-1),
      unreadCount: unread[f.id] || 0,
    })),
    ...groups.map(g => ({
      id: g.id,
      name: g.name,
      avatar: g.avatar,
      isOnline: false,
      isGroup: true,
      lastMsg: messages[g.id]?.at(-1),
      unreadCount: unread[g.id] || 0,
    })),
  ].filter(c => {
    if (!search) return true
    return c.name.toLowerCase().includes(search.toLowerCase())
  }).sort((a, b) => {
    const tsA = a.lastMsg?.ts || 0
    const tsB = b.lastMsg?.ts || 0
    return tsB - tsA
  })

  const formatTime = (ts?: number) => {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const getPreview = (msg?: any) => {
    if (!msg) return ''
    switch (msg.msg_type) {
      case 'image': return t('chats.image')
      case 'file': return t('chats.file')
      case 'voice': return t('chats.voice')
      case 'video': return t('chats.video')
      case 'sticker': return t('chats.sticker')
      default: return msg.decrypted || msg.ciphertext?.substring(0, 30) || ''
    }
  }

  return (
    <>
      <div className="sidebar-search">
        <input
          type="text"
          placeholder={t('chats.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="sidebar-body">
        {chatList.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <div className="icon"><MessageCircle size={32} strokeWidth={1.5} /></div>
            <div style={{ fontSize: 13 }}>{t('chats.empty')}</div>
          </div>
        ) : (
          chatList.map(chat => (
            <div
              key={chat.id}
              className={`list-item ${activeChatId === chat.id ? 'active' : ''}`}
              onClick={() => setActiveChat(chat.id, chat.isGroup)}
            >
              <div className="avatar" style={{ position: 'relative' }}>
                {chat.avatar ? <img src={chat.avatar} alt="" /> : (chat.isGroup ? <Users size={20} /> : chat.name[0]?.toUpperCase())}
                {chat.isOnline && <span className="online-dot" />}
              </div>
              <div className="list-content">
                <div className="name">{chat.name}</div>
                <div className="preview">{getPreview(chat.lastMsg)}</div>
              </div>
              <div className="list-meta">
                <span className="time">{formatTime(chat.lastMsg?.ts)}</span>
                {chat.unreadCount > 0 && (
                  <span className="badge" style={{ position: 'static' }}>
                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}

/* ── Sidebar Component ───────────────────────────────────────── */
export default function Sidebar() {
  const { t } = useI18n()
  const user = useStore(s => s.user)
  const sidebarView = useStore(s => s.sidebarView)
  const setSidebarView = useStore(s => s.setSidebarView)
  const sidebarWidth = useStore(s => s.sidebarWidth)
  const setSidebarWidth = useStore(s => s.setSidebarWidth)
  const setMainView = useStore(s => s.setMainView)
  const unread = useStore(s => s.unread)
  const setFriends = useStore(s => s.setFriends)
  const setGroups = useStore(s => s.setGroups)

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0)

  // Fetch friends & groups on mount
  useEffect(() => {
    get<Friend[]>('/api/friends').then(setFriends).catch(() => {})
    get<Group[]>('/api/groups').then(setGroups).catch(() => {})
  }, [])

  /* ── Drag resize logic ─── */
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(sidebarWidth)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    startX.current = e.clientX
    startWidth.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarWidth])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = e.clientX - startX.current
      const newWidth = Math.max(280, Math.min(480, startWidth.current + delta))
      setSidebarWidth(newWidth)
    }
    const onMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const navItems: { key: SidebarView; icon: typeof MessageCircle; label: string; badge?: number }[] = [
    { key: 'chats', icon: MessageCircle, label: t('tab.chats'), badge: totalUnread },
    { key: 'contacts', icon: Users, label: t('tab.contacts') },
  ]

  return (
    <aside className="sidebar" style={{ width: sidebarWidth }}>
      {/* Header */}
      <div className="sidebar-header">
        <div
          className="sidebar-user-avatar"
          onClick={() => setMainView('profile')}
          title={user?.nickname || user?.username || ''}
        >
          {user?.avatar
            ? <img src={user.avatar} alt="" />
            : (user?.nickname || user?.username || 'U')[0]?.toUpperCase()
          }
        </div>
        <span className="sidebar-title">PaperPhoneLite</span>
      </div>

      {/* Content based on sidebarView */}
      {sidebarView === 'chats' && <ChatList />}
      {sidebarView === 'contacts' && <ContactsInSidebar />}

      {/* Bottom Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.key}
            className={`sidebar-nav-item ${sidebarView === item.key ? 'active' : ''}`}
            onClick={() => setSidebarView(item.key)}
          >
            <span className="nav-icon"><item.icon size={20} /></span>
            <span>{item.label}</span>
            {(item.badge || 0) > 0 && (
              <span className="badge">{(item.badge || 0) > 99 ? '99+' : item.badge}</span>
            )}
          </button>
        ))}
        <button
          className={`sidebar-nav-item`}
          onClick={() => setMainView('profile')}
        >
          <span className="nav-icon"><User size={20} /></span>
          <span>{t('tab.profile')}</span>
        </button>
      </nav>

      {/* Resize Handle */}
      <div
        className={`sidebar-resize-handle ${isDragging.current ? 'dragging' : ''}`}
        onMouseDown={onMouseDown}
      />
    </aside>
  )
}

/* ── Placeholder: Contacts in sidebar ──────────────────────── */
function ContactsInSidebar() {
  const { t } = useI18n()
  const friends = useStore(s => s.friends)
  const groups = useStore(s => s.groups)
  const setActiveChat = useStore(s => s.setActiveChat)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [userQuery, setUserQuery] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const filteredFriends = friends.filter(f => {
    if (!search) return true
    const name = f.nickname || f.username
    const query = search.toLowerCase()
    return name.toLowerCase().includes(query) || f.username.toLowerCase().includes(query)
  })
  const filteredGroups = groups.filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()))

  const searchUsers = async () => {
    const query = userQuery.trim()
    if (!query || searching) return
    setSearching(true)
    try {
      const results = await get<any[]>(`/api/users/search?q=${encodeURIComponent(query)}`)
      const friendIds = new Set(friends.map(friend => friend.id))
      setSearchResults(results.filter(user => !friendIds.has(user.id)))
    } catch (error: any) {
      alert(error.message || t('common.error'))
    } finally {
      setSearching(false)
    }
  }

  const sendFriendRequest = async (friendId: string) => {
    try {
      await post('/api/friends/request', {
        friend_id: friendId,
        message: requestMessage.trim() || null,
      })
      setSentIds(previous => new Set(previous).add(friendId))
      setRequestMessage('')
      alert(t('contacts.request_sent'))
    } catch (error: any) {
      alert(error.message || t('common.error'))
    }
  }

  const closeAdd = () => {
    setShowAdd(false)
    setUserQuery('')
    setRequestMessage('')
    setSearchResults([])
  }

  return (
    <>
      <div className="sidebar-search" style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder={t('common.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          className="sidebar-action-button"
          title={t('contacts.add')}
          aria-label={t('contacts.add')}
          onClick={() => showAdd ? closeAdd() : setShowAdd(true)}
        >
          {showAdd ? <X size={17} /> : <UserPlus size={17} />}
        </button>
      </div>
      {showAdd && (
        <div className="sidebar-add-friend">
          <div className="sidebar-add-search">
            <input
              value={userQuery}
              placeholder={t('contacts.search_user')}
              autoFocus
              onChange={event => setUserQuery(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && searchUsers()}
            />
            <button className="btn btn-primary btn-sm" disabled={!userQuery.trim() || searching} onClick={searchUsers}>
              <Search size={15} />
            </button>
          </div>
          {searchResults.length > 0 && (
            <textarea
              className="input"
              value={requestMessage}
              maxLength={512}
              rows={2}
              placeholder={t('contacts.request_message_hint')}
              onChange={event => setRequestMessage(event.target.value)}
            />
          )}
          {searchResults.map(user => {
            const sent = sentIds.has(user.id)
            return (
              <div className="sidebar-search-result" key={user.id}>
                <div className="avatar avatar-sm">
                  {user.avatar ? <img src={user.avatar} alt="" /> : (user.nickname || user.username)?.[0]?.toUpperCase()}
                </div>
                <div className="list-content">
                  <div className="name">{user.nickname || user.username}</div>
                  <div className="preview">@{user.username}</div>
                </div>
                <button className="btn btn-primary btn-sm" disabled={sent} onClick={() => sendFriendRequest(user.id)}>
                  {sent ? '✓' : t('contacts.add_friend')}
                </button>
              </div>
            )
          })}
        </div>
      )}
      <div className="sidebar-body">
        {filteredFriends.length > 0 && <div className="section-title">{t('contacts.friends')}</div>}
        {filteredFriends.map(f => (
          <div
            key={f.id}
            className="list-item"
            onClick={() => setActiveChat(f.id, false)}
          >
            <div className="avatar" style={{ position: 'relative' }}>
              {f.avatar ? <img src={f.avatar} alt="" /> : (f.nickname || f.username)[0]?.toUpperCase()}
              {f.is_online && <span className="online-dot" />}
            </div>
            <div className="list-content">
              <div className="name">{f.nickname || f.username}</div>
              <div className="preview">{f.is_online ? t('chats.online') || 'Online' : ''}</div>
            </div>
          </div>
        ))}
        {filteredGroups.length > 0 && <div className="section-title">{t('contacts.groups')}</div>}
        {filteredGroups.map(group => (
          <div
            key={group.id}
            className="list-item"
            onClick={() => setActiveChat(group.id, true)}
          >
            <div className="avatar">
              {group.avatar ? <img src={group.avatar} alt="" /> : <Users size={20} />}
            </div>
            <div className="list-content">
              <div className="name">{group.name}</div>
              <div className="preview">
                {group.members?.length ? `${group.members.length} ${t('group.members_count')}` : t('contacts.groups')}
              </div>
            </div>
          </div>
        ))}
        {filteredFriends.length === 0 && filteredGroups.length === 0 && (
          <div className="empty-state" style={{ padding: '32px 16px' }}>{t('contacts.empty')}</div>
        )}
      </div>
    </>
  )
}
