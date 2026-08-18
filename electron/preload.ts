import { contextBridge, ipcRenderer } from 'electron'

interface ProxyConfig {
  id: string
  name: string
  type: 'socks5' | 'http' | 'https'
  host: string
  port: string
  username: string
  password: string
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  isElectron: true,
  platform: process.platform as 'darwin' | 'win32' | 'linux',

  // Proxy management
  getProxy: () => ipcRenderer.invoke('electron-get-proxy'),
  setProxyList: (list: ProxyConfig[]) => ipcRenderer.invoke('electron-set-proxy-list', list),
  setActiveProxy: (id: string | null) => ipcRenderer.invoke('electron-set-active-proxy', id),
  applyProxy: (config: ProxyConfig) => ipcRenderer.invoke('electron-apply-proxy', config),
  clearProxy: () => ipcRenderer.invoke('electron-clear-proxy'),
  getProxyInfo: () => ipcRenderer.invoke('electron-get-proxy-info'),
  torGetStatus: () => ipcRenderer.invoke('electron-tor-status'),
  torStart: () => ipcRenderer.invoke('electron-tor-start'),
  torStop: () => ipcRenderer.invoke('electron-tor-stop'),
  torOnStatusChange: (listener: (state: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: unknown) => listener(state)
    ipcRenderer.on('electron-tor-status-change', handler)
    return () => ipcRenderer.removeListener('electron-tor-status-change', handler)
  },
  secureStorageAvailable: () => ipcRenderer.invoke('electron-secure-storage-available'),
  secureStorageSeal: (account: string, purpose: string, plaintext: string) => ipcRenderer.invoke('electron-secure-storage-seal', account, purpose, plaintext),
  secureStorageOpen: (account: string, purpose: string, ciphertext: string) => ipcRenderer.invoke('electron-secure-storage-open', account, purpose, ciphertext),
  secureStorageSetSecret: (account: string, name: string, value: string) => ipcRenderer.invoke('electron-secure-storage-set-secret', account, name, value),
  secureStorageGetSecret: (account: string, name: string) => ipcRenderer.invoke('electron-secure-storage-get-secret', account, name),
  secureStorageDeleteSecret: (account: string, name: string) => ipcRenderer.invoke('electron-secure-storage-delete-secret', account, name),
})
