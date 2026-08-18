import { app, BrowserWindow, ipcMain, session, shell, nativeImage, safeStorage } from 'electron'
import path from 'path'
import Store from 'electron-store'
import { EmbeddedTorManager, type TorState } from './tor-manager'

// ── Types ──────────────────────────────────────────────────────
interface ProxyConfig {
  id: string
  name: string
  type: 'socks5' | 'http' | 'https'
  host: string
  port: string
  username: string
  password: string
}

interface StoreSchema {
  proxyList: ProxyConfig[]
  activeProxyId: string | null
  windowBounds: { x?: number; y?: number; width: number; height: number }
  secureSecrets: Record<string, string>
  torWebTunnelBridge?: string
}

// ── Persistent store ──────────────────────────────────────────
const store = new Store<StoreSchema>({
  defaults: {
    proxyList: [],
    activeProxyId: null,
    windowBounds: { width: 1024, height: 768 },
    secureSecrets: {},
  },
}) as any  // electron-store@10 types are complex; cast to any for .get/.set

let mainWindow: BrowserWindow | null = null
const embeddedTor = new EmbeddedTorManager(store)

// ── Proxy helpers ──────────────────────────────────────────────
function buildProxyRules(config: ProxyConfig): string {
  const auth = config.username
    ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@`
    : ''
  return `${config.type}://${auth}${config.host}:${config.port}`
}

async function applyProxy(config: ProxyConfig | null): Promise<void> {
  if (!config || !config.host || !config.port) {
    await session.defaultSession.setProxy({ mode: 'direct' })
    console.log('[Proxy] Cleared — direct connection')
    return
  }

  const proxyRules = buildProxyRules(config)
  await session.defaultSession.setProxy({
    proxyRules,
    proxyBypassRules: '<local>,localhost,127.0.0.1',
  })
  console.log(`[Proxy] Applied: ${config.type}://${config.host}:${config.port}`)
}

async function restoreProxy(): Promise<void> {
  const activeId: string | null = store.get('activeProxyId')
  if (!activeId) return
  const list: ProxyConfig[] = store.get('proxyList') || []
  const active = list.find((p: ProxyConfig) => p.id === activeId)
  if (active) {
    await applyProxy(active)
  }
}

// ── IPC handlers ──────────────────────────────────────────────
function setupIPC(): void {
  const encryptEnvelope = (account: string, purpose: string, plaintext: string): string => {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('OS secure storage is unavailable')
    return safeStorage.encryptString(JSON.stringify({ version: 1, account, purpose, plaintext })).toString('base64')
  }
  const decryptEnvelope = (account: string, purpose: string, ciphertext: string): string => {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('OS secure storage is unavailable')
    const envelope = JSON.parse(safeStorage.decryptString(Buffer.from(ciphertext, 'base64')))
    if (envelope?.version !== 1 || envelope?.account !== account || envelope?.purpose !== purpose || typeof envelope?.plaintext !== 'string') {
      throw new Error('Secure storage envelope does not match this account and purpose')
    }
    return envelope.plaintext
  }
  ipcMain.handle('electron-secure-storage-available', () => safeStorage.isEncryptionAvailable())
  ipcMain.handle('electron-secure-storage-seal', (_event, account: string, purpose: string, plaintext: string) => encryptEnvelope(account, purpose, plaintext))
  ipcMain.handle('electron-secure-storage-open', (_event, account: string, purpose: string, ciphertext: string) => decryptEnvelope(account, purpose, ciphertext))
  ipcMain.handle('electron-secure-storage-set-secret', (_event, account: string, name: string, value: string) => {
    const secrets = { ...(store.get('secureSecrets') || {}) }
    secrets[Buffer.from(`${account}\0${name}`).toString('base64')] = encryptEnvelope(account, `secret:${name}`, value)
    store.set('secureSecrets', secrets)
  })
  ipcMain.handle('electron-secure-storage-get-secret', (_event, account: string, name: string) => {
    const ciphertext = (store.get('secureSecrets') || {})[Buffer.from(`${account}\0${name}`).toString('base64')]
    return ciphertext ? decryptEnvelope(account, `secret:${name}`, ciphertext) : null
  })
  ipcMain.handle('electron-secure-storage-delete-secret', (_event, account: string, name: string) => {
    const secrets = { ...(store.get('secureSecrets') || {}) }
    delete secrets[Buffer.from(`${account}\0${name}`).toString('base64')]
    store.set('secureSecrets', secrets)
  })

  ipcMain.handle('electron-tor-status', () => embeddedTor.getState())
  ipcMain.handle('electron-tor-start', () => embeddedTor.start())
  ipcMain.handle('electron-tor-stop', () => embeddedTor.stop())
  embeddedTor.onState((state: TorState) => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send('electron-tor-status-change', state)
    }
  })

  // Get proxy list and active ID
  ipcMain.handle('electron-get-proxy', () => {
    return {
      proxyList: store.get('proxyList') || [],
      activeProxyId: store.get('activeProxyId') || null,
    }
  })

  // Set / update proxy list
  ipcMain.handle('electron-set-proxy-list', (_event: any, list: ProxyConfig[]) => {
    store.set('proxyList', list)
  })

  // Activate a specific proxy by ID
  ipcMain.handle('electron-set-active-proxy', async (_event: any, id: string | null) => {
    store.set('activeProxyId', id)
    if (id) {
      const list: ProxyConfig[] = store.get('proxyList') || []
      const proxy = list.find((p: ProxyConfig) => p.id === id)
      if (proxy) await applyProxy(proxy)
    } else {
      await applyProxy(null)
    }
  })

  // Apply a proxy config directly (used when updating an active proxy)
  ipcMain.handle('electron-apply-proxy', async (_event: any, config: ProxyConfig) => {
    await applyProxy(config)
  })

  // Clear proxy
  ipcMain.handle('electron-clear-proxy', async () => {
    store.set('activeProxyId', null)
    await applyProxy(null)
  })

  // Get resolved proxy info for debugging
  ipcMain.handle('electron-get-proxy-info', async () => {
    const proxy = await session.defaultSession.resolveProxy('https://example.com')
    return proxy
  })
}

// ── Window ────────────────────────────────────────────────────
function createWindow(): void {
  const bounds = store.get('windowBounds') as StoreSchema['windowBounds']

  // Try to load the app icon
  let icon: typeof nativeImage.prototype | undefined
  try {
    // In development, icon is in public/icons/
    // In production, it's bundled via electron-builder's build resources
    const iconPaths = [
      path.join(__dirname, '../../public/icons/icon-512.png'),
      path.join(__dirname, '../../build/icon.png'),
    ]
    for (const iconPath of iconPaths) {
      try {
        const img = nativeImage.createFromPath(iconPath)
        if (!img.isEmpty()) {
          icon = img
          break
        }
      } catch { /* try next */ }
    }
  } catch {
    // Icon not found, use default
  }

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 375,
    minHeight: 600,
    title: 'PaperPhoneLite',
    icon: icon as any,
    titleBarStyle: 'default',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  })

  // Show window when ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Save window bounds on resize/move
  const saveBounds = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const b = mainWindow.getBounds()
      store.set('windowBounds', b)
    }
  }
  mainWindow.on('resize', saveBounds)
  mainWindow.on('move', saveBounds)

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url)
    return { action: 'deny' as const }
  })

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    // Production: load the built index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ── App lifecycle ─────────────────────────────────────────────
app.whenReady().then(async () => {
  setupIPC()
  createWindow()
  void embeddedTor.start().catch(error => console.error('[Tor] Automatic startup failed:', error))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  void embeddedTor.stop()
})
