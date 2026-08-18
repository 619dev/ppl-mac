import { get, post, put } from '../api/http'
import { clearAllSenderKeys } from './groupCrypto'
import { getKeys, loadFromIndexedDB, setKeys, type KeyBundle } from './keystore'
import { generateKeyPair, generateSignKeyPair, initSodium, signMessage } from './ratchet'

async function generateIdentityKeys(): Promise<KeyBundle> {
  const sodium = await initSodium()
  const ikPair = await generateKeyPair()
  const spkPair = await generateKeyPair()
  const signPair = await generateSignKeyPair()
  const spkSig = await signMessage(sodium.from_base64(spkPair.publicKey), signPair.privateKey)
  const opks: KeyBundle['opks'] = []
  for (let keyId = 0; keyId < 20; keyId++) {
    const opk = await generateKeyPair()
    opks.push({ key_id: keyId, pub: opk.publicKey, priv: opk.privateKey })
  }
  return {
    ik_pub: ikPair.publicKey, ik_priv: ikPair.privateKey,
    spk_pub: spkPair.publicKey, spk_priv: spkPair.privateKey,
    spk_sig: spkSig,
    sign_pub: signPair.publicKey, sign_priv: signPair.privateKey,
    opks,
  }
}

const pendingIdentityLoads = new Map<string, Promise<KeyBundle>>()

/** Restores identity keys, or provisions a replacement identity on a new install. */
export async function ensureIdentityKeys(accountId: string): Promise<KeyBundle> {
  const pending = pendingIdentityLoads.get(accountId)
  if (pending) return pending

  const load = ensureIdentityKeysOnce(accountId)
  pendingIdentityLoads.set(accountId, load)
  try {
    return await load
  } finally {
    if (pendingIdentityLoads.get(accountId) === load) pendingIdentityLoads.delete(accountId)
  }
}

async function ensureIdentityKeysOnce(accountId: string): Promise<KeyBundle> {
  const existing = getKeys() || await loadFromIndexedDB(accountId)
  if (existing) {
    await synchronizeIdentityPublicKeys(existing)
    return existing
  }

  const keys = await generateIdentityKeys()
  await setKeys(keys, accountId)
  try {
    await put('/api/users/keys', {
      ik_pub: keys.ik_pub,
      spk_pub: keys.spk_pub,
      spk_sig: keys.spk_sig,
      kem_pub: keys.sign_pub,
      prekeys: keys.opks.map(key => ({ key_id: key.key_id, opk_pub: key.pub })),
    })
    await post('/api/users/reset-sender-keys', {})
    clearAllSenderKeys()
    console.log('[Identity] New identity keys generated, sender keys reset')
  } catch (error) {
    console.warn('[Identity] Identity created locally; server sync will be retried after login:', error)
  }
  return keys
}

/**
 * The private identity key is device-local, so the matching public key stored
 * by the server must follow it. A previous install/device can otherwise leave
 * the server advertising a stale ik_pub, making every new incoming message
 * impossible to decrypt on this device.
 */
async function synchronizeIdentityPublicKeys(keys: KeyBundle): Promise<void> {
  try {
    const me = await get('/api/users/me')
    if (me?.ik_pub === keys.ik_pub) return

    console.warn('[Identity] Server identity key is stale; publishing the local public key')
    await put('/api/users/keys', {
      ik_pub: keys.ik_pub,
      spk_pub: keys.spk_pub,
      spk_sig: keys.spk_sig,
      kem_pub: keys.sign_pub,
      prekeys: keys.opks.map(key => ({ key_id: key.key_id, opk_pub: key.pub })),
    })
    await post('/api/users/reset-sender-keys', {})
    clearAllSenderKeys()
  } catch (error) {
    // Restoring the local private key must not make an offline startup fail.
    // The next authenticated startup will retry the consistency check.
    console.warn('[Identity] Public-key consistency check will be retried:', error)
  }
}
