/**
 * PreExamChecklist.tsx - Pre-exam system verification
 *
 * Voice-enabled: Auto-speaks check progress, auto-starts when all pass,
 * speaks errors aloud.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExamData } from '../../types/student/exam.types';
import { useExamContext } from '../../context/ExamContext';
import { useVoiceContext } from '../../context/VoiceContext';
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
  const { speak, playBeep } = useVoiceContext();
  
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
    if (passed && checklist.length > 0) {
      playBeep('success');
      speak(
        'All system checks passed successfully. ' +
        (exam ? `Ready to start ${exam.title}. ` : '') +
        'The exam will begin automatically, or press the start button.',
        { rate: 0.95 },
      );
      // Auto-start after 3 seconds if all passed
      const t = setTimeout(() => handleStart(), 3000);
      return () => clearTimeout(t);
    } else if (failed.length > 0 && checklist.every(item => item.status !== 'pending' && item.status !== 'checking')) {
      playBeep('error');
      const failedNames = failed.map(f => f.label).join(', ');
      speak(`System check failed for: ${failedNames}. Please fix these issues before starting the exam.`);
    }
  }, [checklist]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center p-4">
      {/* Voice UI */}
      <VoiceListener isListening={true} mode="Navigation" position="top-right" compact />
      <VoiceSpeaker position="bottom-center" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Exam Setup</h1>
          <p className="text-slate-400">Verifying system requirements</p>
        </div>

        {/* Exam Info */}
        {exam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6"
          >
            <h2 className="text-xl font-semibold text-white mb-2">{exam.title}</h2>
            <p className="text-slate-400 text-sm">{exam.subject}</p>
            <div className="flex gap-4 mt-3 text-sm">
              <div>
                <span className="text-slate-400">Duration: </span>
                <span className="text-indigo-400 font-semibold">{exam.durationMinutes} min</span>
              </div>
              <div>
                <span className="text-slate-400">Total Marks: </span>
                <span className="text-indigo-400 font-semibold">{exam.totalMarks}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Checklist */}
        <div className="space-y-3 mb-8">
          {checklist.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`flex items-center p-4 rounded-lg border ${
                item.status === 'success'
                  ? 'bg-green-500/10 border-green-500/30'
                  : item.status === 'failed'
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <div className="mr-4">
                {item.status === 'success' && (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
                {item.status === 'failed' && (
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-white text-sm">✕</span>
                  </div>
                )}
                {item.status === 'checking' && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-6 h-6 rounded-full border-2 border-indigo-400 border-t-transparent"
                  />
                )}
                {item.status === 'pending' && (
                  <div className="w-6 h-6 rounded-full border-2 border-slate-600" />
                )}
              </div>

              <div className="flex-1">
                <p className={`font-medium ${
                  item.status === 'success' ? 'text-green-400' :
                  item.status === 'failed' ? 'text-red-400' :
                  'text-slate-200'
                }`}>
                  {item.label}
                </p>
                {item.details && (
                  <p className="text-xs text-slate-400 mt-1">{item.details}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-4 py-3 rounded-lg border border-slate-600 text-slate-300 hover:border-slate-500 font-medium transition-colors"
          >
            Back
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStart}
            disabled={!allPassed}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
              allPassed
                ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white hover:shadow-lg hover:shadow-indigo-500/50'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {allPassed ? 'Start Exam →' : 'Fix Issues...'}
          </motion.button>
        </div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-400"
        >
          <p className="font-semibold mb-1">📌 Important:</p>
          <p>The exam will run in fullscreen kiosk mode. You won't be able to exit until submission.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default PreExamChecklist;
