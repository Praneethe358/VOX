// Ollama/Llama (AI Formatting)

import axios from "axios";

interface OllamaGenerateResponse {
  response: string;
}

export async function formatWithLlama(input: string): Promise<string> {
  const baseUrl = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL ?? "llama3.2";

  const { data } = await axios.post<OllamaGenerateResponse>(
    `${baseUrl}/api/generate`,
    {
      model,
      prompt: input,
      stream: false,
    },
    {
      timeout: 30000,
    },
  );

  return data.response;
}
