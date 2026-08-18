import { useEffect } from 'react'
import { useStore } from '../store'
import { useSocket } from '../hooks/useSocket'
import { useAutoDeleteCleanup } from '../hooks/useAutoDeleteCleanup'
import Sidebar from './Sidebar'
import Chat from '../pages/Chat'
import Profile from '../pages/Profile'
import UserProfile from '../pages/UserProfile'
import GroupInfo from '../pages/GroupInfo'
import PrivacyPolicy from '../pages/PrivacyPolicy'
import TermsOfUse from '../pages/TermsOfUse'
import NotificationToast from './NotificationToast'
import { MessageCircle } from 'lucide-react'
import { useI18n } from '../hooks/useI18n'

function MainPanel() {
  const { t } = useI18n()
  const mainView = useStore(s => s.mainView)
  const mainViewId = useStore(s => s.mainViewId)
  const activeChatId = useStore(s => s.activeChatId)
  const activeChatIsGroup = useStore(s => s.activeChatIsGroup)

  // Chat view
  if (mainView === 'chat' && activeChatId) {
    return <Chat key={activeChatId} chatId={activeChatId} isGroup={activeChatIsGroup} />
  }

  // Profile view
  if (mainView === 'profile') {
    return <Profile />
  }

  // User profile view
  if (mainView === 'userProfile' && mainViewId) {
    return <UserProfile userId={mainViewId} />
  }

  // Group info view
  if (mainView === 'groupInfo' && mainViewId) {
    return <GroupInfo groupId={mainViewId} />
  }

  // Privacy policy view
  if (mainView === 'privacy') {
    return <PrivacyPolicy />
  }

  // Terms of use view
  if (mainView === 'terms') {
    return <TermsOfUse />
  }

  // Empty state — no chat selected
  return (
    <div className="main-empty">
      <div className="main-empty-icon">
        <MessageCircle size={36} strokeWidth={1.5} />
      </div>
      <div className="main-empty-text">PaperPhoneLite</div>
      <div className="main-empty-hint">
        {t('chats.empty_hint') || 'Select a chat to start messaging'}
      </div>
    </div>
  )
}

export default function DesktopLayout() {
  useSocket()
  useAutoDeleteCleanup()

  return (
    <>
      <div className="desktop-layout">
        <Sidebar />
        <main className="main-content">
          <MainPanel />
        </main>
      </div>
      <NotificationToast />
    </>
  )
}
