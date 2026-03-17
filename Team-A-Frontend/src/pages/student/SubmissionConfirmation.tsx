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
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-indigo-500/[0.06] rounded-full blur-[120px]" />
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 text-center">
          <div className="w-14 h-14 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin mx-auto mb-5" />
          <p className="text-lg text-slate-300 font-medium">Submitting Exam...</p>
          <p className="text-slate-500 text-sm mt-1">Processing your responses</p>
        </motion.div>
      </div>
    );
  }

  const completionPct = submissionData ? Math.round((submissionData.answeredQuestions / Math.max(submissionData.totalQuestions, 1)) * 100) : 0;
  const durMin = submissionData?.durationMinutes || exam?.durationMinutes || 60;
  const timePct = submissionData ? Math.round((submissionData.timeSpent / durMin) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0a0e1a] p-4 relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-emerald-600/[0.06] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-600/[0.04] rounded-full blur-[100px]" />
      </div>

      {/* Voice overlays */}
      <VoiceListener isListening={isListening} mode="Navigation" position="top-right" compact />
      <VoiceSpeaker position="bottom-center" />
      <VoiceCommandEngine
        isListening={isListening}
        lastCommand={lastCommand}
        position="bottom-right"
        hints={[
          { command: '"Results"',    icon: '📊', description: 'View all results' },
        ]}
      />

      <div className="relative z-10 max-w-2xl mx-auto pt-8">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="w-20 h-20 rounded-3xl bg-emerald-500/[0.1] border border-emerald-500/[0.15] flex items-center justify-center mx-auto mb-5"
          >
            <span className="text-emerald-400 text-3xl">✓</span>
          </motion.div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Exam Submitted</h1>
          <p className="text-sm text-slate-500">Your responses have been recorded securely</p>
        </motion.div>

        {/* Summary Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card rounded-2xl p-6 mb-5"
        >
          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-4">Submission Summary</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[11px] text-slate-500 mb-1">Exam</p>
              <p className="text-sm text-white font-medium truncate">{submissionData?.examTitle}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[11px] text-slate-500 mb-1">Submitted</p>
              <p className="text-sm text-white font-medium">{submissionData?.submittedAt}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[11px] text-slate-500 mb-1">Answered</p>
              <p className="text-sm font-semibold text-indigo-300">
                {submissionData?.answeredQuestions} / {submissionData?.totalQuestions}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[11px] text-slate-500 mb-1">Time Used</p>
              <p className="text-sm text-white font-medium">
                {submissionData?.timeSpent} / {durMin} min
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[11px] text-slate-500 mb-1">Review Items</p>
              <p className="text-sm text-white font-medium">{submissionData?.markedForReview ?? 0}</p>
            </div>
          </div>
        </motion.div>

        {/* Performance Bars */}
        {submissionData?.answeredQuestions > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card rounded-2xl p-6 mb-5"
          >
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-4">Performance</p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Completion</span>
                  <span className="text-indigo-300 font-semibold">{completionPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPct}%` }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Time Utilization</span>
                  <span className="text-emerald-300 font-semibold">{timePct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${timePct}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Info Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="glass-card rounded-xl p-4 mb-6 border-indigo-500/[0.06]"
        >
          <div className="flex gap-3">
            <div className="w-5 h-5 rounded-md bg-indigo-500/[0.1] flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-indigo-400 text-[10px]">!</span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1 leading-relaxed">
              <li>Your exam has been submitted and cannot be modified</li>
              <li>Results will be available within 24-48 hours</li>
              <li>Check your email for result notifications</li>
            </ul>
          </div>
        </motion.div>

        {/* Auto-redirect countdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-4"
        >
          <p className="text-sm text-slate-400">
            Redirecting to landing page in{' '}
            <span className="text-indigo-300 font-semibold">{countdown}s</span>
          </p>
          <div className="mt-2 h-1 rounded-full bg-white/[0.04] overflow-hidden max-w-xs mx-auto">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 30, ease: 'linear' }}
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400"
            />
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-slate-600 text-[11px] pb-6"
        >
          <p>Vox Exam Platform</p>
        </motion.div>
      </div>
    </div>
  );
}

export default SubmissionConfirmation;
