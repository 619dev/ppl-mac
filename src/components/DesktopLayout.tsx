import { useEffect } from 'react'
import { useStore } from '../store'
import { useSocket } from '../hooks/useSocket'
import { useAutoDeleteCleanup } from '../hooks/useAutoDeleteCleanup'
import Sidebar from './Sidebar'
import Chat from '../pages/Chat'
import Profile from '../pages/Profile'
import UserProfile from '../pages/UserProfile'
import GroupInfo from '../pages/GroupInfo'
import Moments from '../pages/Moments'
import Timeline from '../pages/Timeline'
import PrivacyPolicy from '../pages/PrivacyPolicy'
import TermsOfUse from '../pages/TermsOfUse'
import CallOverlay from './CallOverlay'
import GroupCallOverlay from './GroupCallOverlay'
import CallKeepAwake from './CallKeepAwake'
import NotificationToast from './NotificationToast'
import { CallProvider } from '../contexts/CallContext'
import { GroupCallProvider } from '../contexts/GroupCallContext'
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

  // Moments view
  if (mainView === 'moments') {
    return <Moments />
  }

  // Timeline view
  if (mainView === 'timeline') {
    return <Timeline />
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
    <CallProvider>
      <GroupCallProvider>
        <CallKeepAwake />
        <div className="desktop-layout">
          <Sidebar />
          <main className="main-content">
            <MainPanel />
          </main>
        </div>
        <CallOverlay />
        <GroupCallOverlay />
        <NotificationToast />
      </GroupCallProvider>
    </CallProvider>
  )
}
