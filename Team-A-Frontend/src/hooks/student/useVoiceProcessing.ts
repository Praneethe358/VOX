/**
 * useTextToSpeech - Converts text to speech using eSpeak backend
 * useSpeechToText - Converts speech to text using Vosk/Whisper backend
 */

import { useState, useCallback, useRef } from 'react';
import { SpeechToTextResult } from '../../types/student/voice.types';
import apiService from '../../services/student/api.service';

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
  const [audioElement] = useState(() => new Audio());

  const speak = useCallback(async (text: string, language: string = 'en', rate: number = 1.0) => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await apiService.synthesizeSpeech(text, language, rate);

      if (response?.success && response?.data?.audioUrl) {
        audioElement.src = response.data.audioUrl;
        setIsSpeaking(true);
        await audioElement.play();
        audioElement.onended = () => setIsSpeaking(false);
      } else if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-US';
        utterance.rate = rate;

        utterance.onstart = () => {
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
        };

        utterance.onerror = (event) => {
          setError(`Speech error: ${event.error}`);
          setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
      }

      setIsLoading(false);
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  }, []);

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    audioElement.pause();
    setIsSpeaking(false);
  }, [audioElement]);

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
