/**
 * FaceRecognitionLogin.tsx — 100% hands-free face-auth page for VoiceSecure.
 *
 * Flow:
 *   1. Page mounts → TTS "Please look at the camera."
 *   2. Camera opens, auto-captures every 2 s while scanning
 *   3. Match → TTS "Authentication successful. Welcome <name>." → briefing
 *   4. Fail  → TTS "Face not recognized. Please reposition." (up to 3 tries)
 *   5. 3 fails → TTS lockout message, session locked
 *
 * No buttons.  No keyboard interaction.  No mouse required.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useFaceRecognition } from '../../hooks/student/useFaceRecognition';
import { useExamContext } from '../../context/ExamContext';
import { useVoiceContext } from '../../context/VoiceContext';
import apiService from '../../services/student/api.service';
import type { StudentProfile } from '../../types/student/student.types';

// ─── Status enum ─────────────────────────────────────────────────────────────

type AuthStatus =
  | 'INITIALIZING'
  | 'SCANNING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'RETRY'
  | 'LOCKED';

// ─── Component ────────────────────────────────────────────────────────────────

export function FaceRecognitionLogin() {
  const navigate = useNavigate();
  const { updateAuthState, setStudent } = useExamContext();
  const { speak, transition: voiceTransition, playBeep, setFaceAttempts } = useVoiceContext();

  const {
    isScanning,
    isProcessing,
    videoRef,
    canvasRef,
    startScanning,
    stopScanning,
    captureAndMatchFace,
  } = useFaceRecognition();

  const [authStatus, setAuthStatus] = useState<AuthStatus>('INITIALIZING');
  const [studentName, setStudentName] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [examCode] = useState('TECH101');
  const hasSpokenWelcome = useRef(false);
  const captureScheduledRef = useRef(false);

  // ── Step 1: Start camera + speak welcome ─────────────────────────────────

  useEffect(() => {
    voiceTransition('FACE_AUTH');
    startScanning();

    // Speak welcome after a short delay (let camera warm up)
    const t = setTimeout(async () => {
      if (hasSpokenWelcome.current) return;
      hasSpokenWelcome.current = true;
      await speak('Welcome to VoiceSecure. Please look directly at the camera.');
      setAuthStatus('SCANNING');
    }, 800);

    return () => {
      clearTimeout(t);
      stopScanning();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Step 2: Auto-capture every 2 s while SCANNING ────────────────────────

  useEffect(() => {
    if (authStatus !== 'SCANNING' || isProcessing || captureScheduledRef.current) return;
    captureScheduledRef.current = true;
    const t = setTimeout(() => {
      captureScheduledRef.current = false;
      handleCapture();
    }, 2000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, isProcessing]);

  // ── Capture + match ───────────────────────────────────────────────────────

  const handleCapture = async () => {
    if (authStatus !== 'SCANNING') return;
    setAuthStatus('PROCESSING');

    const result = await captureAndMatchFace(examCode);

    if (result?.matched && (result.confidence ?? 0) > 0.75) {
      // ── Success ──────────────────────────────────────────────────────────
      playBeep('success');
      setAuthStatus('SUCCESS');

      // Build student profile from result
      let profile: StudentProfile = buildProfile(result);
      setStudentName(profile.name);
      setFaceAttempts(0);

      setStudent(profile);
      updateAuthState({
        isAuthenticated: true,
        student: profile,
        faceVerified: true,
        loginTimestamp: new Date(),
      });
      stopScanning();

      await speak(`Authentication successful. Welcome, ${profile.name}.`);
      setTimeout(() => navigate('/student/exams'), 500);
    } else {
      // ── Failure ──────────────────────────────────────────────────────────
      playBeep('error');
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      setFaceAttempts(a => a + 1);

      if (remaining <= 0) {
        setAuthStatus('LOCKED');
        await speak(
          'Authentication failed. Maximum attempts exceeded. Please contact your administrator.',
        );
      } else {
        setAuthStatus('RETRY');
        await speak(
          `Face not recognized. Please reposition your face and ensure good lighting. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`,
        );
        // Resume scanning after a pause
        setTimeout(() => setAuthStatus('SCANNING'), 2500);
      }
    }
  };

  // ── Profile builder ───────────────────────────────────────────────────────

  function buildProfile(result: any): StudentProfile {
    const ms = result?.matchedStudent;
    return {
      studentId: ms?.studentId ?? result?.studentId ?? 'UNKNOWN',
      name: ms?.name ?? ms?.fullName ?? 'Student',
      email: ms?.email ?? '',
      phoneNumber: ms?.phoneNumber ?? '',
      enrollmentDate: ms?.enrollmentDate ? new Date(ms.enrollmentDate) : new Date(),
      disabilityType: ms?.disabilityType ?? 'other',
      faceDescriptor: ms?.faceDescriptor ?? [],
      accessibilityProfile: ms?.accessibilityProfile ?? {
        requiresVoiceNavigation: true,
        preferredLanguage: 'en',
        speechRate: 1,
        fontSize: 16,
        highContrast: false,
        textToSpeech: true,
      },
    };
  }

  // ── Demo login (development only) ────────────────────────────────────────

  const handleDemoLogin = async () => {
    playBeep('success');
    setAuthStatus('SUCCESS');
    const demo: StudentProfile = {
      studentId: 'DEMO_STUDENT_001',
      name: 'Demo Student',
      email: 'demo@student.local',
      phoneNumber: '',
      enrollmentDate: new Date(),
      disabilityType: 'other',
      faceDescriptor: [],
      accessibilityProfile: {
        requiresVoiceNavigation: true,
        preferredLanguage: 'en',
        speechRate: 1,
        fontSize: 16,
        highContrast: false,
        textToSpeech: true,
      },
    };
    setStudentName(demo.name);
    setStudent(demo);
    updateAuthState({ isAuthenticated: true, student: demo, faceVerified: true, loginTimestamp: new Date() });
    stopScanning();
    await speak('Demo login successful. Welcome, Demo Student.');
    navigate('/student/exams');
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const STATUS_LABEL: Record<AuthStatus, string> = {
    INITIALIZING: 'Initializing camera…',
    SCANNING:     'Looking for your face…',
    PROCESSING:   'Verifying identity…',
    SUCCESS:      `Welcome, ${studentName || 'Student'}!`,
    RETRY:        'Repositioning…',
    LOCKED:       'Access Denied. Contact administrator.',
  };

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex flex-col gap-5"
      >
        {/* Branding */}
        <div className="text-center">
          <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
            VoiceSecure
          </h1>
          <p className="text-slate-400 text-sm mt-1 tracking-wide">
            AI-Powered Accessible Examination System
          </p>
        </div>

        {/* Camera feed */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 aspect-video shadow-2xl">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} width={640} height={480} className="hidden" />

          {/* Face frame overlay */}
          {authStatus === 'SCANNING' || authStatus === 'PROCESSING' ? (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className={`w-40 h-48 rounded-xl border-2 ${
                  authStatus === 'PROCESSING' ? 'border-yellow-400' : 'border-green-400'
                }`}
                animate={{ scale: authStatus === 'PROCESSING' ? [1, 1.04, 1] : [1, 1.02, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
          ) : null}

          {/* Processing spinner */}
          {(isProcessing || authStatus === 'PROCESSING') && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <motion.div
                className="w-14 h-14 rounded-full border-4 border-indigo-400 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          )}

          {/* Success overlay */}
          {authStatus === 'SUCCESS' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-green-900/60 flex items-center justify-center"
            >
              <span className="text-6xl select-none">✅</span>
            </motion.div>
          )}

          {/* Locked overlay */}
          {authStatus === 'LOCKED' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-red-900/70 flex items-center justify-center"
            >
              <span className="text-6xl select-none">🔒</span>
            </motion.div>
          )}
        </div>

        {/* Status message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={authStatus}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`text-center p-4 rounded-xl border text-base font-medium ${
              authStatus === 'SUCCESS'
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : authStatus === 'LOCKED'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : authStatus === 'RETRY'
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
            }`}
            role="status"
            aria-live="polite"
          >
            {STATUS_LABEL[authStatus]}
          </motion.div>
        </AnimatePresence>

        {/* Attempt dots */}
        {authStatus !== 'LOCKED' && authStatus !== 'SUCCESS' && (
          <div className="flex justify-center gap-2" aria-label={`${attemptsLeft} attempts remaining`}>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                  i < attemptsLeft ? 'bg-indigo-400' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        )}

        {/* Hidden fallback link — voice-inaccessible users can use keyboard to find it */}
        <div className="text-center mt-2">
          <button
            onClick={() => navigate('/student/login-fallback')}
            className="text-slate-600 hover:text-slate-400 text-xs underline transition-colors"
            tabIndex={0}
            aria-label="Fall back to password login"
          >
            Use password login
          </button>
        </div>

        {/* Demo login (dev only) */}
        {(import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true') && (
          <button
            onClick={handleDemoLogin}
            className="w-full mt-1 px-4 py-2 rounded-lg border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors text-sm"
          >
            ⚡ Demo Login
          </button>
        )}
      </motion.div>
    </div>
  );
}

export default FaceRecognitionLogin;

