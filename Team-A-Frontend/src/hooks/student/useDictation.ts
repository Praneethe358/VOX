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
  lastError: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useDictation({
  onDictationEnd,
  silenceTimeout = 3000,
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
    const bootstrap = async () => {
    console.log('[Dictation] Bootstrapping...');
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn('[Dictation] SpeechRecognition not supported');
      setLastError('Speech recognition is not supported in this browser. Use Chrome/Edge on desktop.');
      return;
    }
    if (isActiveRef.current) {
      console.log('[Dictation] Already active, skipping bootstrap');
      return;
    }

    try {
      console.log('[Dictation] Requesting microphone permission...');
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[Dictation] Microphone permission granted');
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err) {
      console.error('[Dictation] Microphone permission denied:', err);
      setLastError('Microphone permission denied. Allow mic access and try dictation again.');
      playBeep('error');
      return;
    }

    isActiveRef.current = true;
    setLastError(null);
    accumulatedRef.current = '';
    setFinalText('');
    setInterimText('');

    playBeep('dictation');

    const createRecognition = () => {
      if (!isActiveRef.current) {
        console.log('[Dictation] Not active, stopping createRecognition loop');
        return;
      }

      // Wait for TTS to finish before starting recognition
      if (isSpeakingRef.current) {
        console.log('[Dictation] TTS is speaking, delaying recognition start...');
        setTimeout(createRecognition, 200);
        return;
      }

      console.log('[Dictation] Creating new SpeechRecognition instance');
      const r = new SR();
      recognitionRef.current = r;

      r.continuous = true;
      r.interimResults = true;
      r.lang = lang;
      r.maxAlternatives = 1;

      r.onstart = () => {
        console.log('[Dictation] SpeechRecognition started');
        setIsRecording(true);
        // Reset silence timer on start
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          console.log('[Dictation] Silence timeout reached');
          stopInternal(true);
        }, silenceTimeout);
      };

      r.onresult = (event: any) => {
        console.log('[Dictation] SpeechRecognition result received');
        // Reset silence countdown on every speech detected
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          console.log('[Dictation] Silence timeout reached');
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
        console.log('[Dictation] SpeechRecognition ended');
        setIsRecording(false);
        // Chrome ends recognition after ~60s; restart if still active
        if (isActiveRef.current) {
          console.log('[Dictation] Auto-restarting dictation...');
          setTimeout(createRecognition, 150);
        }
      };

      r.onerror = (e: any) => {
        console.error('[Dictation] SpeechRecognition error:', e.error);
        if (e.error === 'no-speech') {
          // Treat as silence — will be handled by silence timer
          return;
        }
        if (e.error === 'aborted') return;
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          setLastError('Microphone access blocked during dictation. Enable mic and retry.');
          isActiveRef.current = false;
          setIsRecording(false);
          return;
        }
        if (e.error === 'audio-capture') {
          setLastError('No microphone detected for dictation.');
        } else if (e.error === 'network') {
          setLastError('Network issue during speech recognition.');
        } else {
          setLastError('Dictation error. Please retry.');
        }
      };

      try {
        r.start();
      } catch (err) {
        console.error('[Dictation] Error starting SpeechRecognition:', err);
      }
    };

    createRecognition();
    };
    void bootstrap();
  }, [lang, silenceTimeout, stopInternal, playBeep]);

  // Keep isSpeakingRef in sync with TTS state
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  useEffect(() => {
    return () => stopInternal(false);
  }, [stopInternal]);

  return { isRecording, interimText, finalText, lastError, start, stop, reset };
}
