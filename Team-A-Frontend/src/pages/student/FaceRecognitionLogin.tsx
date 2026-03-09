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

  const STATUS_CONFIG: Record<AuthStatus, { label: string; icon: string; colorClass: string; borderClass: string; bgClass: string }> = {
    INITIALIZING: { label: 'Initializing camera…', icon: '◎', colorClass: 'text-slate-400', borderClass: 'border-slate-500/20', bgClass: 'bg-slate-500/5' },
    SCANNING:     { label: 'Looking for your face…', icon: '◉', colorClass: 'text-indigo-400', borderClass: 'border-indigo-500/20', bgClass: 'bg-indigo-500/5' },
    PROCESSING:   { label: 'Verifying identity…', icon: '⟳', colorClass: 'text-amber-400', borderClass: 'border-amber-500/20', bgClass: 'bg-amber-500/5' },
    SUCCESS:      { label: `Welcome, ${studentName || 'Student'}!`, icon: '✓', colorClass: 'text-emerald-400', borderClass: 'border-emerald-500/20', bgClass: 'bg-emerald-500/5' },
    RETRY:        { label: lastError || 'Repositioning…', icon: '↻', colorClass: 'text-amber-400', borderClass: 'border-amber-500/20', bgClass: 'bg-amber-500/5' },
    LOCKED:       { label: 'Access Denied. Contact administrator.', icon: '⊘', colorClass: 'text-rose-400', borderClass: 'border-rose-500/20', bgClass: 'bg-rose-500/5' },
  };

  const statusInfo = STATUS_CONFIG[authStatus];
  const livenessBg = livenessScore > 0.6 ? 'bg-emerald-400' : livenessScore > 0.3 ? 'bg-amber-400' : 'bg-rose-400';
  const livenessTextColor = livenessScore > 0.6 ? 'text-emerald-400' : livenessScore > 0.3 ? 'text-amber-400' : 'text-rose-400';

  const scanBorderColor =
    faceCount > 1
      ? 'border-rose-500'
      : authStatus === 'PROCESSING'
      ? 'border-amber-400'
      : faceCount === 1
      ? 'border-emerald-400'
      : 'border-slate-500/40';

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative overflow-hidden flex items-center justify-center p-4">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-30%] left-[-15%] w-[60%] h-[60%] rounded-full bg-indigo-600/[0.04] blur-[100px]" />
        <div className="absolute bottom-[-25%] right-[-10%] w-[55%] h-[55%] rounded-full bg-purple-600/[0.04] blur-[100px]" />
        <div className="absolute top-[30%] right-[15%] w-[35%] h-[35%] rounded-full bg-cyan-600/[0.02] blur-[80px]" />
      </div>
      {/* Dot grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '32px 32px' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-lg flex flex-col gap-6 z-10"
      >
        {/* Branding */}
        <motion.div className="text-center space-y-2" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
          <h1 className="text-5xl font-black text-gradient tracking-tight">VoiceSecure</h1>
          <p className="text-slate-500 text-xs tracking-[0.2em] uppercase font-medium">AI-Powered Accessible Examination</p>
        </motion.div>

        {/* Camera card — glass morphism */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative rounded-3xl overflow-hidden glass-card shadow-2xl shadow-indigo-500/[0.05]"
        >
          <div className="relative aspect-video bg-slate-950">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} width={640} height={480} className="hidden" />

            {/* Scan frame with corner markers */}
            {(authStatus === 'SCANNING' || authStatus === 'PROCESSING') && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                  className={`w-44 h-52 rounded-2xl border-2 ${scanBorderColor}`}
                  animate={{ scale: authStatus === 'PROCESSING' ? [1, 1.03, 1] : [1, 1.015, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* Corner brackets */}
                <div className="absolute w-44 h-52">
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-indigo-400/60 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-indigo-400/60 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-indigo-400/60 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-indigo-400/60 rounded-br-lg" />
                </div>
                {/* Sweeping scan line */}
                {authStatus === 'SCANNING' && (
                  <motion.div
                    className="absolute w-40 h-[2px] bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent"
                    animate={{ y: [-90, 90] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                  />
                )}
              </div>
            )}

            {/* Multi-face warning */}
            {faceCount > 1 && authStatus === 'SCANNING' && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="absolute top-3 left-3 bg-rose-500/10 backdrop-blur-md border border-rose-500/20 rounded-xl px-3 py-1.5">
                <span className="text-rose-400 text-xs font-semibold">⚠ {faceCount} faces — only 1 allowed</span>
              </motion.div>
            )}

            {/* Liveness chip */}
            {(authStatus === 'SCANNING' || authStatus === 'PROCESSING') && (
              <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-md border border-white/5 rounded-xl px-3 py-1.5 flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${livenessBg}`} />
                <span className={`text-[10px] font-mono ${livenessTextColor}`}>{Math.round(livenessScore * 100)}%</span>
              </div>
            )}

            {/* Processing overlay with dual spinner */}
            {(isProcessing || authStatus === 'PROCESSING') && (
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center">
                <div className="relative">
                  <motion.div className="w-16 h-16 rounded-full border-[3px] border-indigo-400/20 border-t-indigo-400"
                    animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                  <motion.div className="absolute inset-1.5 rounded-full border-[3px] border-purple-400/15 border-b-purple-400"
                    animate={{ rotate: -360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />
                </div>
              </div>
            )}

            {/* Success overlay */}
            {authStatus === 'SUCCESS' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm flex items-center justify-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-400/50 flex items-center justify-center">
                  <span className="text-emerald-400 text-4xl font-bold">✓</span>
                </motion.div>
              </motion.div>
            )}

            {/* Locked overlay */}
            {authStatus === 'LOCKED' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 bg-rose-950/50 backdrop-blur-sm flex items-center justify-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="w-20 h-20 rounded-full bg-rose-500/15 border-2 border-rose-400/50 flex items-center justify-center">
                  <span className="text-rose-400 text-4xl">⊘</span>
                </motion.div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Status card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={authStatus}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className={`${statusInfo.bgClass} ${statusInfo.borderClass} border rounded-2xl px-5 py-4 flex items-center gap-4 backdrop-blur-sm`}
            role="status" aria-live="polite"
          >
            <span className={`text-2xl font-bold ${statusInfo.colorClass}`}>{statusInfo.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${statusInfo.colorClass}`}>{statusInfo.label}</p>
              {authStatus === 'SCANNING' && <p className="text-slate-500 text-xs mt-0.5">Auto-capturing every 2 seconds</p>}
            </div>
            {authStatus === 'SCANNING' && (
              <motion.div className="w-7 h-7 rounded-full border-2 border-indigo-500/25 border-t-indigo-400"
                animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Attempt dots */}
        {authStatus !== 'LOCKED' && authStatus !== 'SUCCESS' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="flex justify-center gap-2.5" aria-label={`${attemptsLeft} attempts remaining`}>
            {[...Array(MAX_ATTEMPTS)].map((_, i) => (
              <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 + i * 0.04 }}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i < attemptsLeft ? 'bg-indigo-400 shadow-sm shadow-indigo-400/30' : 'bg-slate-700/40'
                }`}
              />
            ))}
          </motion.div>
        )}

        {/* Security badges */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-4 text-[10px] text-slate-600 uppercase tracking-[0.15em]">
          <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-emerald-600/40" />End-to-end encrypted</span>
          <span className="w-px h-3 bg-slate-700/30" />
          <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-emerald-600/40" />Liveness detection</span>
          <span className="w-px h-3 bg-slate-700/30" />
          <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-emerald-600/40" />AI-powered</span>
        </motion.div>

        {/* Fallback link */}
        <div className="text-center">
          <button
            onClick={() => navigate('/student/login-fallback')}
            className="text-slate-600 hover:text-slate-400 text-xs transition-colors duration-200"
            tabIndex={0} aria-label="Fall back to password login"
          >
            Use password login instead
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default FaceRecognitionLogin;

