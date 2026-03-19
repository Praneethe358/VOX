/**
 * useDictation — Continuous speech-to-text for answer dictation.
 *
 * Uses browser-native SpeechRecognition for low-latency transcription.
 * A silence timeout (default: 10s) triggers auto-stop and calls onDictationEnd.
 *
 * Usage:
 *   const { isRecording, interimText, start, stop } = useDictation({
 *     onDictationEnd: (finalText) => { ... },
 *   });
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoiceContext } from '../../context/VoiceContext';

interface UseDictationOptions {
  /** Called when dictation ends (silence timeout or manual stop). */
  onDictationEnd: (finalTranscript: string) => void;
  /** Silence timeout in ms before auto-stop. Default: 10000 */
  silenceTimeout?: number;
  lang?: string;
}

export interface UseDictationReturn {
  isRecording: boolean;
  interimText: string;
  finalText: string;
  lastError: string | null;
  start: (initialText?: string) => void;
  stop: () => void;
  reset: () => void;
}

export function useDictation({
  onDictationEnd,
  silenceTimeout = 10000,
  lang = 'en-US',
}: UseDictationOptions): UseDictationReturn {
  const { playBeep, isSpeaking } = useVoiceContext();
  const isSpeakingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [lastError, setLastError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const accumulatedRef = useRef('');
  const isActiveRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEndRef = useRef(onDictationEnd);
  const stopRequestedRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  onEndRef.current = onDictationEnd;

  const getSR = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return SR ?? null;
  }, []);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const clearRestartTimer = () => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const stopInternal = useCallback((emitEnd: boolean) => {
    clearSilenceTimer();
    clearRestartTimer();
    stopRequestedRef.current = true;
    isActiveRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimText('');
    if (emitEnd) {
      const final = accumulatedRef.current.trim();
      setFinalText(final);
      onEndRef.current(final);
    }
  }, []);

  const armSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      console.log('[Dictation] Silence timeout reached');
      stopInternal(true);
    }, silenceTimeout);
  }, [silenceTimeout, stopInternal]);

  const stop = useCallback(() => stopInternal(true), [stopInternal]);
  const reset = useCallback(() => {
    stopInternal(false);
    accumulatedRef.current = '';
    setFinalText('');
    setInterimText('');
    setLastError(null);
  }, [stopInternal]);

  const start = useCallback((initialText = '') => {
    if (isActiveRef.current) return;

    const SR = getSR();
    if (!SR) {
      setLastError('Speech recognition is not supported in this browser.');
      playBeep('error');
      return;
    }

    stopRequestedRef.current = false;
    isActiveRef.current = true;
    setLastError(null);
    const seedText = initialText.trim();
    accumulatedRef.current = seedText;
    setFinalText(seedText);
    setInterimText('');
    setIsRecording(true);

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      if (!isActiveRef.current || isSpeakingRef.current) return;

      let newInterim = '';
      let newFinal = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = String(event.results[i][0]?.transcript ?? '').trim();
        if (!transcript) continue;
        if (event.results[i].isFinal) {
          newFinal += (newFinal ? ' ' : '') + transcript;
        } else {
          newInterim += (newInterim ? ' ' : '') + transcript;
        }
      }

      if (newFinal) {
        accumulatedRef.current += (accumulatedRef.current ? ' ' : '') + newFinal;
        setFinalText(accumulatedRef.current);
      }
      setInterimText(newInterim);

      if (newFinal || newInterim) {
        armSilenceTimer();
      }
    };

    recognition.onerror = (event: any) => {
      if (!isActiveRef.current) return;

      const errorCode = String(event?.error ?? 'unknown');
      if (errorCode === 'aborted' || errorCode === 'no-speech') {
        return;
      }

      if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
        setLastError('Microphone permission denied. Allow access and try again.');
        playBeep('error');
        stopInternal(false);
        return;
      }

      setLastError(`Speech recognition error: ${errorCode}`);
    };

    recognition.onend = () => {
      if (!isActiveRef.current || stopRequestedRef.current) {
        return;
      }

      clearRestartTimer();
      restartTimerRef.current = setTimeout(() => {
        if (!isActiveRef.current || stopRequestedRef.current) return;
        try {
          recognition.start();
        } catch {}
      }, 120);
    };

    try {
      recognition.start();
      playBeep('dictation');
      armSilenceTimer();
    } catch {
      setLastError('Unable to start speech recognition.');
      playBeep('error');
      stopInternal(false);
    }
  }, [armSilenceTimer, getSR, lang, playBeep, stopInternal]);

  // Keep isSpeakingRef in sync with TTS state
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  useEffect(() => {
    return () => stopInternal(false);
  }, [stopInternal]);

  return { isRecording, interimText, finalText, lastError, start, stop, reset };
}
