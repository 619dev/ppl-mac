import type { ProxyConfig } from './store'
import type { TorState } from './api/tor-bridge'

export interface ElectronAPI {
  // Platform info
  isElectron: boolean
  platform: 'darwin' | 'win32' | 'linux'

  // Proxy management
  getProxy: () => Promise<{ proxyList: ProxyConfig[]; activeProxyId: string | null }>
  setProxyList: (list: ProxyConfig[]) => Promise<void>
  setActiveProxy: (id: string | null) => Promise<void>
  applyProxy: (config: ProxyConfig) => Promise<void>
  clearProxy: () => Promise<void>
  getProxyInfo: () => Promise<string>
  torGetStatus: () => Promise<TorState>
  torStart: () => Promise<TorState>
  torStop: () => Promise<void>
  torOnStatusChange: (listener: (state: TorState) => void) => () => void
  secureStorageAvailable: () => Promise<boolean>
  secureStorageSeal: (account: string, purpose: string, plaintext: string) => Promise<string>
  secureStorageOpen: (account: string, purpose: string, ciphertext: string) => Promise<string>
  secureStorageSetSecret: (account: string, name: string, value: string) => Promise<void>
  secureStorageGetSecret: (account: string, name: string) => Promise<string | null>
  secureStorageDeleteSecret: (account: string, name: string) => Promise<void>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
