import { spawn } from "child_process";

export class TtsService {
  speak(text: string): void {
    if (!text.trim()) return;
    const bin = process.env.ESPEAK_BIN ?? "espeak";
    spawn(bin, ["-v", "en-us", "-s", "140", text], { detached: true });
  }
}

export const ttsService = new TtsService();
