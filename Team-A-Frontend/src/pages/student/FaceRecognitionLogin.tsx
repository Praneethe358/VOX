/**
 * FaceRecognitionLogin.tsx — 100% hands-free face-auth page for VoiceSecure.
 *
 * Upgraded flow with embedding-based verification:
 *   1. Page mounts → TTS "Please look at the camera."
 *   2. Camera opens, auto-captures every 2 s while scanning
 *   3. Extracts 128D face embedding via face-api.js
 *   4. Sends to /api/face/verify (exam-wide) or /api/face/verify-by-id (student-specific)
 *   5. Match → TTS "Authentication successful. Welcome <name>." → redirect
 *   6. Fail  → TTS "Face not recognized." (up to 5 tries; rate-limited server-side)
 *   7. 5 fails → TTS lockout message, session locked
 *
 * Security:
 *   - Multi-face rejection (only 1 face allowed in frame)
 *   - Basic liveness detection (movement tracking across frames)
 *   - Server-side rate limiting (5 attempts per 15-minute window)
 *
 * No buttons. No keyboard interaction. No mouse required.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useFaceRecognition } from '../../hooks/student/useFaceRecognition';
import { useExamContext } from '../../context/ExamContext';
import { useVoiceContext } from '../../context/VoiceContext';
import type { StudentProfile } from '../../types/student/student.types';

// ─── Status enum ─────────────────────────────────────────────────────────────

type AuthStatus =
  | 'INITIALIZING'
  | 'SCANNING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'RETRY'
  | 'LOCKED';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;
const CONFIDENCE_THRESHOLD = 0.80; // cosine similarity threshold (backend uses 0.85)

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
    captureAndMatchById,
    faceCount,
    livenessScore,
    error: hookError,
  } = useFaceRecognition();

  const [authStatus, setAuthStatus] = useState<AuthStatus>('INITIALIZING');
  const [studentName, setStudentName] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [examCode] = useState('TECH101');
  const [lastError, setLastError] = useState('');
  const hasSpokenWelcome = useRef(false);
  const captureScheduledRef = useRef(false);

  // Optional: if studentId is available (e.g., from query params or session), use verify-by-id
  const studentIdRef = useRef<string | null>(
    new URLSearchParams(window.location.search).get('studentId') ||
    sessionStorage.getItem('pendingStudentId')
  );

  // ── Step 1: Start camera + speak welcome ─────────────────────────────────

  useEffect(() => {
    voiceTransition('FACE_AUTH');
    startScanning();

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
    setLastError('');

    // Choose endpoint based on whether we have a known studentId
    let result;
    if (studentIdRef.current) {
      result = await captureAndMatchById(studentIdRef.current);
    } else {
      result = await captureAndMatchFace(examCode);
    }

    if (result?.matched && (result.confidence ?? 0) >= CONFIDENCE_THRESHOLD) {
      // ── Success ──────────────────────────────────────────────────────────
      playBeep('success');
      setAuthStatus('SUCCESS');

      const profile: StudentProfile = buildProfile(result);
      setStudentName(profile.name);
      setFaceAttempts(0);

      setStudent(profile);
      updateAuthState({
        isAuthenticated: true,
        student: profile,
        faceVerified: true,
        loginTimestamp: new Date(),
      });
      sessionStorage.setItem('studentAuth', 'true');
      sessionStorage.setItem('studentId', profile.studentId);
      sessionStorage.setItem('studentData', JSON.stringify(profile));
      sessionStorage.removeItem('pendingStudentId');
      stopScanning();

      const confPct = Math.round((result.confidence ?? 0) * 100);
      await speak(`Authentication successful. Welcome, ${profile.name}. Confidence ${confPct} percent.`);
      setTimeout(() => navigate('/student/exams'), 500);
    } else {
      // ── Failure ──────────────────────────────────────────────────────────
      playBeep('error');
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      setFaceAttempts((a: number) => a + 1);

      const errorDetail = hookError || 'Face not recognized.';
      setLastError(errorDetail);

      if (remaining <= 0) {
        setAuthStatus('LOCKED');
        stopScanning();
        await speak(
          'Authentication failed. Maximum attempts exceeded. Your session has been locked. Please contact your administrator.',
        );
      } else {
        setAuthStatus('RETRY');
        await speak(
          `${errorDetail} ${remaining} attempt${remaining > 1 ? 's' : ''} remaining. Please reposition your face.`,
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
      name: ms?.name ?? ms?.fullName ?? ms?.studentName ?? 'Student',
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


  // ─── Helpers ─────────────────────────────────────────────────────────────

  const STATUS_LABEL: Record<AuthStatus, string> = {
    INITIALIZING: 'Initializing camera…',
    SCANNING:     'Looking for your face…',
    PROCESSING:   'Verifying identity…',
    SUCCESS:      `Welcome, ${studentName || 'Student'}!`,
    RETRY:        lastError || 'Repositioning…',
    LOCKED:       'Access Denied. Contact administrator.',
  };

  const livenessColor =
    livenessScore > 0.6 ? 'bg-green-400' : livenessScore > 0.3 ? 'bg-yellow-400' : 'bg-red-400';

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
          {(authStatus === 'SCANNING' || authStatus === 'PROCESSING') && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className={`w-40 h-48 rounded-xl border-2 ${
                  faceCount > 1
                    ? 'border-red-500'
                    : authStatus === 'PROCESSING'
                    ? 'border-yellow-400'
                    : faceCount === 1
                    ? 'border-green-400'
                    : 'border-slate-500'
                }`}
                animate={{ scale: authStatus === 'PROCESSING' ? [1, 1.04, 1] : [1, 1.02, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
          )}

          {/* Multi-face warning badge */}
          {faceCount > 1 && authStatus === 'SCANNING' && (
            <div className="absolute top-3 left-3 bg-red-600/90 text-white text-xs px-2 py-1 rounded-lg font-medium">
              ⚠ {faceCount} faces — only 1 allowed
            </div>
          )}

          {/* Liveness indicator */}
          {(authStatus === 'SCANNING' || authStatus === 'PROCESSING') && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${livenessColor}`} />
              <span className="text-[10px] text-slate-300 font-mono">
                Liveness {Math.round(livenessScore * 100)}%
              </span>
            </div>
          )}

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
            {[...Array(MAX_ATTEMPTS)].map((_, i) => (
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

      </motion.div>
    </div>
  );
}

export default FaceRecognitionLogin;

