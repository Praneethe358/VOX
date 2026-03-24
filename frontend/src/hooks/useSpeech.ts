import { useCallback, useRef, useState } from "react";

const rawApiBase =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://localhost:3000/api";
const API_BASE = /\/api(?:\/|$)/.test(rawApiBase.replace(/\/+$/, ''))
  ? rawApiBase.replace(/\/+$/, '')
  : `${rawApiBase.replace(/\/+$/, '')}/api`;

export function useSpeech() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const resolveRef = useRef<((transcript: string) => void) | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });

        // Send to backend STT
        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          const res = await fetch(`${API_BASE}/ai/stt-command`, {
            method: "POST",
            body: form,
          });
          const data = await res.json().catch(() => ({ text: "" }));
          resolveRef.current?.(data.text ?? "");
        } catch {
          resolveRef.current?.("");
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("[useSpeech] Failed to start recording:", err);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      } else {
        resolve("");
      }
      setIsRecording(false);
    });
  }, []);

  const speak = useCallback(async (text: string) => {
    try {
      const res = await fetch(`${API_BASE}/ai/tts-speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, speed: 150, voice: "en-us" }),
      });
      if (!res.ok) {
        console.warn(`[useSpeech] TTS returned ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (err) {
      console.error("[useSpeech] TTS error:", err);
    }
  }, []);

  return { isRecording, startRecording, stopRecording, speak };
}
