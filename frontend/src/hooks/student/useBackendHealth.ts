/**
 * useBackendHealth — Periodically checks backend availability.
 * Returns { isOnline, lastChecked, error, checkNow }.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { dbApi } from '../../api/client';

interface BackendHealthState {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  error: string | null;
  checkNow: () => Promise<void>;
}

export function useBackendHealth(intervalMs: number = 30_000): BackendHealthState {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkNow = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await dbApi.checkHealth();
      setIsOnline(result.success);
      setError(result.success ? null : (result as any).error || 'Backend unreachable');
    } catch {
      setIsOnline(false);
      setError('Network error');
    } finally {
      setIsChecking(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    checkNow(); // Initial check
    intervalRef.current = setInterval(checkNow, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkNow, intervalMs]);

  return { isOnline, isChecking, lastChecked, error, checkNow };
}

export default useBackendHealth;
