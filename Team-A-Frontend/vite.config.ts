import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * ► PWA Migration (March 2026): Vite configuration for Progressive Web App
 * 
 * Previously: Desktop app built with Electron wrapper
 * Now: Standards-compliant PWA with:
 * - Service worker for offline support
 * - Web manifest for installability  
 * - Native Web Speech API for voice recognition
 * - HTML5 Fullscreen API for kiosk mode
 * 
 * See MIGRATION.md for full architectural changes
 */

export default defineConfig({
  plugins: [
    react(),
    // ► VitePWA: Adds service worker and manifest generation
    // registerType: 'autoUpdate' - Automatically updates cached assets
    // manifest.display: 'standalone' - App runs without browser UI
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Vox',
        short_name: 'Vox',
        description: 'Voice-first exam platform',
        theme_color: '#0b1220',
        background_color: '#f5f7fb',
        display: 'standalone',
        start_url: '/',
        scope: '/',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
