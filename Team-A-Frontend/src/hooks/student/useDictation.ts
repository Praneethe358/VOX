/**
 * useDictation — Continuous speech-to-text for answer dictation.
 *
 * Records audio via MediaRecorder and sends chunks to the backend Whisper
 * STT endpoint (/api/ai/stt-answer) for transcription.
 * 3-second silence (no new text) triggers auto-stop and calls onDictationEnd.
 *
 * Usage:
 *   const { isRecording, interimText, start, stop } = useDictation({
 *     onDictationEnd: (finalText) => { ... },
 *   });
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoiceContext } from '../../context/VoiceContext';
import apiService from '../../services/student/api.service';

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const accumulatedRef = useRef('');
  const isActiveRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunkLoopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (chunkLoopTimerRef.current) {
      clearTimeout(chunkLoopTimerRef.current);
      chunkLoopTimerRef.current = null;
    }
    isActiveRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
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
      console.log('[Dictation] Bootstrapping with backend Whisper STT...');

      if (isActiveRef.current) {
        console.log('[Dictation] Already active, skipping bootstrap');
        return;
      }

      // Request microphone permission
      try {
        console.log('[Dictation] Requesting microphone permission...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        console.log('[Dictation] Microphone permission granted');
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
      setIsRecording(true);
      playBeep('dictation');

      // Start silence timer — auto-stop if no new text arrives
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        console.log('[Dictation] Silence timeout reached');
        stopInternal(true);
      }, silenceTimeout);

      // Record-and-transcribe loop: record ~4s chunks, send to Whisper, accumulate
      const recordChunk = () => {
        if (!isActiveRef.current || !mediaStreamRef.current) return;

        // Pause while TTS is speaking to avoid echo
        if (isSpeakingRef.current) {
          chunkLoopTimerRef.current = setTimeout(recordChunk, 400);
          return;
        }

        const chunks: BlobPart[] = [];
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(mediaStreamRef.current, { mimeType: 'audio/webm' });
        } catch {
          // Fallback without specifying mimeType
          try {
            recorder = new MediaRecorder(mediaStreamRef.current);
          } catch (e2) {
            console.error('[Dictation] Cannot create MediaRecorder:', e2);
            setLastError('Unable to start audio recording.');
            stopInternal(false);
            return;
          }
        }
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data && event.data.size > 0) chunks.push(event.data);
        };

        recorder.onstart = () => {
          console.log('[Dictation] Recording chunk...');
        };

        recorder.onstop = async () => {
          if (!isActiveRef.current) return;

          try {
            const audioBlob = new Blob(chunks, { type: 'audio/webm' });
            console.log('[Dictation] Sending', audioBlob.size, 'bytes to backend Whisper...');
            setInterimText('Transcribing...');

            const result = await apiService.convertSpeechToText(audioBlob, lang);
            const text = (result?.text ?? '').trim();
            console.log('[Dictation] Whisper result:', text || '(empty)');

            setInterimText('');

            if (text && text.length >= 2) {
              // Append transcribed text
              accumulatedRef.current += (accumulatedRef.current ? ' ' : '') + text;
              setFinalText(accumulatedRef.current);

              // Reset silence timer — we got new speech
              clearSilenceTimer();
              silenceTimerRef.current = setTimeout(() => {
                console.log('[Dictation] Silence timeout reached');
                stopInternal(true);
              }, silenceTimeout);
            }
          } catch (err) {
            console.error('[Dictation] Whisper transcription failed:', err);
            setLastError('Transcription failed. Check backend connection.');
          }

          // Schedule next chunk
          if (isActiveRef.current) {
            chunkLoopTimerRef.current = setTimeout(recordChunk, 250);
          }
        };

        try {
          recorder.start();
          // Stop recording after ~4 seconds to send chunk
          setTimeout(() => {
            if (recorder.state !== 'inactive') recorder.stop();
          }, 4000);
        } catch (err) {
          console.error('[Dictation] Error starting MediaRecorder:', err);
          setLastError('Unable to start audio capture.');
          stopInternal(false);
        }
      };

      recordChunk();
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
