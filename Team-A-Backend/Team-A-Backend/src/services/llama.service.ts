import axios from "axios";

export class LlamaService {
  async formatExamAnswer(rawText: string): Promise<string> {
    try {
      const baseUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";
      const model = process.env.OLLAMA_MODEL ?? "llama3:latest";

      const prompt =
        `You are formatting an exam answer.\n` +
        `Fix grammar and punctuation.\n` +
        `Do not add extra explanation.\n` +
        `Return only the corrected answer.\n\n` +
        `Raw:\n${rawText}`;

      const response = await axios.post(
        `${baseUrl}/api/generate`,
        { model, prompt, stream: false, options: { temperature: 0.2 } },
        { timeout: 30000 },
      );

      return (response.data.response as string) || rawText;
    } catch {
      // Per spec: if LLM fails → return raw text
      return rawText;
    }
  }
}

export const llamaService = new LlamaService();
