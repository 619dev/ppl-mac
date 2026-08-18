import { Capacitor, registerPlugin } from '@capacitor/core'
import type { ProxyConfig } from '../store'

/**
 * Bridge between the web-layer proxy config and native proxy implementations.
 *
 * Supports three environments:
 * 1. Electron desktop — uses session.setProxy() via IPC for system-level proxy
 * 2. Android native (Capacitor) — uses ProxyPlugin via AndroidX WebKit ProxyController
 * 3. Web browser — no-op (users should configure system/browser proxy)
 */

interface ProxyPluginInterface {
  applyProxy(opts: {
    type: string
    host: string
    port: string
    username: string
    password: string
  }): Promise<{ success: boolean; proxy?: string; fallback?: boolean; message?: string }>
  clearProxy(): Promise<{ success: boolean }>
}

const ProxyPlugin = registerPlugin<ProxyPluginInterface>('ProxyPlugin')

/**
 * Check if running inside Electron
 */
function isElectron(): boolean {
  return !!window.electronAPI?.isElectron
}

/**
 * Apply the proxy configuration on the current platform.
 *
 * - Electron: delegates to main process via IPC → session.setProxy()
 * - Android: delegates to ProxyPlugin via Capacitor
 * - Web: no-op
 */
export async function applyNativeProxy(config: ProxyConfig): Promise<void> {
  if (!config.host || !config.port) {
    await clearNativeProxy()
    return
  }

  // Electron desktop
  if (isElectron()) {
    try {
      await window.electronAPI!.applyProxy(config)
      console.log('[Proxy] Electron: Applied', config.type, config.host, config.port)
    } catch (err) {
      console.error('[Proxy] Electron: Failed to apply:', err)
    }
    return
  }

  // Android native (Capacitor)
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await ProxyPlugin.applyProxy({
        type: config.type,
        host: config.host,
        port: config.port,
        username: config.username || '',
        password: config.password || '',
      })
      console.log('[Proxy] Native: Applied:', result)
    } catch (err) {
      console.error('[Proxy] Native: Failed to apply:', err)
    }
    return
  }

  // Web: no-op
  console.log('[Proxy] Web: proxy config saved (system proxy required)')
}

/**
 * Clear all proxy settings on the current platform.
 */
export async function clearNativeProxy(): Promise<void> {
  // Electron desktop
  if (isElectron()) {
    try {
      await window.electronAPI!.clearProxy()
      console.log('[Proxy] Electron: Cleared')
    } catch (err) {
      console.error('[Proxy] Electron: Failed to clear:', err)
    }
    return
  }

  // Android native (Capacitor)
  if (Capacitor.isNativePlatform()) {
    try {
      await ProxyPlugin.clearProxy()
      console.log('[Proxy] Native: Cleared')
    } catch (err) {
      console.error('[Proxy] Native: Failed to clear:', err)
    }
    return
  }

  // Web: no-op
  console.log('[Proxy] Web: proxy config cleared')
}

/**
 * Test latency through the currently configured proxy by timing a HEAD request
 * to the server URL. Returns latency in milliseconds, or -1 on failure.
 *
 * On Electron and Android, once the proxy is applied, fetch() automatically
 * routes through it — no special handling needed.
 */
export async function testProxyLatency(serverUrl: string): Promise<number> {
  if (!serverUrl) return -1

  const start = performance.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout
    await fetch(`${serverUrl}/api/ping`, {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal,
    }).catch(() => {
      // /api/ping may 404, try base URL
      return fetch(serverUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      })
    })
    clearTimeout(timeout)
    return Math.round(performance.now() - start)
  } catch {
    return -1
  }
}
