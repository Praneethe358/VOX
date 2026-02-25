import fs from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";

interface SttResult {
  text: string;
  confidence: number;
}

export class SpeechService {
  private async transcribeWithWhisper(audioBuffer: Buffer): Promise<SttResult> {
    const whisperBin = process.env.WHISPER_BIN ?? "whisper";
    const whisperModel = process.env.WHISPER_MODEL_PATH ?? "base";
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mindkraft-whisper-"));
    const inputPath = path.join(tempDir, `${randomUUID()}.wav`);
    const outputBase = path.join(tempDir, "output");
    const outputJson = `${outputBase}.json`;

    await fs.writeFile(inputPath, audioBuffer);

    const args = [
      inputPath,
      "--model",
      whisperModel,
      "--language",
      "en",
      "--output_format",
      "json",
      "--output_dir",
      tempDir,
      "--output_file",
      "output",
    ];

    const text = await new Promise<string>((resolve) => {
      const proc = spawn(whisperBin, args);
      let stderr = "";

      proc.stderr.on("data", (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      proc.on("error", () => {
        resolve("");
      });

      proc.on("close", async (code) => {
        if (code !== 0) {
          if (stderr.trim()) {
            console.warn(`Whisper failed: ${stderr.trim()}`);
          }
          resolve("");
          return;
        }

        try {
          const raw = await fs.readFile(outputJson, "utf-8");
          const parsed = JSON.parse(raw) as { text?: string };
          resolve((parsed.text ?? "").trim());
        } catch {
          resolve("");
        }
      });
    });

    await fs.rm(tempDir, { recursive: true, force: true });

    if (!text) {
      return { text: "", confidence: 0 };
    }

    return { text, confidence: 1 };
  }

  async recognizeCommand(audioBuffer: Buffer): Promise<SttResult> {
    try {
      return await this.transcribeWithWhisper(audioBuffer);
    } catch {
      return { text: "", confidence: 0 };
    }
  }

  async transcribeAnswer(audioBuffer: Buffer): Promise<SttResult> {
    try {
      return await this.transcribeWithWhisper(audioBuffer);
    } catch {
      return { text: "", confidence: 0 };
    }
  }
}

export const speechService = new SpeechService();
