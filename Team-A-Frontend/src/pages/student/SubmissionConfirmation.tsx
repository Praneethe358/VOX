/**
 * SubmissionConfirmation.tsx - Post-exam submission confirmation and result summary
 *
 * Voice-enabled: Auto-reads submission summary, navigation commands.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useExamContext } from '../../context/ExamContext';
import apiService from '../../services/student/api.service';
import { useVoiceContext } from '../../context/VoiceContext';
import { useAutoSpeak } from '../../hooks/useAutoSpeak';
import { useVoiceNavigation } from '../../hooks/useVoiceNavigation';
import { VoiceListener } from '../../components/student/VoiceListener';
import { VoiceSpeaker } from '../../components/student/VoiceSpeaker';
import { VoiceCommandEngine } from '../../components/student/VoiceCommandEngine';

export function SubmissionConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state || {}) as any;
  const { exam, session } = useExamContext();
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(true);
  const { speak } = useVoiceContext();
  const [countdown, setCountdown] = useState(30);

  // ── Voice: auto-speak submission result ────────────────────────────────
  useAutoSpeak(
    () => {
      if (isSubmitting || !submissionData) return null;
      return (
        `Exam submitted successfully. ${submissionData.examTitle}. ` +
        `You answered ${submissionData.answeredQuestions} out of ${submissionData.totalQuestions} questions. ` +
        `You will be redirected to the landing page in 30 seconds.`
      );
    },
    [isSubmitting, submissionData],
    { delay: 800, rate: 0.9 },
  );

  // ── Voice: navigation ──────────────────────────────────────────────────
  const { isListening, lastCommand } = useVoiceNavigation({
    enabled: !isSubmitting,
    pageName: 'the submission confirmation page',
  });

  // ── Auto-redirect countdown ────────────────────────────────────────────
  useEffect(() => {
    if (isSubmitting) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitting, navigate]);

  useEffect(() => {
    // If navigation state was passed from ExamInterface, use it directly
    if (navState.answeredQuestions !== undefined) {
      setSubmissionData({
        examCode: navState.examCode || exam?.examCode || '',
        examTitle: navState.examTitle || exam?.title || 'Exam',
        submittedAt: new Date().toLocaleString(),
        totalQuestions: navState.totalQuestions || 0,
        answeredQuestions: navState.answeredQuestions || 0,
        markedForReview: 0,
        timeSpent: navState.timeSpent || 0,
        estimatedScore: navState.estimatedScore || 0,
        totalMarks: navState.totalMarks || navState.totalQuestions || 0,
        durationMinutes: navState.durationMinutes || exam?.durationMinutes || 60,
      });
      setIsSubmitting(false);
      return;
    }

    // Fallback: try session/exam from context
    if (!session && !exam) {
      navigate('/student/exams');
      return;
    }

    submitSession();
  }, [session, exam, navigate, navState]);

  const submitSession = async () => {
    try {
      if (!session && !exam) {
        throw new Error('Missing session or exam data');
      }

      let response: any = { data: {} };
      if (session) {
        try { response = await apiService.submitExam(session); } catch {}
      }

      const totalQuestions = exam?.sections
        ? exam.sections.reduce((sum: number, s: any) => sum + (s.questions?.length || 0), 0)
        : 0;
      const answeredQuestions = Array.isArray(session?.answers) ? session!.answers.length : 0;

      const timeSpent = session?.endTime
        ? Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000 / 60)
        : (exam?.durationMinutes || 60);

      setSubmissionData({
        examCode: exam?.examCode || '',
        examTitle: exam?.title || 'Exam',
        submittedAt: new Date().toLocaleString(),
        totalQuestions,
        answeredQuestions,
        markedForReview: 0,
        timeSpent: timeSpent,
        estimatedScore: response.data?.results?.estimatedScore ?? answeredQuestions,
        totalMarks: exam?.totalMarks || totalQuestions,
        durationMinutes: exam?.durationMinutes || 60,
      });

      setIsSubmitting(false);
    } catch (err) {
      console.error('Submission error:', err);
      setIsSubmitting(false);
    }
  };

  if (!exam && !submissionData) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (isSubmitting) {
    return (
      <section className="screen" id="s-submission">
        <div className="success-card pb-10" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="w-14 h-14 rounded-full border-2 border-accent/30 border-t-accent-lt animate-spin mx-auto mb-5" />
          <div className="sc-title">Submitting Assessment...</div>
          <div className="sc-desc">Processing your responses securely</div>
        </div>
      </section>
    );
  }

  const completionPct = submissionData ? Math.round((submissionData.answeredQuestions / Math.max(submissionData.totalQuestions, 1)) * 100) : 0;
  const durMin = submissionData?.durationMinutes || exam?.durationMinutes || 60;
  const timePct = submissionData ? Math.round((submissionData.timeSpent / durMin) * 100) : 0;

  // ► UI Fix (March 2026): Changed id from 's-success' to 's-submission'
  // This applies proper CSS centering from index.css #s-submission rule
  // Previously used non-existent 'flex-center' class causing misalignment
  return (
    <section className="screen" id="s-submission">
      {/* Voice overlays */}
      <VoiceListener isListening={isListening} mode="Navigation" position="top-right" compact />
      <VoiceSpeaker position="bottom-center" />
      <VoiceCommandEngine
        isListening={isListening}
        lastCommand={lastCommand}
        position="bottom-right"
        hints={[
          { command: '"Dashboard"', icon: '🏠', description: 'Return to dashboard' },
          { command: '"Results"', icon: '📊', description: 'View all results' },
        ]}
      />

      <motion.div 
        className="sub-modal"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Success Header */}
        <div className="sub-hdr">
          <div className="sub-icon" style={{ background: 'rgba(22,163,74,0.14)', border: '1px solid rgba(22,163,74,0.2)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '22px', height: '22px', stroke: 'var(--green-lt)' }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <div className="sub-title">Exam Submitted</div>
            <div className="sub-exam">{submissionData?.examTitle}</div>
          </div>
        </div>

        {/* Summary Grid */}
        <div className="stats-grid">
          <div className="stat-cell">
            <span className="stat-n g">{submissionData?.estimatedScore}</span>
            <span className="stat-l">Est. Score</span>
          </div>
          <div className="stat-cell">
            <span className="stat-n a">{submissionData?.timeSpent}</span>
            <span className="stat-l">Min Taken</span>
          </div>
          <div className="stat-cell">
            <span className="stat-n a">{submissionData?.answeredQuestions}</span>
            <span className="stat-l">Attempted</span>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="time-strip">
          <span className="lbl">Total Marks</span>
          <span className="val">{submissionData?.totalMarks}</span>
        </div>

        <div className="time-strip">
          <span className="lbl">Total Questions</span>
          <span className="val">{submissionData?.totalQuestions}</span>
        </div>

        {/* Completion Rate Bar */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'clamp(10px, 2vw, 11px)', color: 'var(--text-sec)', marginBottom: '8px' }}>
            <span>Completion Rate</span>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{completionPct}%</span>
          </div>
          <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--surface3)', borderRadius: '100px', overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${completionPct}%` }}
              transition={{ delay: 0.5, duration: 1 }}
              style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent-lt))', borderRadius: '100px' }}
            />
          </div>
        </div>

        {/* Action Stack */}
        <div className="action-stack">
          <button className="a-btn cfm" onClick={() => navigate('/')}>
            Return to Dashboard
          </button>
          <button className="a-btn ret" onClick={() => navigate('/student/exams')}>
            Take Another Exam
          </button>
        </div>

        {/* Auto-redirect Timer */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', marginTop: '12px', fontSize: 'clamp(10px, 2vw, 11px)', color: 'var(--text-muted)' }}>
          <div style={{ width: '14px', height: '14px', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <span>Redirecting in <strong style={{ color: 'var(--text)' }}>{countdown}s</strong></span>
        </div>
      </motion.div>
    </section>
  );
}

export default SubmissionConfirmation;
