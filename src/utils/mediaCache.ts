import { normalizeFileUrl } from '../api/http'

export const MEDIA_CACHE_NAME = 'paperphone-media-v3'
const pending = new Map<string, Promise<Blob>>()
const updates = new Set<Promise<Blob>>()
const refreshed = new Set<string>()
let cacheGeneration = 0
const MEDIA_DB = 'PaperPhoneMediaCache'
const MEDIA_STORE = 'media'

function mediaDbRequest<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(MEDIA_DB, 1)
    open.onupgradeneeded = () => open.result.createObjectStore(MEDIA_STORE)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction(MEDIA_STORE, mode)
      const request = operation(tx.objectStore(MEDIA_STORE))
      tx.oncomplete = () => { db.close(); resolve(request.result) }
      tx.onabort = () => { db.close(); reject(tx.error) }
    }
  })
}

export async function clearMediaCache(): Promise<void> {
  cacheGeneration++
  refreshed.clear()
  const jobs = [...pending.values(), ...updates]
  pending.clear()
  await Promise.allSettled(jobs)
  if (window.location.protocol === 'file:') {
    await mediaDbRequest('readwrite', store => store.clear())
    return
  }
  if ('caches' in window) await caches.delete(MEDIA_CACHE_NAME)
}
window.addEventListener?.('online', () => refreshed.clear())

export function mediaCacheAccount(): string {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')?.id || 'anonymous'
  } catch {
    return 'anonymous'
  }
}

/** Cache original bytes, including encrypted attachments, never decrypted chat data. */
export async function cachedMediaBlob(raw: string, download?: () => Promise<Blob>): Promise<Blob> {
  const url = new URL(normalizeFileUrl(raw), window.location.href || window.location.origin)
  url.hash = ''
  const account = mediaCacheAccount()
  const token = localStorage.getItem('token')
  const serverUrl = localStorage.getItem('serverUrl') || import.meta.env.VITE_API_URL || window.location.origin
  const key = new Request(`${url.href}${url.search ? '&' : '?'}__pp_account=${encodeURIComponent(account)}`)
  const id = key.url
  const generation = cacheGeneration
  const useIndexedDb = window.location.protocol === 'file:'
  const existing = pending.get(id)
  if (existing) return existing
  const task = (async () => {
    let cache: Cache | undefined
    let cached: Blob | undefined
    try {
      if (useIndexedDb) {
        cached = await mediaDbRequest('readonly', store => store.get(id))
      } else {
        cache = await caches.open(MEDIA_CACHE_NAME)
        cached = await (await cache.match(key))?.blob()
      }
    } catch { /* Storage unavailable. */ }
    const fetchBlob = async () => {
      if (mediaCacheAccount() !== account) throw new Error('Media account changed')
      if (download) return download()
      const base = new URL(serverUrl, window.location.href || window.location.origin)
      const response = await fetch(url.href, {
        headers: url.origin === base.origin && url.pathname.startsWith('/api/files/') && token
          ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!response.ok) throw new Error(`Media download failed: ${response.status}`)
      return response.blob()
    }
    const update = async () => {
      const blob = await fetchBlob()
      if (generation !== cacheGeneration || mediaCacheAccount() !== account) return blob
      try {
        if (useIndexedDb) {
          await mediaDbRequest('readwrite', store => store.put(blob, id))
        } else {
          await cache?.put(key, new Response(blob, { headers: { 'Content-Type': blob.type } }))
        }
      } catch { /* Quota failure must not prevent display. */ }
      if (generation !== cacheGeneration) return blob
      refreshed.add(id)
      window.dispatchEvent?.(new CustomEvent('pp-media-updated', { detail: { url: url.href, account, blob } }))
      return blob
    }
    if (cached) {
      // Revalidate once per session/reconnect. Navigation itself never downloads again.
      if (!refreshed.has(id)) {
        refreshed.add(id)
        const refresh = update()
        updates.add(refresh)
        void refresh.catch(() => {
          if (generation === cacheGeneration) refreshed.delete(id)
        }).finally(() => updates.delete(refresh))
      }
      return cached
    }
    return update()
  })()
  pending.set(id, task)
  try { return await task } finally { if (pending.get(id) === task) pending.delete(id) }
}
