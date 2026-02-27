/**
 * useKioskMode - Manages fullscreen kiosk mode with security restrictions
 */

import { useState, useCallback, useEffect } from 'react';

interface UseKioskModeReturn {
  isKioskEnabled: boolean;
  isFullscreen: boolean;
  enableKiosk: () => Promise<void>;
  disableKiosk: () => void;
  error: string | null;
}

export function useKioskMode(): UseKioskModeReturn {
  const [isKioskEnabled, setIsKioskEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enableKiosk = useCallback(async () => {
    try {
      setError(null);

      // Request fullscreen
      const element = document.documentElement;
      const requestFullscreen = 
        element.requestFullscreen ||
        (element as any).webkitRequestFullscreen ||
        (element as any).mozRequestFullscreen ||
        (element as any).msRequestFullscreen;

      if (requestFullscreen) {
        await requestFullscreen();
        setIsFullscreen(true);
      }

      setIsKioskEnabled(true);

      // Block common shortcuts
      const handleKeyDown = (e: KeyboardEvent) => {
        // Block Alt+Tab
        if (e.altKey && e.key === 'Tab') {
          e.preventDefault();
        }
        // Block Windows key
        if (e.key === 'Meta' || e.key === 'Win') {
          e.preventDefault();
        }
        // Block Ctrl+Alt+Delete (F12 for DevTools)
        if (e.key === 'F12') {
          e.preventDefault();
        }
        // Block Ctrl+Shift+I (DevTools)
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
          e.preventDefault();
        }
        // Block Ctrl+Shift+C (Inspect)
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
          e.preventDefault();
        }
        // Block Escape (to prevent exiting fullscreen)
        if (e.key === 'Escape') {
          e.preventDefault();
        }
        // Block Ctrl+W (close tab)
        if (e.ctrlKey && e.key === 'w') {
          e.preventDefault();
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      // Disable right-click context menu
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
      };
      document.addEventListener('contextmenu', handleContextMenu);

      // Disable copy/paste
      const handleCopy = (e: ClipboardEvent) => {
        e.preventDefault();
      };
      const handlePaste = (e: ClipboardEvent) => {
        e.preventDefault();
      };
      const handleCut = (e: ClipboardEvent) => {
        e.preventDefault();
      };

      document.addEventListener('copy', handleCopy);
      document.addEventListener('paste', handlePaste);
      document.addEventListener('cut', handleCut);

      // Store cleanup functions
      (window as any)._kioskCleanup = () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('copy', handleCopy);
        document.removeEventListener('paste', handlePaste);
        document.removeEventListener('cut', handleCut);
      };

    } catch (err) {
      setError((err as Error).message);
      setIsKioskEnabled(false);
    }
  }, []);

  const disableKiosk = useCallback(() => {
    // Cleanup kiosk restrictions
    if ((window as any)._kioskCleanup) {
      (window as any)._kioskCleanup();
    }

    // Exit fullscreen
    if (document.fullscreenElement) {
      const exitFullscreen =
        document.exitFullscreen ||
        (document as any).webkitExitFullscreen ||
        (document as any).mozCancelFullscreen ||
        (document as any).msExitFullscreen;

      if (exitFullscreen) {
        exitFullscreen();
      }
    }

    setIsKioskEnabled(false);
    setIsFullscreen(false);
  }, []);

  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return {
    isKioskEnabled,
    isFullscreen,
    enableKiosk,
    disableKiosk,
    error,
  };
}
