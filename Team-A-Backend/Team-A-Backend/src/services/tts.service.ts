import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";

export interface TtsSynthOptions {
  /** Words per minute (default 150) */
  speed?: number;
  /** espeak-ng voice name, e.g. "en-us" */
  voice?: string;
  /** Pitch adjustment 0-99 (default 50) */
  pitch?: number;
}

export class TtsService {
  private get bin(): string {
    return (
      process.env.ESPEAK_BIN ??
      process.env.ESPEAK_NG_BIN ??
      "C:\\Program Files\\eSpeak NG\\espeak-ng.exe"
    );
  }

  /** Fire-and-forget: play on server speakers (legacy). */
  speak(text: string): void {
    if (!text.trim()) return;
    spawn(this.bin, ["-v", "en-us", "-s", "140", text], { detached: true });
  }

  /**
   * Synthesize text → WAV buffer via espeak-ng.
   * Returns the raw WAV bytes that can be streamed to the client.
   */
  async synthesizeToWav(
    text: string,
    opts: TtsSynthOptions = {},
  ): Promise<Buffer> {
    const { speed = 150, voice = "en-us", pitch = 50 } = opts;
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "mindkraft-tts-"),
    );
    const wavPath = path.join(tempDir, `${randomUUID()}.wav`);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(this.bin, [
        "-v",
        voice,
        "-s",
        String(speed),
        "-p",
        String(pitch),
        "-w",
        wavPath,
        "--",
        text,
      ]);

      let stderr = "";
      proc.stderr.on("data", (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      proc.on("error", (err) =>
        reject(new Error(`espeak-ng spawn error: ${err.message}`)),
      );

      proc.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(`espeak-ng exited with code ${code}: ${stderr.trim()}`),
          );
        } else {
          resolve();
        }
      });
    });

    const wavBuffer = await fs.readFile(wavPath);
    // Cleanup temp files
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    return wavBuffer;
  }
}

export const ttsService = new TtsService();
