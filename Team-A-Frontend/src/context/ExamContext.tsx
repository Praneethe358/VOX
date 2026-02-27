/**
 * ExamContext - Global state management for exam session
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  ExamData,
  ExamSession,
  StudentAnswer,
  ExamNavigationState,
} from '../types/student/exam.types';
import {
  StudentProfile,
  StudentAuthState,
} from '../types/student/student.types';
import { ActivityLog } from '../types/student/activity.types';
import apiService from '../services/student/api.service';

interface ExamContextType {
  exam: ExamData | null;
  session: ExamSession | null;
  student: StudentProfile | null;
  authState: StudentAuthState;
  activityLogs: ActivityLog[];
  navigationState: ExamNavigationState | null;
  
  // Actions
  setExam: (exam: ExamData | null) => void;
  setSession: (session: ExamSession | null) => void;
  setStudent: (student: StudentProfile | null) => void;
  updateAuthState: (auth: Partial<StudentAuthState>) => void;
  addActivityLog: (log: ActivityLog) => void;
  submitAnswer: (answer: StudentAnswer) => void;
  updateNavigationState: (state: Partial<ExamNavigationState>) => void;
  submitExam: () => Promise<void>;
  logout: () => void;
}

const ExamContext = createContext<ExamContextType | null>(null);

export function ExamProvider({ children }: { children: ReactNode }) {
  const [exam, setExam] = useState<ExamData | null>(null);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [authState, setAuthState] = useState<StudentAuthState>({
    isAuthenticated: false,
    student: null,
    faceVerified: false,
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [navigationState, setNavigationState] = useState<ExamNavigationState | null>(null);

  const updateAuthState = useCallback((auth: Partial<StudentAuthState>) => {
    setAuthState((prev: StudentAuthState) => ({ ...prev, ...auth }));
  }, []);

  const addActivityLog = useCallback((log: ActivityLog) => {
    setActivityLogs(prev => [...prev, log]);
  }, []);

  const submitAnswer = useCallback((answer: StudentAnswer) => {
    if (!session) return;

    setSession(prev => {
      if (!prev) return prev;

      const existingAnswerIndex = prev.answers.findIndex(
        a => a.questionId === answer.questionId
      );

      const updatedAnswers = [...prev.answers];
      if (existingAnswerIndex >= 0) {
        updatedAnswers[existingAnswerIndex] = answer;
      } else {
        updatedAnswers.push(answer);
      }

      return {
        ...prev,
        answers: updatedAnswers,
        lastSavedAt: new Date(),
      };
    });
  }, [session]);

  const updateNavigationState = useCallback((state: Partial<ExamNavigationState>) => {
    setNavigationState(prev => {
      if (!prev) return prev;
      return { ...prev, ...state };
    });
  }, []);

  const submitExam = useCallback(async () => {
    try {
      if (!session) throw new Error('No active session');

      await apiService.submitExam(session);

      // Mark as submitted
      setSession((prev: ExamSession | null) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'submitted',
          endTime: new Date(),
          totalDuration: Math.floor(
            (new Date().getTime() - prev.startTime.getTime()) / 1000
          ),
        };
      });
    } catch (err) {
      console.error('Submission failed:', err);
      throw err;
    }
  }, [session]);

  const logout = useCallback(() => {
    setExam(null);
    setSession(null);
    setStudent(null);
    setAuthState({
      isAuthenticated: false,
      student: null,
      faceVerified: false,
    });
    setActivityLogs([]);
    setNavigationState(null);
  }, []);

  const value: ExamContextType = {
    exam,
    session,
    student,
    authState,
    activityLogs,
    navigationState,
    setExam,
    setSession,
    setStudent,
    updateAuthState,
    addActivityLog,
    submitAnswer,
    updateNavigationState,
    submitExam,
    logout,
  };

  return (
    <ExamContext.Provider value={value}>
      {children}
    </ExamContext.Provider>
  );
}

export function useExamContext() {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error('useExamContext must be used within ExamProvider');
  }
  return context;
}
