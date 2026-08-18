import { deleteSecureSecret, getSecureSecret, hasNativeSecureStorage, setSecureSecret } from '../api/secure-storage'

const LEGACY_DB_NAME = 'PaperPhoneKeys'
const LEGACY_STORE_NAME = 'keys'
const LEGACY_MEM_KEY = '__pp_keys'
const SECRET_NAME = 'identity-keys-v1'

export interface KeyBundle {
  ik_pub: string
  ik_priv: string
  spk_pub: string
  spk_priv: string
  spk_sig: string
  sign_pub: string
  sign_priv: string
  opks: Array<{ key_id: number; pub: string; priv: string }>
}

let memKeys: KeyBundle | null = null
let memAccount: string | null = null

function parseKeyBundle(raw: string): KeyBundle | null {
  try {
    const keys = JSON.parse(raw) as Partial<KeyBundle>
    if (!keys || typeof keys.ik_pub !== 'string' || typeof keys.ik_priv !== 'string' ||
        typeof keys.spk_pub !== 'string' || typeof keys.spk_priv !== 'string' ||
        typeof keys.sign_pub !== 'string' || typeof keys.sign_priv !== 'string' ||
        !Array.isArray(keys.opks)) return null
    return keys as KeyBundle
  } catch {
    return null
  }
}

function currentAccount(explicit?: string): string | null {
  if (explicit) return explicit
  try { return JSON.parse(localStorage.getItem('user') || 'null')?.id || null } catch { return null }
}

export function getKeys(): KeyBundle | null {
  const account = currentAccount()
  return account && memAccount === account ? memKeys : null
}

export async function setKeys(keys: KeyBundle, accountId?: string): Promise<void> {
  memKeys = keys
  const account = currentAccount(accountId)
  memAccount = account
  if (account && hasNativeSecureStorage()) {
    await setSecureSecret(account, SECRET_NAME, JSON.stringify(keys))
  }
  removeLegacyBrowserCopies()
  await clearLegacyIndexedDB()
}

export function clearKeys(accountId?: string): void {
  memKeys = null
  memAccount = null
  const account = currentAccount(accountId)
  if (account) void deleteSecureSecret(account, SECRET_NAME).catch(() => {})
  removeLegacyBrowserCopies()
}

/**
 * Loads identity keys from the iOS Keychain. The legacy function name is kept
 * temporarily to avoid a risky broad call-site migration.
 */
export async function loadFromIndexedDB(accountId?: string): Promise<KeyBundle | null> {
  const account = currentAccount(accountId)
  if (memKeys && memAccount === account) return memKeys
  memKeys = null
  memAccount = account

  if (account && hasNativeSecureStorage()) {
    const secure = await getSecureSecret(account, SECRET_NAME)
    if (secure) {
      memKeys = parseKeyBundle(secure)
      if (memKeys) {
        removeLegacyBrowserCopies()
        await clearLegacyIndexedDB()
        return memKeys
      }
      // Recover from a partial value left by an interrupted migration.
      await deleteSecureSecret(account, SECRET_NAME)
    }
  }

  // One-time upgrade: import the previous plaintext copies, secure them in
  // Keychain, and then erase all browser-storage copies.
  const legacy = await readLegacyKeys()
  if (legacy) {
    memKeys = legacy
    if (account && hasNativeSecureStorage()) {
      await setSecureSecret(account, SECRET_NAME, JSON.stringify(legacy))
    }
  }
  removeLegacyBrowserCopies()
  await clearLegacyIndexedDB()
  return memKeys
}

/** Removes usable private keys from JavaScript memory without deleting Keychain data. */
export function lockKeysInMemory(): void {
  memKeys = null
  memAccount = null
}

function removeLegacyBrowserCopies(): void {
  try { localStorage.removeItem(LEGACY_MEM_KEY) } catch {}
  try { sessionStorage.removeItem(LEGACY_MEM_KEY) } catch {}
}

async function readLegacyKeys(): Promise<KeyBundle | null> {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const raw = storage.getItem(LEGACY_MEM_KEY)
      if (raw) return parseKeyBundle(raw)
    } catch {}
  }
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(LEGACY_DB_NAME, 1)
      req.onsuccess = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(LEGACY_STORE_NAME)) { db.close(); resolve(null); return }
        const get = db.transaction(LEGACY_STORE_NAME, 'readonly').objectStore(LEGACY_STORE_NAME).get('bundle')
        get.onsuccess = () => { db.close(); resolve(get.result || null) }
        get.onerror = () => { db.close(); resolve(null) }
      }
      req.onerror = () => resolve(null)
    } catch { resolve(null) }
  })
}

async function clearLegacyIndexedDB(): Promise<void> {
  return new Promise(resolve => {
    try {
      const req = indexedDB.deleteDatabase(LEGACY_DB_NAME)
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    } catch { resolve() }
  })
}
