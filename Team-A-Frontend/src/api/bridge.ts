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
  }
};

export {};
