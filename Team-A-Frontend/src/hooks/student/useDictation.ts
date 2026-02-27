/**
 * useDictation — Continuous speech-to-text for answer dictation.
 *
 * Uses Web Speech API in continuous+interim mode to accumulate a transcript
 * buffer.  3-second silence triggers auto-stop and calls onDictationEnd.
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
  /** Silence timeout in ms before auto-stop. Default: 3000 */
  silenceTimeout?: number;
  lang?: string;
}

export interface UseDictationReturn {
  isRecording: boolean;
  interimText: string;
  finalText: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useDictation({
  onDictationEnd,
  silenceTimeout = 3000,
  lang = 'en-US',
}: UseDictationOptions): UseDictationReturn {
  const { playBeep } = useVoiceContext();
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');

  const recognitionRef = useRef<any>(null);
  const accumulatedRef = useRef('');
  const isActiveRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEndRef = useRef(onDictationEnd);
  onEndRef.current = onDictationEnd;

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stopInternal = useCallback((emitEnd: boolean) => {
    clearSilenceTimer();
    isActiveRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
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

  const stop = useCallback(() => stopInternal(true), [stopInternal]);
  const reset = useCallback(() => {
    stopInternal(false);
    accumulatedRef.current = '';
    setFinalText('');
    setInterimText('');
  }, [stopInternal]);

  const start = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn('SpeechRecognition not supported');
      return;
    }
    if (isActiveRef.current) return;

    isActiveRef.current = true;
    accumulatedRef.current = '';
    setFinalText('');
    setInterimText('');

    playBeep('dictation');

    const createRecognition = () => {
      if (!isActiveRef.current) return;
      const r = new SR();
      recognitionRef.current = r;

      r.continuous = true;
      r.interimResults = true;
      r.lang = lang;
      r.maxAlternatives = 1;

      r.onstart = () => {
        setIsRecording(true);
        // Reset silence timer on start
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          stopInternal(true);
        }, silenceTimeout);
      };

      r.onresult = (event: any) => {
        // Reset silence countdown on every speech detected
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          stopInternal(true);
        }, silenceTimeout);

        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            accumulatedRef.current += (accumulatedRef.current ? ' ' : '') + t.trim();
          } else {
            interim += t;
          }
        }
        setInterimText(interim);
        setFinalText(accumulatedRef.current);
      };

      r.onend = () => {
        setIsRecording(false);
        // Chrome ends recognition after ~60s; restart if still active
        if (isActiveRef.current) {
          setTimeout(createRecognition, 150);
        }
      };

      r.onerror = (e: any) => {
        if (e.error === 'no-speech') {
          // Treat as silence — will be handled by silence timer
          return;
        }
        if (e.error === 'aborted') return;
        console.error('Dictation error:', e.error);
      };

      try {
        r.start();
      } catch {}
    };

    createRecognition();
  }, [lang, silenceTimeout, stopInternal, playBeep]);

  useEffect(() => {
    return () => stopInternal(false);
  }, [stopInternal]);

  return { isRecording, interimText, finalText, start, stop, reset };
}
