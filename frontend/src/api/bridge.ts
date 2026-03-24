/**
 * Bridge API — Platform abstraction layer for platform-specific features.
 * 
 * After PWA migration (March 2026), this layer bridges React components
 * to browser native APIs instead of Electron IPC.
 * 
 * Key Changes:
 * - enterKiosk(): Now uses HTML5 Fullscreen API instead of Electron
 * - exitKiosk(): Leverages Document.exitFullscreen()
 * - isDesktop(): Hardcoded to false (PWA runs in browser)
 * 
 * Related Documentation:
 * - See MIGRATION.md for full migration details
 * - See PreExamChecklist.tsx for kiosk entry point
 * - See ExamInterface.tsx for kiosk exit handling
 */

declare global {
  interface Window {
    api?: {
      sttStart?: () => Promise<void>;
      sttStop?: () => Promise<string>;
      ttsSpeak?: (text: string) => Promise<void>;
      kioskStatus?: () => Promise<boolean>;
    };
  }
}

export const bridge = {
  startStt: async () => {
    await window.api?.sttStart?.();
  },
  stopStt: async () => {
    return window.api?.sttStop?.() ?? "";
  },
  speak: async (text: string) => {
    await window.api?.ttsSpeak?.(text);
  },
  getKioskStatus: async () => {
    return (await window.api?.kioskStatus?.()) ?? false;
  },
  /**
   * Enter fullscreen kiosk mode using HTML5 Fullscreen API.
   * Replaces Electron's enterKiosk() IPC call.
   * 
   * Fullscreen prevents:
   * - Alt+Tab window switching
   * - F12 dev tools access
   * - Right-click context menu
   * - Task bar visibility
   * 
   * Called by: PreExamChecklist.tsx when exam begins
   * Exited by: ExamInterface.tsx on submission or cleanup
   */
  enterKiosk: async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  },

  /**
   * Exit fullscreen kiosk mode.
   * Releases fullscreen lock acquired by enterKiosk().
   * 
   * Safe to call even if not in fullscreen (checked internally).
   * Users can also press ESC to manually exit fullscreen.
   * 
   * Called by: ExamInterface.tsx cleanup and on exam submission
   */
  exitKiosk: async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  },

  /**
   * Platform detection (always false in PWA).
   * 
   * Previously returned true when running in Electron.
   * Now hardcoded to false since we're in a browser environment.
   * 
   * Kept for backward compatibility with existing conditional checks.
   */
  isDesktop: () => {
    return false;
  }
};

export {};
