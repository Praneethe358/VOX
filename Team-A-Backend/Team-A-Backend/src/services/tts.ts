// AI: Text-to-speech reading questions

import { exec } from "child_process";

function escapeForDoubleQuotes(value: string): string {
  return value.replace(/"/g, '\\"');
}

export async function speakText(text: string): Promise<void> {
  if (!text.trim()) {
    return;
  }

  const executable = process.env.ESPEAK_BIN ?? "espeak";
  const escapedText = escapeForDoubleQuotes(text);
  const escapedExecutable = escapeForDoubleQuotes(executable);
  const command = `"${escapedExecutable}" "${escapedText}"`;

  await new Promise<void>((resolve, reject) => {
    exec(command, (error) => {
      if (error) {
        reject(
          new Error(
            `Failed to run eSpeak. Ensure eSpeak is installed and available in PATH. Original error: ${error.message}`,
          ),
        );
        return;
      }

      resolve();
    });
  });
}
