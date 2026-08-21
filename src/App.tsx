import { useEffect, useState } from 'react'
import { hydrateEncryptedMessageCache, useStore } from './store'
import { ensureIdentityKeys, syncIdentityKeysWithServer } from './crypto/identity'
import { hydrateSenderKeys } from './crypto/groupCrypto'
import { getPresentationSettings, handlePresentationAppState, hydratePresentationCrypto, isPresentationUnlocked, presentationCiphertextForPlaintext, unlockPresentationCrypto } from './crypto/presentationCrypto'
import Login from './pages/Login'
import DesktopLayout from './components/DesktopLayout'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfUse from './pages/TermsOfUse'
import { useI18n } from './hooks/useI18n'

export default function App() {
  const token = useStore(s => s.token)
  const user = useStore(s => s.user)
  const theme = useStore(s => s.theme)
  const [hydratedAccount, setHydratedAccount] = useState<string | null>(null)
  const [secureHydrationError, setSecureHydrationError] = useState<string | null>(null)
  const [showPresentationUnlock, setShowPresentationUnlock] = useState(false)
  const [presentationPassword, setPresentationPassword] = useState('')
  const [presentationUnlockError, setPresentationUnlockError] = useState('')
  const [presentationUnlockBusy, setPresentationUnlockBusy] = useState(false)
  const { t } = useI18n()

  const syncPresentationUnlockPrompt = () => {
    const shouldPrompt = Boolean(useStore.getState().token && useStore.getState().user?.id)
      && getPresentationSettings().enabled
      && !isPresentationUnlocked()
    setShowPresentationUnlock(shouldPrompt)
    if (!shouldPrompt) {
      setPresentationPassword('')
      setPresentationUnlockError('')
    }
  }

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
      if (!cancelled) {
        syncPresentationUnlockPrompt()
        setHydratedAccount(user.id)
      }
      void syncIdentityKeysWithServer(user.id).catch(error => {
        console.warn('[Identity] Initial server reconciliation deferred:', error)
      })
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
    if (!token || !user?.id) return
    const reconcile = () => void syncIdentityKeysWithServer(user.id).catch(error => {
      console.warn('[Identity] Network recovery reconciliation failed:', error)
    })
    window.addEventListener('paperphone:network-changed', reconcile)
    window.addEventListener('online', reconcile)
    return () => {
      window.removeEventListener('paperphone:network-changed', reconcile)
      window.removeEventListener('online', reconcile)
    }
  }, [token, user?.id])

  useEffect(() => {
    const onVisibility = () => handlePresentationAppState(document.visibilityState === 'visible')
    const onPresentationState = () => {
      syncPresentationUnlockPrompt()
      if (!isPresentationUnlocked()) {
        const messages = useStore.getState().messages
        useStore.setState({ messages: Object.fromEntries(Object.entries(messages).map(([chatId, items]) => [
          chatId, items.map(({ decrypted, ...message }) => ({ ...message, ...(presentationCiphertextForPlaintext(decrypted) ? { decrypted: presentationCiphertextForPlaintext(decrypted) } : {}) })),
        ])) })
      }
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

  const unlockPresentationAtStartup = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!presentationPassword || presentationUnlockBusy) return
    setPresentationUnlockBusy(true)
    setPresentationUnlockError('')
    try {
      if (await unlockPresentationCrypto(presentationPassword)) {
        setShowPresentationUnlock(false)
        setPresentationPassword('')
      } else {
        setPresentationUnlockError(t('chat.presentation_startup_wrong_password'))
      }
    } finally {
      setPresentationUnlockBusy(false)
    }
  }

  const cancelPresentationUnlock = () => {
    setShowPresentationUnlock(false)
    setPresentationPassword('')
    setPresentationUnlockError('')
  }

  const presentationUnlockModal = showPresentationUnlock ? (
    <div className="modal-overlay" role="presentation">
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="presentation-startup-title" onSubmit={unlockPresentationAtStartup}>
        <h2 id="presentation-startup-title" style={{ fontSize: 17, fontWeight: 600, marginBottom: 16 }}>{t('profile.message_privacy')}</h2>
        <div className="input-group" style={{ marginBottom: 12 }}>
          <label htmlFor="presentation-startup-password">{t('chat.presentation_startup_password_prompt')}</label>
          <input className="input" id="presentation-startup-password" type="password" autoComplete="current-password" autoFocus value={presentationPassword}
            onChange={event => { setPresentationPassword(event.target.value); if (presentationUnlockError) setPresentationUnlockError('') }} />
        </div>
        {presentationUnlockError && <div role="alert" style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{presentationUnlockError}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-full" onClick={cancelPresentationUnlock} disabled={presentationUnlockBusy}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary btn-full" disabled={!presentationPassword || presentationUnlockBusy}>
            {presentationUnlockBusy ? t('common.loading') : t('common.confirm')}
          </button>
        </div>
      </form>
    </div>
  ) : null

  // No auth → Login page
  if (!token) {
    return <Login />
  }

  // Authenticated → Desktop layout
  if (hydratedAccount === user?.id) return <><DesktopLayout />{presentationUnlockModal}</>
  if (secureHydrationError) {
    return <div className="empty-state">
      <div>安全密钥加载失败，请关闭并重新打开应用。</div>
      {import.meta.env.DEV && <div style={{ marginTop: 12, padding: '0 20px', fontSize: 12, wordBreak: 'break-word' }}>{secureHydrationError}</div>}
    </div>
  }
  return null
}
