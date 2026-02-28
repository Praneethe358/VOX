/**
 * useTextToSpeech - Converts text to speech using eSpeak backend
 * useSpeechToText - Converts speech to text using Vosk/Whisper backend
 */

import { useState, useCallback, useRef } from 'react';
import { SpeechToTextResult } from '../../types/student/voice.types';
import apiService from '../../services/student/api.service';

const TTS_API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'http://localhost:3000/api';

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
  speak: (text: string, language?: string, rate?: number) => Promise<void>;
  stop: () => void;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const speak = useCallback(async (text: string, language: string = 'en', rate: number = 1.0) => {
    try {
      setError(null);
      setIsLoading(true);

      // Map rate (0.5-2.0) to espeak speed (80-300 wpm)
      const speed = Math.round(80 + (rate - 0.5) * (300 - 80) / (2.0 - 0.5));
      const voice = language === 'hi' ? 'hi' : language === 'mr' ? 'mr' : 'en-us';

      const abortController = new AbortController();
      abortRef.current = abortController;

      const response = await fetch(`${TTS_API_URL}/ai/tts-speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speed, voice }),
        signal: abortController.signal,
      });

      if (!response.ok) throw new Error(`TTS API returned ${response.status}`);

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setIsSpeaking(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setError('Audio playback failed');
        setIsSpeaking(false);
      };

      setIsSpeaking(true);
      setIsLoading(false);
      await audio.play();
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError((err as Error).message);
      }
      setIsLoading(false);
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  return {
    isSpeaking,
    isLoading,
    error,
    speak,
    stop,
  };
}

/**
 * useSpeechToText - Converts speech to text using Vosk/Whisper backend
 */

interface UseSpeechToTextReturn {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
}

export function useSpeechToText(): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');
      setConfidence(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await sendToBackend(audioBlob);
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const sendToBackend = useCallback(async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);

      const response = await apiService.convertSpeechToText(audioBlob, 'en');
      const result: SpeechToTextResult = {
        text: response?.text || '',
        confidence: response?.confidence ?? 0,
        isFinal: true,
      };

      setTranscript(result.text);
      setConfidence(result.confidence);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const stopListening = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    setIsListening(false);
  }, []);

  return {
    isListening,
    isProcessing,
    transcript,
    confidence,
    error,
    startListening,
    stopListening,
  };
}
