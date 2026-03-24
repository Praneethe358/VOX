/**
 * useAutoSave - Auto-saves exam responses at regular intervals
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ExamSession } from '../../types/student/exam.types';
import apiService from '../../services/student/api.service';

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;
  manualSave: () => Promise<void>;
}

export function useAutoSave(
  session: ExamSession | null,
  autoSaveInterval: number = 20000, // 20 seconds
): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSave = useCallback(async () => {
    if (!session) return;

    try {
      setIsSaving(true);
      setSaveError(null);

      await apiService.autoSaveSession(session);

      setLastSaved(new Date());
    } catch (err) {
      setSaveError((err as Error).message);
      console.error('Auto-save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [session]);

  // Setup auto-save interval
  useEffect(() => {
    if (!session || session.status !== 'in_progress') {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
      return;
    }

    saveTimerRef.current = setInterval(() => {
      performSave();
    }, autoSaveInterval);

    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [session, autoSaveInterval, performSave]);

  const manualSave = useCallback(async () => {
    await performSave();
  }, [performSave]);

  return {
    isSaving,
    lastSaved,
    saveError,
    manualSave,
  };
}
