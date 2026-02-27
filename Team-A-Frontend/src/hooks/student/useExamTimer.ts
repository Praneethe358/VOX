/**
 * useExamTimer — Pause-aware exam countdown timer.
 *
 * Stores timer as { startedAt, totalPausedMs } rather than a simple countdown
 * so it survives page refreshes and restarts.
 *
 * Usage:
 *   const { remaining, isPaused, pause, resume, expire } = useExamTimer({
 *     durationMinutes: 60,
 *     onExpire: () => { ... },
 *   });
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseExamTimerOptions {
  durationMinutes: number;
  onExpire: () => void;
  /** Called when 5 minutes remain (for TTS warning) */
  onFiveMinWarning?: () => void;
}

export interface UseExamTimerReturn {
  /** Remaining seconds */
  remaining: number;
  isPaused: boolean;
  isExpired: boolean;
  pause: () => void;
  resume: () => void;
  /** Milliseconds spent paused */
  totalPausedMs: number;
  startedAt: Date | null;
}

export function useExamTimer({
  durationMinutes,
  onExpire,
  onFiveMinWarning,
}: UseExamTimerOptions): UseExamTimerReturn {
  const [remaining, setRemaining] = useState(durationMinutes * 60);
  const [isPaused, setIsPaused] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [startedAt] = useState<Date>(() => new Date());
  const [totalPausedMs, setTotalPausedMs] = useState(0);

  const pausedAtRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef(0);
  const fiveMinWarnFiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  const onFiveMinRef = useRef(onFiveMinWarning);
  onExpireRef.current = onExpire;
  onFiveMinRef.current = onFiveMinWarning;

  const pause = useCallback(() => {
    if (pausedAtRef.current !== null) return; // already paused
    pausedAtRef.current = Date.now();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (pausedAtRef.current === null) return; // not paused
    const pausedDuration = Date.now() - pausedAtRef.current;
    totalPausedMsRef.current += pausedDuration;
    setTotalPausedMs(totalPausedMsRef.current);
    pausedAtRef.current = null;
    setIsPaused(false);
  }, []);

  useEffect(() => {
    const durationMs = durationMinutes * 60 * 1000;
    const startMs = startedAt.getTime();

    const tick = setInterval(() => {
      if (pausedAtRef.current !== null) {
        // Timer frozen while paused
        return;
      }

      const elapsed = Date.now() - startMs - totalPausedMsRef.current;
      const remainingMs = durationMs - elapsed;
      const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

      setRemaining(remainingSeconds);

      // 5-minute warning
      if (remainingSeconds <= 300 && !fiveMinWarnFiredRef.current) {
        fiveMinWarnFiredRef.current = true;
        onFiveMinRef.current?.();
      }

      if (remainingSeconds <= 0) {
        clearInterval(tick);
        setIsExpired(true);
        onExpireRef.current();
      }
    }, 500);

    return () => clearInterval(tick);
  }, [durationMinutes, startedAt]);

  return {
    remaining,
    isPaused,
    isExpired,
    pause,
    resume,
    totalPausedMs,
    startedAt,
  };
}
