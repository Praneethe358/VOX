/**
 * FaceRecognitionLogin.tsx — 100% hands-free face-auth page for Vox.
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
      await speak('Welcome to Vox. Please look directly at the camera.');
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
    <section className="screen" id="s-faceauth">
      <div className="back-btn" onClick={() => navigate('/')}>
        <svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Cancel & Return
      </div>

      <div className="auth-wrap">
        <h1 className="auth-h1">Identity Verification</h1>
        <div className="auth-sub">Please position your face within the frame to continue.</div>

        <div className="face-box">
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <canvas ref={canvasRef} width={640} height={480} className="hidden" />

          {/* Corners */}
          {(authStatus === 'SCANNING' || authStatus === 'PROCESSING') && (
            <>
              <div className="corner tl"></div>
              <div className="corner br"></div>
              {/* TR Corner */}
              <div style={{ position: 'absolute', top: '8px', right: '8px', width: '22px', height: '22px' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '2px', backgroundColor: 'var(--accent-lt)' }}></div>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '2px', height: '100%', backgroundColor: 'var(--accent-lt)' }}></div>
              </div>
              {/* BL Corner */}
              <div style={{ position: 'absolute', bottom: '8px', left: '8px', width: '22px', height: '22px' }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '2px', backgroundColor: 'var(--accent-lt)' }}></div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '2px', height: '100%', backgroundColor: 'var(--accent-lt)' }}></div>
              </div>
            </>
          )}

          {/* Sweeping scan line */}
          {authStatus === 'SCANNING' && <div className="scan-sweep"></div>}

          {/* Multi-face warning inline */}
          {faceCount > 1 && authStatus === 'SCANNING' && (
            <div style={{ position: 'absolute', top: '10px', background: 'rgba(239,68,68,0.8)', color: '#fff', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
              ⚠ {faceCount} faces — only 1 allowed
            </div>
          )}

          {/* Success overlay */}
          {authStatus === 'SUCCESS' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(34,197,94,0.2)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--green-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: 'bold' }}>✓</div>
            </div>
          )}

          {/* Locked overlay */}
          {authStatus === 'LOCKED' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--red-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: 'bold' }}>⊘</div>
            </div>
          )}
        </div>

        <div className="scan-title">{statusInfo.label}</div>
        <div className="scan-caption">
          {authStatus === 'SCANNING' ? 'Auto-capturing every 2 seconds' : lastError || (authStatus === 'SUCCESS' ? 'Redirecting...' : 'Hold still for a moment')}
        </div>

        <div className="prog-track">
          <div className="prog-fill" style={{ width: `${(attemptsLeft / MAX_ATTEMPTS) * 100}%` }}></div>
        </div>

        <div className="scan-row">
          <div style={{ display: 'flex', gap: '5px' }}>
            <span>{attemptsLeft}</span> attempts remaining
          </div>
          {(authStatus === 'SCANNING' || authStatus === 'PROCESSING') && (
            <div className="live-chip">
              <div className="live-dot" style={{ backgroundColor: livenessScore > 0.6 ? 'var(--green-lt)' : livenessScore > 0.3 ? 'var(--amber-lt)' : 'var(--red-lt)' }}></div>
              LIVENESS {Math.round(livenessScore * 100)}%
            </div>
          )}
        </div>

        <div className="pw-link" onClick={() => navigate('/student/login-fallback')}>Switch to Password Login</div>
      </div>
    </section>
  );
}

export default FaceRecognitionLogin;

