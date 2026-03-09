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
  private ensureFfmpegOnPath(): void {
    const ffmpegBin = process.env.FFMPEG_BIN;
    if (!ffmpegBin) return;

    const ffmpegDir = path.dirname(ffmpegBin);
    const currentPath = process.env.PATH ?? "";
    if (!currentPath.toLowerCase().includes(ffmpegDir.toLowerCase())) {
      process.env.PATH = `${ffmpegDir};${currentPath}`;
    }
  }

  private async transcribeWithWhisper(audioBuffer: Buffer): Promise<SttResult> {
    this.ensureFfmpegOnPath();

    const whisperBin = process.env.WHISPER_BIN ?? "whisper";
    const whisperModel = process.env.WHISPER_MODEL_PATH ?? "base";

    console.log(`[STT] Using whisper binary: ${whisperBin}`);
    console.log(`[STT] Using model: ${whisperModel}`);
    console.log(`[STT] Audio buffer size: ${audioBuffer.length} bytes`);

    // Validate binary exists before attempting to spawn
    if (whisperBin !== "whisper") {
      try {
        await fs.access(whisperBin);
      } catch {
        throw new Error(`Whisper binary not found at: ${whisperBin}. Set WHISPER_BIN env var to the correct path.`);
      }
    }
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mindkraft-whisper-"));
    const rawInputPath = path.join(tempDir, "input_raw");
    const inputPath = path.join(tempDir, "output.wav");
    const outputJson = path.join(tempDir, "output.json");

    console.log(`[STT] Temp dir: ${tempDir}`);

    // Write the raw incoming audio (may be webm, wav, ogg, etc.)
    await fs.writeFile(rawInputPath, audioBuffer);

    // ── Convert to 16kHz mono WAV using ffmpeg (required for Whisper) ────────
    const ffmpegBin = process.env.FFMPEG_BIN ?? "ffmpeg";
    try {
      await new Promise<void>((resolve, reject) => {
        const ffArgs = [
          "-y",
          "-i", rawInputPath,
          "-ar", "16000",
          "-ac", "1",
          "-sample_fmt", "s16",
          "-f", "wav",
          inputPath,
        ];
        console.log(`[STT] Converting audio with ffmpeg:`, ffArgs.join(" "));
        const ff = spawn(ffmpegBin, ffArgs, { stdio: ["ignore", "pipe", "pipe"] });
        let ffStderr = "";
        ff.stderr.on("data", (c: Buffer) => { ffStderr += c.toString(); });
        ff.on("error", (err) => reject(new Error(`ffmpeg spawn failed: ${err.message}`)));
        ff.on("close", (code) => {
          if (code === 0) {
            console.log(`[STT] ffmpeg conversion succeeded`);
            resolve();
          } else {
            console.error(`[STT] ffmpeg exited with code ${code}: ${ffStderr.slice(-500)}`);
            reject(new Error(`ffmpeg conversion failed (code ${code})`));
          }
        });
      });
    } catch (ffErr) {
      console.error(`[STT] ffmpeg conversion error:`, (ffErr as Error).message);
      // Fallback: use the raw buffer as-is (in case it's already wav)
      await fs.copyFile(rawInputPath, inputPath);
      console.log(`[STT] Using raw audio as fallback (no conversion)`);
    }

    console.log(`[STT] Input audio for Whisper: ${inputPath}`);

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
    ];

    console.log(`[STT] Spawning whisper with args:`, args);

    const text = await new Promise<string>((resolve) => {
      const proc = spawn(whisperBin, args);
      let stderr = "";
      let stdout = "";

      proc.stdout.on("data", (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });

      proc.stderr.on("data", (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      proc.on("error", (err) => {
        console.error(`[STT] Failed to spawn Whisper process:`, err.message);
        resolve("");
      });

      proc.on("close", async (code) => {
        console.log(`[STT] Whisper exited with code ${code}`);
        if (stdout.trim()) console.log(`[STT] stdout: ${stdout.trim()}`);
        if (stderr.trim()) console.log(`[STT] stderr: ${stderr.trim()}`);

        if (code !== 0) {
          console.error(`[STT] Whisper exited with code ${code}${stderr.trim() ? `: ${stderr.trim()}` : ""}`);
          resolve("");
          return;
        }

        try {
          const raw = await fs.readFile(outputJson, "utf-8");
          const parsed = JSON.parse(raw) as { text?: string };
          console.log(`[STT] Transcribed text: ${(parsed.text ?? "").trim()}`);
          resolve((parsed.text ?? "").trim());
        } catch (readErr) {
          console.error(`[STT] Failed to read/parse output JSON:`, readErr);
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
    } catch (err) {
      console.error(`[STT] recognizeCommand failed:`, (err as Error).message);
      throw err;  // Let route handler return 500 so frontend knows it failed
    }
  }

  /**
   * Check that Whisper/ffmpeg binaries exist and warn if not. Called at
   * startup so users see clear instructions instead of mysterious 500s.  
   */
  async checkBins(): Promise<void> {
    const whisperBin = process.env.WHISPER_BIN ?? "whisper";
    try {
      await fs.access(whisperBin);
      console.log(`[STT] whisper binary found at: ${whisperBin}`);
    } catch {
      console.warn(
        `[STT] WARNING: whisper binary not found at "${whisperBin}". \n` +
          `  Speech‑to‑text will fail. Set WHISPER_BIN env var or install OpenAI whisper.\n` +
          `  See README for installation instructions.`,
      );
    }

    const ffmpegBin = process.env.FFMPEG_BIN;
    if (ffmpegBin) {
      try {
        await fs.access(ffmpegBin);
        console.log(`[STT] ffmpeg binary found at: ${ffmpegBin}`);
      } catch {
        console.warn(
          `[STT] WARNING: ffmpeg binary not found at "${ffmpegBin}". ` +
            `Whisper transcription may not work properly.`,
        );
      }
    }
  }

  async transcribeAnswer(audioBuffer: Buffer): Promise<SttResult> {
    try {
      return await this.transcribeWithWhisper(audioBuffer);
    } catch (err) {
      console.error(`[STT] transcribeAnswer failed:`, (err as Error).message);
      throw err;  // Let route handler return 500 so frontend knows it failed
    }
  }
}

export const speechService = new SpeechService();
