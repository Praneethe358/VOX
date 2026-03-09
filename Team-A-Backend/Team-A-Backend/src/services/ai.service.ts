import axios from "axios";
import { spawn } from "child_process";
import { speechService } from "./speech.service";

export class AIService {
  async recognizeCommand(audioBuffer: Buffer): Promise<string> {
    const result = await speechService.recognizeCommand(audioBuffer);
    return result.text;
  }

  speak(text: string): void {
    spawn("espeak", ["-v", "en-us", "-s", "140", text]);
  }

  async formatAnswer(rawText: string): Promise<string> {
    const ollamaUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";
    const model = process.env.OLLAMA_MODEL ?? "llama3:latest";

    const response = await axios.post(`${ollamaUrl}/api/generate`, {
      model,
      prompt: `Fix exam answer grammar/punctuation:\n\nRaw: "${rawText}"\n\nFormatted:`,
      stream: false,
    });

    return response.data.response as string;
  }
}

export const aiService = new AIService();
