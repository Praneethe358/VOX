/**
 * PreExamChecklist.tsx - Pre-exam system verification
 *
 * Voice-enabled: Auto-speaks check progress, auto-starts when all pass,
 * speaks errors aloud.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ExamData } from '../../types/student/exam.types';
import { useExamContext } from '../../context/ExamContext';
import { useVoiceContext } from '../../context/VoiceContext';
import { useVoiceEngine } from '../../hooks/student/useVoiceEngine';
import type { CommandAction } from '../../hooks/student/useVoiceEngine';
import { VoiceListener } from '../../components/student/VoiceListener';
import { VoiceSpeaker } from '../../components/student/VoiceSpeaker';
import { bridge } from '../../api/bridge';

interface PreExamChecklistProps {
  exam?: ExamData;
  onReadyToStart?: () => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  status: 'pending' | 'checking' | 'success' | 'failed';
  details?: string;
}

export function PreExamChecklist({ exam: propExam, onReadyToStart: propOnReadyToStart }: PreExamChecklistProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { examId } = useParams();
  const { setExam, setSession, student } = useExamContext();
  const { speak, playBeep, isSpeaking } = useVoiceContext();
  
  // Try to get exam from props, then location state, then context
  const exam = propExam || (location.state as any)?.exam;

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'microphone', label: 'Microphone Access', status: 'pending' },
    { id: 'camera', label: 'Camera Verification (Login Only)', status: 'pending' },
    { id: 'internet', label: 'Internet Connection', status: 'pending' },
    { id: 'fullscreen', label: 'Fullscreen Capability', status: 'pending' },
    { id: 'speakers', label: 'Audio Output', status: 'pending' },
    { id: 'storage', label: 'Local Storage', status: 'pending' },
  ]);

  const [allPassed, setAllPassed] = useState(false);
  const [waitingForVoice, setWaitingForVoice] = useState(false);
  const [voiceAction, setVoiceAction] = useState<'none' | 'start' | 'back'>('none');
  const hasSpokenPassedRef = useRef(false);
  const hasStartedEngineRef = useRef(false);

  // ── Voice engine for hands-free "begin exam" / "go back" ──────────────
  const handleVoiceCommand = useCallback(
    (action: CommandAction, _confidence: number, _raw: string) => {
      if (action === 'start_exam') {
        playBeep('success');
        setVoiceAction('start');
      } else if (action === 'previous_question') {
        // "go back" / "back" / "previous" maps to previous_question in engine
        playBeep('command');
        setVoiceAction('back');
      }
    },
    [playBeep],
  );

  const {
    start: startEngine,
    stop: stopEngine,
    isListening: engineListening,
    lastHeardText,
    wasMatched,
  } = useVoiceEngine(handleVoiceCommand);

  // ── React to voice action ─────────────────────────────────────────────
  useEffect(() => {
    if (voiceAction === 'start' && allPassed) {
      stopEngine();
      handleStart();
    } else if (voiceAction === 'back') {
      stopEngine();
      speak('Going back.');
      navigate(-1);
    }
  }, [voiceAction]);

  // Run all system checks
  useEffect(() => {
    if (!exam) {
      navigate('/student/exams');
      return;
    }
    speak('Running system checks. Please wait.', { rate: 0.95 });
    runSystemChecks();
  }, [exam, navigate]);

  const handleStart = () => {
    if (propOnReadyToStart) {
      propOnReadyToStart();
    } else if (exam) {
      const storedId = student?.studentId ||
        sessionStorage.getItem('studentId') ||
        '';
      // Initialize exam in context
      setExam(exam);
      setSession({
        sessionId: `sess_${Date.now()}`,
        studentId: storedId,
        examCode: exam.examCode,
        status: 'in_progress',
        startTime: new Date(),
        currentQuestionId: exam.sections[0]?.questions[0]?.questionId || '',
        currentSectionId: exam.sections[0]?.sectionId || '',
        answers: [],
        lastSavedAt: new Date(),
        environmentData: {
          deviceInfo: navigator.userAgent,
          screenResolution: `${window.innerWidth}x${window.innerHeight}`,
          isFullscreen: true,
          browserTabs: 1
        }
      });
      // ► PWA Migration (March 2026): Enter browser fullscreen mode
      // Replaces Electron's enterKiosk IPC. Uses HTML5 Fullscreen API.
      // See: src/api/bridge.ts for implementation
      void bridge.enterKiosk();
      navigate(`/student/exam/${exam.examCode}/interface`);
    }
  };

  const runSystemChecks = async () => {
    // Check microphone
    await checkMicrophone();
    // Camera is only used during login face verification
    await checkCameraLoginVerification();
    // Check internet
    await checkInternet();
    // Check fullscreen
    await checkFullscreen();
    // Check speakers
    await checkSpeakers();
    // Check storage
    await checkStorage();
  };

  const updateChecklistItem = (id: string, status: ChecklistItem['status'], details?: string) => {
    setChecklist(prev => 
      prev.map(item => 
        item.id === id ? { ...item, status, details } : item
      )
    );
  };

  const checkMicrophone = async () => {
    updateChecklistItem('microphone', 'checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      updateChecklistItem('microphone', 'success', 'Microphone is accessible');
    } catch (err) {
      updateChecklistItem('microphone', 'failed', 'Please allow microphone access');
    }
  };

  const checkCameraLoginVerification = async () => {
    updateChecklistItem('camera', 'checking');
    updateChecklistItem('camera', 'success', 'Camera already verified during face login');
  };

  const checkInternet = async () => {
    updateChecklistItem('internet', 'checking');
    try {
      const response = await fetch('/health');
      if (response.ok) {
        updateChecklistItem('internet', 'success', 'Connected to server');
      } else {
        throw new Error('Server unreachable');
      }
    } catch (err) {
      updateChecklistItem('internet', 'failed', 'Cannot reach backend server. Make sure the server is running.');
    }
  };

  const checkFullscreen = () => {
    updateChecklistItem('fullscreen', 'checking');
    const elem = document.documentElement as any;
    const requestFullscreen = 
      elem.requestFullscreen ||
      elem.webkitRequestFullscreen ||
      elem.mozRequestFullscreen;

    if (typeof requestFullscreen === 'function') {
      updateChecklistItem('fullscreen', 'success', 'Fullscreen mode supported');
    } else {
      updateChecklistItem('fullscreen', 'failed', 'Fullscreen not supported');
    }
  };

  const checkSpeakers = () => {
    updateChecklistItem('speakers', 'checking');
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      updateChecklistItem('speakers', 'success', 'Audio output available (espeak TTS)');
    } else {
      updateChecklistItem('speakers', 'failed', 'No audio output detected');
    }
  };

  const checkStorage = () => {
    updateChecklistItem('storage', 'checking');
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      updateChecklistItem('storage', 'success', 'Local storage available');
    } catch (err) {
      updateChecklistItem('storage', 'failed', 'Local storage unavailable');
    }
  };

  // Check if all passed
  useEffect(() => {
    const passed = checklist.every(item => item.status === 'success');
    const failed = checklist.filter(item => item.status === 'failed');
    setAllPassed(passed);

    // Voice announcements
    if (passed && checklist.length > 0 && !hasSpokenPassedRef.current) {
      hasSpokenPassedRef.current = true;
      playBeep('success');
      setWaitingForVoice(true);
      speak(
        'All checks passed. Say "begin exam" to start.',
        { rate: 1.0 },
      );
      // Start voice engine immediately — don't wait for TTS to finish
      if (!hasStartedEngineRef.current) {
        hasStartedEngineRef.current = true;
        startEngine();
      }
    } else if (failed.length > 0 && checklist.every(item => item.status !== 'pending' && item.status !== 'checking')) {
      playBeep('error');
      const failedNames = failed.map(f => f.label).join(', ');
      speak(`System check failed for: ${failedNames}. Please fix these issues before starting the exam.`);
    }
  }, [checklist]);

  const passedCount = checklist.filter(i => i.status === 'success').length;
  const progress = (passedCount / checklist.length) * 100;

  return (
    <section className="screen flex-center" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>

      {/* Voice UI */}
      <VoiceListener
        isListening={engineListening}
        mode={waitingForVoice ? 'Command' : 'Navigation'}
        interimText={lastHeardText}
        position="top-right"
      />
      <VoiceSpeaker position="bottom-center" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(45, 78, 232, 0.12)', border: '1px solid rgba(45, 78, 232, 0.2)' }}>
            <span className="text-2xl">⚙</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text)' }}>System Verification</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Checking requirements before exam start</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            <span>{passedCount} of {checklist.length} checks</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(to right, var(--accent), var(--green-lt))' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Exam Info Card */}
        {exam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-5 mb-6"
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border2)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{exam.subject}</p>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{exam.title}</h2>
              </div>
            </div>
            <div className="flex gap-6 mt-4">
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: 'var(--accent-lt)' }}>{exam.durationMinutes}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>minutes</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: 'var(--accent-lt)' }}>{exam.totalMarks}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>marks</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: 'var(--accent-lt)' }}>{exam.sections.length}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>sections</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Checklist */}
        <div className="space-y-2 mb-8">
          {checklist.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="flex items-center p-4 rounded-xl border transition-all duration-300"
              style={{
                borderColor: item.status === 'success' ? 'rgba(34, 197, 94, 0.2)' : item.status === 'failed' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                background: item.status === 'success' ? 'rgba(34, 197, 94, 0.05)' : item.status === 'failed' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.02)',
              }}
            >
              {/* Status Icon */}
              <div className="mr-4 flex-shrink-0">
                {item.status === 'success' && (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                    <span className="text-emerald-400 text-xs font-bold">✓</span>
                  </div>
                )}
                {item.status === 'failed' && (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <span className="text-red-400 text-xs font-bold">✕</span>
                  </div>
                )}
                {item.status === 'checking' && (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(45, 78, 232, 0.15)', border: '1px solid rgba(45, 78, 232, 0.25)' }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      className="w-3.5 h-3.5 rounded-full border-[1.5px]"
                      style={{ borderColor: 'rgba(74, 107, 255, 0.5)', borderTopColor: 'rgba(74, 107, 255, 1)' }}
                    />
                  </div>
                )}
                {item.status === 'pending' && (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--text-muted)' }} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{
                  color: item.status === 'success' ? 'var(--green-lt)' : item.status === 'failed' ? '#ef4444' : item.status === 'checking' ? 'var(--accent-lt)' : 'var(--text-sec)'
                }}>
                  {item.label}
                </p>
                {item.details && (
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{item.details}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Voice Command Hint */}
        <AnimatePresence>
          {waitingForVoice && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 space-y-3"
            >
              <div className="flex items-center justify-between rounded-xl px-5 py-4" style={{
                background: 'var(--surface2)',
                border: '1px solid rgba(45, 78, 232, 0.15)',
                backdropFilter: 'blur(12px)',
              }}>
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: 'var(--accent-lt)' }}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <p className="text-sm" style={{ color: 'var(--text-sec)' }}>
                    Say{' '}
                    <span className="font-mono font-semibold rounded-md px-2 py-0.5" style={{
                      color: 'var(--accent-lt)',
                      background: 'rgba(45, 78, 232, 0.15)'
                    }}>
                      "Begin Exam"
                    </span>
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{
                  color: engineListening ? 'var(--green-lt)' : 'var(--text-muted)',
                  background: engineListening ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  border: engineListening ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.12)',
                }}>
                  {engineListening && (
                    <motion.span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: 'var(--green-lt)' }}
                      animate={{ opacity: [1, 0.3, 1], scale: [1, 0.85, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  🎙️ {engineListening ? 'Listening…' : isSpeaking ? 'Speaking...' : 'Starting mic...'}
                </span>
              </div>

              <div className="flex items-center gap-2 px-4">
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>or say</span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded" style={{
                  color: 'var(--text-muted)',
                  background: 'rgba(255, 255, 255, 0.04)',
                }}>
                  "Go Back"
                </span>
              </div>

              {/* Last heard feedback */}
              {lastHeardText && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-4"
                >
                  <p className="text-[11px] italic" style={{
                    color: wasMatched ? 'var(--green-lt)' : 'var(--text-muted)'
                  }}>
                    Heard: "{lastHeardText}"
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => { stopEngine(); navigate(-1); }}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              color: 'var(--text-sec)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text)';
              e.currentTarget.style.background = 'var(--surface3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-sec)';
              e.currentTarget.style.background = 'var(--surface2)';
            }}
          >
            ‹ Back
          </button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { stopEngine(); handleStart(); }}
            disabled={!allPassed}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300"
            style={{
              background: allPassed ? 'rgba(45, 78, 232, 0.18)' : 'rgba(255, 255, 255, 0.04)',
              border: allPassed ? '1px solid rgba(45, 78, 232, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
              color: allPassed ? 'var(--accent-lt)' : 'var(--text-muted)',
              cursor: allPassed ? 'pointer' : 'not-allowed',
              boxShadow: allPassed ? '0 8px 20px rgba(45, 78, 232, 0.15)' : 'none',
            }}
          >
            {allPassed ? 'Begin Exam →' : 'Verifying...'}
          </motion.button>
        </div>
      </motion.div>
    </section>
  );
}

export default PreExamChecklist;
