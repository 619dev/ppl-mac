import { useEffect, useState } from 'react'
import { hydrateEncryptedMessageCache, useStore } from './store'
import { ensureIdentityKeys } from './crypto/identity'
import { hydrateSenderKeys } from './crypto/groupCrypto'
import { handlePresentationAppState, hydratePresentationCrypto, isPresentationUnlocked, presentationCiphertextForPlaintext } from './crypto/presentationCrypto'
import Login from './pages/Login'
import DesktopLayout from './components/DesktopLayout'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfUse from './pages/TermsOfUse'

export default function App() {
  const token = useStore(s => s.token)
  const user = useStore(s => s.user)
  const theme = useStore(s => s.theme)
  const [hydratedAccount, setHydratedAccount] = useState<string | null>(null)
  const [secureHydrationError, setSecureHydrationError] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Restore OS-protected keys and authenticated cache before mounting chats.
  useEffect(() => {
    let cancelled = false
    if (!token || !user?.id) {
      setHydratedAccount(null)
      setSecureHydrationError(null)
      return
    }
    setSecureHydrationError(null)
    Promise.all([
      ensureIdentityKeys(user.id),
      hydrateSenderKeys(user.id),
      hydratePresentationCrypto(user.id),
      hydrateEncryptedMessageCache(user.id),
    ]).then(([keys]) => {
      if (!keys) throw new Error('Identity keys are unavailable')
      if (!cancelled) setHydratedAccount(user.id)
    }).catch(err => {
      console.error('[App] Secure state hydration failed:', err)
      if (!cancelled) {
        setHydratedAccount(null)
        setSecureHydrationError(err instanceof Error ? err.message : String(err))
      }
    })
    return () => { cancelled = true }
  }, [token, user?.id])

  useEffect(() => {
    const onVisibility = () => handlePresentationAppState(document.visibilityState === 'visible')
    const onPresentationState = () => {
      if (isPresentationUnlocked()) return
      const messages = useStore.getState().messages
      useStore.setState({ messages: Object.fromEntries(Object.entries(messages).map(([chatId, items]) => [
        chatId, items.map(({ decrypted, ...message }) => ({ ...message, ...(presentationCiphertextForPlaintext(decrypted) ? { decrypted: presentationCiphertextForPlaintext(decrypted) } : {}) })),
      ])) })
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('paperphone:presentation-state-changed', onPresentationState)
    let removeNative: (() => void) | undefined
    import('@capacitor/app').then(({ App: CapApp }) => CapApp.addListener('appStateChange', ({ isActive }) => handlePresentationAppState(isActive)))
      .then(handle => { removeNative = () => void handle.remove() }).catch(() => {})
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('paperphone:presentation-state-changed', onPresentationState)
      removeNative?.()
    }
  }, [])

  // No auth → Login page
  if (!token) {
    return <Login />
  }

  // Authenticated → Desktop layout
  if (hydratedAccount === user?.id) return <DesktopLayout />
  if (secureHydrationError) {
    return <div className="empty-state">
      <div>安全密钥加载失败，请关闭并重新打开应用。</div>
      {import.meta.env.DEV && <div style={{ marginTop: 12, padding: '0 20px', fontSize: 12, wordBreak: 'break-word' }}>{secureHydrationError}</div>}
    </div>
  }
  return null
}
