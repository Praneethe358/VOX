/**
 * useAutoSpeak — Auto-speaks TTS content when a page mounts.
 *
 * Usage:
 *   useAutoSpeak('Welcome to the dashboard. You have 3 upcoming exams.');
 *   useAutoSpeak(() => `You scored ${score} percent.`, [score]);
 *
 * Speaks once on mount (or when deps change). Cancels on unmount.
 */

import { useEffect, useRef } from 'react';
import { useVoiceContext, SpeakOptions } from '../context/VoiceContext';

type TextOrFactory = string | (() => string | null);

export function useAutoSpeak(
  textOrFactory: TextOrFactory,
  deps: any[] = [],
  options?: SpeakOptions & { delay?: number },
) {
  const { speak, stopSpeaking } = useVoiceContext();
  const hasSpokenRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only speak once per dependency set
    hasSpokenRef.current = false;
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hasSpokenRef.current) return;

    const text = typeof textOrFactory === 'function' ? textOrFactory() : textOrFactory;
    if (!text) return;

    hasSpokenRef.current = true;

    const delay = options?.delay ?? 500;
    timeoutRef.current = setTimeout(() => {
      speak(text, options);
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [textOrFactory, speak, options, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Force re-speak */
  const reSpeakNow = (overrideText?: string) => {
    const text = overrideText ?? (typeof textOrFactory === 'function' ? textOrFactory() : textOrFactory);
    if (text) {
      stopSpeaking();
      speak(text, options);
    }
  };

  return { reSpeakNow, stopSpeaking };
}
