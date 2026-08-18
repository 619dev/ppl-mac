import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const isElectron = process.env.ELECTRON === 'true' || !!process.env.VITE_DEV_SERVER_URL

export default defineConfig({
  plugins: [
    react(),
    // Fix libsodium-wrappers-sumo broken ESM import
    {
      name: 'fix-libsodium-esm',
      resolveId(source, importer) {
        if (
          source === './libsodium-sumo.mjs' &&
          importer &&
          importer.includes('libsodium-wrappers-sumo')
        ) {
          // Redirect to the actual file in the libsodium-sumo package
          return path.resolve(
            __dirname,
            'node_modules/libsodium-sumo/dist/modules-sumo/libsodium-sumo.js'
          )
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Exclude libsodium from esbuild pre-bundling (the Vite plugin handles it)
  optimizeDeps: {
    exclude: ['libsodium-wrappers-sumo'],
  },
  // Desktop-only: always use relative paths for Electron file:// protocol
  base: './',
  build: {
    outDir: 'dist',
    // Ensure assets use relative paths for Electron file:// loading
    assetsDir: 'assets',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
})
