/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  // Add other env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * ► PWA Migration (March 2026): electronAPI removed
 * Previously defined Window.electronAPI for Electron IPC bridge.
 * Removed as part of transition from Electron to PWA.
 * All platform features now use browser native APIs.
 * See: src/api/bridge.ts for browser API implementations
 */
