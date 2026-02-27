/**
 * useExamSession - Manages exam session state, navigation, and answers
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ExamSession,
  StudentAnswer,
  ExamData,
  ExamNavigationState,
  ExamSection,
} from '../../types/student/exam.types';
import { useExamContext } from '../../context/ExamContext';
import apiService from '../../services/student/api.service';

interface UseExamSessionReturn {
  session: ExamSession | null;
  currentQuestion: any | null;
  currentSection: ExamSection | null;
  navigationState: ExamNavigationState;
  submitAnswer: (answer: StudentAnswer) => Promise<void>;
  nextQuestion: () => void;
  previousQuestion: () => void;
  goToQuestion: (questionId: string) => void;
  flagQuestion: (questionId: string) => void;
  unflagQuestion: (questionId: string) => void;
  getProgress: () => { answered: number; total: number; percentage: number };
  saveSession: () => Promise<void>;
  submitExam: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useExamSession(exam?: ExamData): UseExamSessionReturn {
  const contextExam = useExamContext()?.exam;
  const currentExam = exam || contextExam;
  const [session, setSession] = useState<ExamSession | null>(null);
  const [navigationState, setNavigationState] = useState<ExamNavigationState>({
    currentQuestionIndex: 0,
    currentSectionIndex: 0,
    visitedQuestions: new Set(),
    flaggedQuestions: new Set(),
    answeredQuestions: new Set(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize session
  useEffect(() => {
    if (!currentExam) return;

    const newSession: ExamSession = {
      sessionId: `session_${Date.now()}_${Math.random()}`,
      studentId: '', // Will be set from auth context
      examCode: currentExam.examCode,
      status: 'in_progress',
      startTime: new Date(),
      currentQuestionId: currentExam.sections[0]?.questions[0]?.questionId || '',
      currentSectionId: currentExam.sections[0]?.sectionId || '',
      answers: [],
      lastSavedAt: new Date(),
      environmentData: {
        deviceInfo: navigator.userAgent,
        screenResolution: `${window.innerWidth}x${window.innerHeight}`,
        isFullscreen: document.fullscreenElement !== null,
        browserTabs: 1, // This would need window tracking for accuracy
      },
    };

    setSession(newSession);

    // Setup auto-save
    autoSaveTimerRef.current = setInterval(() => {
      saveSession();
    }, currentExam.aiConfig.autoSaveInterval * 1000);

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [currentExam]);

  const getCurrentQuestion = useCallback(() => {
    if (!currentExam) return null;
    
    const section = currentExam.sections[navigationState.currentSectionIndex];
    if (!section) return null;
    
    const question = section.questions[navigationState.currentQuestionIndex];
    return question || null;
  }, [currentExam, navigationState]);

  const getCurrentSection = useCallback(() => {
    if (!currentExam) return null;
    return currentExam.sections[navigationState.currentSectionIndex] || null;
  }, [currentExam, navigationState]);

  const submitAnswer = useCallback(async (answer: StudentAnswer) => {
    try {
      setError(null);
      
      if (!session) throw new Error('No active session');

      // Update answers in session
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

      // Mark as answered
      setNavigationState(prev => ({
        ...prev,
        answeredQuestions: new Set([...prev.answeredQuestions, answer.questionId]),
      }));

    } catch (err) {
      setError((err as Error).message);
    }
  }, [session]);

  const nextQuestion = useCallback(() => {
    const currentSection = getCurrentSection();
    if (!currentSection) return;

    let nextIndex = navigationState.currentQuestionIndex + 1;
    let nextSectionIndex = navigationState.currentSectionIndex;

    if (nextIndex >= currentSection.questions.length) {
      // Move to next section
      if (navigationState.currentSectionIndex < currentExam!.sections.length - 1) {
        nextSectionIndex++;
        nextIndex = 0;
      } else {
        // No more questions
        return;
      }
    }

    setNavigationState(prev => ({
      ...prev,
      currentQuestionIndex: nextIndex,
      currentSectionIndex: nextSectionIndex,
      visitedQuestions: new Set([
        ...prev.visitedQuestions,
        currentExam!.sections[nextSectionIndex].questions[nextIndex].questionId,
      ]),
    }));
  }, [currentExam, navigationState, getCurrentSection]);

  const previousQuestion = useCallback(() => {
    let prevIndex = navigationState.currentQuestionIndex - 1;
    let prevSectionIndex = navigationState.currentSectionIndex;

    if (prevIndex < 0) {
      if (navigationState.currentSectionIndex > 0) {
        prevSectionIndex--;
        const prevSection = currentExam!.sections[prevSectionIndex];
        prevIndex = prevSection.questions.length - 1;
      } else {
        return;
      }
    }

    setNavigationState(prev => ({
      ...prev,
      currentQuestionIndex: prevIndex,
      currentSectionIndex: prevSectionIndex,
    }));
  }, [exam, navigationState]);

  const goToQuestion = useCallback((questionId: string) => {
    let found = false;
    let sectionIndex = 0;
    let questionIndex = 0;

    for (let s = 0; s < currentExam!.sections.length; s++) {
      for (let q = 0; q < currentExam!.sections[s].questions.length; q++) {
        if (currentExam!.sections[s].questions[q].questionId === questionId) {
          sectionIndex = s;
          questionIndex = q;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (found) {
      setNavigationState(prev => ({
        ...prev,
        currentQuestionIndex: questionIndex,
        currentSectionIndex: sectionIndex,
        visitedQuestions: new Set([...prev.visitedQuestions, questionId]),
      }));
    }
  }, [exam]);

  const flagQuestion = useCallback((questionId: string) => {
    setNavigationState(prev => ({
      ...prev,
      flaggedQuestions: new Set([...prev.flaggedQuestions, questionId]),
    }));
  }, []);

  const unflagQuestion = useCallback((questionId: string) => {
    setNavigationState(prev => ({
      ...prev,
      flaggedQuestions: new Set(
        Array.from(prev.flaggedQuestions).filter(id => id !== questionId)
      ),
    }));
  }, []);

  const getProgress = useCallback(() => {
    const total = currentExam!.sections.reduce((sum: number, s: ExamSection) => sum + s.questions.length, 0);
    const answered = navigationState.answeredQuestions.size;
    return {
      answered,
      total,
      percentage: Math.round((answered / total) * 100),
    };
  }, [currentExam, navigationState]);

  const saveSession = useCallback(async () => {
    try {
      if (!session) return;

      // Update session with current state
      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          lastSavedAt: new Date(),
        };
      });

      await apiService.autoSaveSession(session);
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  }, [session]);

  const submitExam = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!session) throw new Error('No active session');

      // Mark as submitted
      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'submitted',
          endTime: new Date(),
          totalDuration: Math.floor(
            (new Date().getTime() - prev.startTime.getTime()) / 1000
          ),
          totalMarks: currentExam!.totalMarks,
        };
      });

      await apiService.submitExam(session);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [session, exam]);

  return {
    session,
    currentQuestion: getCurrentQuestion(),
    currentSection: getCurrentSection(),
    navigationState,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    flagQuestion,
    unflagQuestion,
    getProgress,
    saveSession,
    submitExam,
    isLoading,
    error,
  };
}
