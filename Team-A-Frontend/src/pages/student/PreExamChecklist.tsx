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
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        updateChecklistItem('internet', 'success', 'Connected to server');
      } else {
        throw new Error('Server unreachable');
      }
    } catch (err) {
      updateChecklistItem('internet', 'failed', 'Cannot reach backend at localhost:3000. Make sure the server is running.');
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
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-600/[0.06] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-emerald-600/[0.04] rounded-full blur-[100px]" />
      </div>

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
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/[0.08] border border-indigo-500/[0.1] flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚙</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">System Verification</h1>
          <p className="text-sm text-slate-500">Checking requirements before exam start</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>{passedCount} of {checklist.length} checks</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
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
            className="glass-card rounded-2xl p-5 mb-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">{exam.subject}</p>
                <h2 className="text-lg font-semibold text-white">{exam.title}</h2>
              </div>
            </div>
            <div className="flex gap-6 mt-4">
              <div className="text-center">
                <p className="text-lg font-bold text-indigo-300">{exam.durationMinutes}</p>
                <p className="text-[11px] text-slate-500">minutes</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-indigo-300">{exam.totalMarks}</p>
                <p className="text-[11px] text-slate-500">marks</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-indigo-300">{exam.sections.length}</p>
                <p className="text-[11px] text-slate-500">sections</p>
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
              className={`flex items-center p-4 rounded-xl border transition-all duration-300 ${
                item.status === 'success'
                  ? 'bg-emerald-500/[0.04] border-emerald-500/[0.1]'
                  : item.status === 'failed'
                  ? 'bg-red-500/[0.04] border-red-500/[0.1]'
                  : 'bg-white/[0.02] border-white/[0.04]'
              }`}
            >
              {/* Status Icon */}
              <div className="mr-4 flex-shrink-0">
                {item.status === 'success' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/[0.15] border border-emerald-500/[0.2] flex items-center justify-center">
                    <span className="text-emerald-400 text-xs font-bold">✓</span>
                  </div>
                )}
                {item.status === 'failed' && (
                  <div className="w-7 h-7 rounded-lg bg-red-500/[0.15] border border-red-500/[0.2] flex items-center justify-center">
                    <span className="text-red-400 text-xs font-bold">✕</span>
                  </div>
                )}
                {item.status === 'checking' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/[0.1] border border-indigo-500/[0.15] flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      className="w-3.5 h-3.5 rounded-full border-[1.5px] border-indigo-400/50 border-t-indigo-400"
                    />
                  </div>
                )}
                {item.status === 'pending' && (
                  <div className="w-7 h-7 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  item.status === 'success' ? 'text-emerald-300' :
                  item.status === 'failed' ? 'text-red-300' :
                  item.status === 'checking' ? 'text-indigo-300' :
                  'text-slate-400'
                }`}>
                  {item.label}
                </p>
                {item.details && (
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{item.details}</p>
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
              <div className="flex items-center justify-between glass-card rounded-xl px-5 py-4 border-indigo-500/[0.1]">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full bg-indigo-400"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <p className="text-sm text-slate-300">
                    Say{' '}
                    <span className="font-mono font-semibold text-indigo-300 bg-indigo-500/[0.1] px-2 py-0.5 rounded-md">
                      "Begin Exam"
                    </span>
                  </p>
                </div>
                <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
                  engineListening
                    ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-400/30'
                    : 'text-slate-500 bg-slate-500/10 border border-slate-500/20'
                }`}>
                  {engineListening && (
                    <motion.span
                      className="inline-block w-2 h-2 rounded-full bg-emerald-400"
                      animate={{ opacity: [1, 0.3, 1], scale: [1, 0.85, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  🎙️ {engineListening ? 'Listening…' : isSpeaking ? 'Speaking...' : 'Starting mic...'}
                </span>
              </div>

              <div className="flex items-center gap-2 px-4">
                <span className="text-[11px] text-slate-600">or say</span>
                <span className="font-mono text-[11px] text-slate-500 bg-white/[0.03] px-2 py-0.5 rounded">
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
                  <p className={`text-[11px] italic ${
                    wasMatched ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
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
            className="flex-1 px-4 py-3 rounded-xl glass-card text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors"
          >
            ‹ Back
          </button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { stopEngine(); handleStart(); }}
            disabled={!allPassed}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
              allPassed
                ? 'bg-indigo-500/[0.15] hover:bg-indigo-500/[0.25] border border-indigo-500/[0.2] text-indigo-300 hover:text-indigo-200 shadow-lg shadow-indigo-500/[0.08]'
                : 'bg-white/[0.02] border border-white/[0.04] text-slate-600 cursor-not-allowed'
            }`}
          >
            {allPassed ? 'Begin Exam →' : 'Verifying...'}
          </motion.button>
        </div>

        {/* Info Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 glass-card rounded-xl p-4 border-indigo-500/[0.08]"
        >
          <div className="flex gap-3">
            <div className="w-5 h-5 rounded-md bg-indigo-500/[0.1] flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-indigo-400 text-[10px]">!</span>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-300 mb-0.5">Kiosk Mode</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                The exam runs in fullscreen kiosk mode. You won't be able to switch tabs or exit until submission.
                This portal is completely hands-free — use voice commands throughout.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default PreExamChecklist;
