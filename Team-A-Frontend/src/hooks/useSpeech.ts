import { useCallback, useState } from "react";
import { bridge } from "../api/bridge";

export function useSpeech() {
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(async () => {
    setIsRecording(true);
    await bridge.startStt();
  }, []);

  const stopRecording = useCallback(async () => {
    const transcript = await bridge.stopStt();
    setIsRecording(false);
    return transcript;
  }, []);

  const speak = useCallback(async (text: string) => {
    await bridge.speak(text);
  }, []);

  return { isRecording, startRecording, stopRecording, speak };
}
