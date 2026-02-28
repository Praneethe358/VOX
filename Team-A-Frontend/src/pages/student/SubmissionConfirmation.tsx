/**
 * SubmissionConfirmation.tsx - Post-exam submission confirmation and result summary
 *
 * Voice-enabled: Auto-reads submission summary, navigation commands.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { exam, session } = useExamContext();
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(true);
  const { speak } = useVoiceContext();

  // ── Voice: auto-speak submission result ────────────────────────────────
  useAutoSpeak(
    () => {
      if (isSubmitting || !submissionData) return null;
      return (
        `Exam submitted successfully. ${submissionData.examTitle}. ` +
        `You answered ${submissionData.answeredQuestions} out of ${submissionData.totalQuestions} questions. ` +
        `Estimated score: ${submissionData.estimatedScore} out of ${submissionData.totalMarks}. ` +
        `Say "dashboard" to go back, or "take exam" for another exam.`
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

  useEffect(() => {
    if (!session || !exam) {
      navigate('/student/exams');
      return;
    }

    submitSession();
  }, [session, exam, navigate]);

  const submitSession = async () => {
    try {
      if (!session || !exam) {
        throw new Error('Missing session or exam data');
      }

      const response = await apiService.submitExam(session);

      const totalQuestions = exam.sections.reduce((sum: number, s: any) => sum + s.questions.length, 0);
      const answeredQuestions = Array.isArray(session.answers) ? session.answers.length : 0;

      const timeSpent = session.endTime
        ? Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000 / 60)
        : exam.durationMinutes;

      setSubmissionData({
        examCode: exam.examCode,
        examTitle: exam.title,
        submittedAt: new Date().toLocaleString(),
        totalQuestions,
        answeredQuestions,
        markedForReview: 0,
        timeSpent: timeSpent,
        estimatedScore: response.data?.results?.estimatedScore ?? answeredQuestions * (exam.totalMarks / Math.max(totalQuestions, 1)),
        totalMarks: exam.totalMarks,
      });

      setIsSubmitting(false);
    } catch (err) {
      console.error('Submission error:', err);
      setIsSubmitting(false);
    }
  };

  if (!exam) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-xl text-slate-300 font-semibold">Submitting Exam...</p>
          <p className="text-slate-400 text-sm mt-2">Please wait while we process your responses</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4">
      {/* Voice UI overlays */}
      <VoiceListener isListening={isListening} mode="Navigation" position="top-right" compact />
      <VoiceSpeaker position="bottom-center" />
      <VoiceCommandEngine
        isListening={isListening}
        lastCommand={lastCommand}
        position="bottom-right"
        hints={[
          { command: '"Dashboard"',  icon: '🏠', description: 'Go to dashboard' },
          { command: '"Take exam"',  icon: '📝', description: 'Browse more exams' },
          { command: '"Results"',    icon: '📊', description: 'View all results' },
        ]}
      />
      <div className="max-w-2xl mx-auto">
        {/* Success Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg p-6 text-center mb-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-5xl mb-3"
          >
            ✓
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Exam Submitted Successfully!</h1>
          <p className="text-green-100">Your responses have been recorded and saved securely</p>
        </motion.div>

        {/* Submission Details */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6 space-y-4"
        >
          <h2 className="text-xl font-bold text-white mb-4">Submission Summary</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 rounded p-4">
              <p className="text-slate-400 text-sm mb-1">Exam</p>
              <p className="text-white font-semibold">{submissionData?.examTitle}</p>
            </div>

            <div className="bg-slate-900/50 rounded p-4">
              <p className="text-slate-400 text-sm mb-1">Submitted</p>
              <p className="text-white font-semibold">{submissionData?.submittedAt}</p>
            </div>

            <div className="bg-slate-900/50 rounded p-4">
              <p className="text-slate-400 text-sm mb-1">Questions Answered</p>
              <p className="text-indigo-400 font-semibold">
                {submissionData?.answeredQuestions}/{submissionData?.totalQuestions}
              </p>
            </div>

            <div className="bg-slate-900/50 rounded p-4">
              <p className="text-slate-400 text-sm mb-1">Marked for Review</p>
              <p className="text-yellow-400 font-semibold">
                {submissionData?.markedForReview}
              </p>
            </div>

            <div className="bg-slate-900/50 rounded p-4">
              <p className="text-slate-400 text-sm mb-1">Time Spent</p>
              <p className="text-white font-semibold">
                {submissionData?.timeSpent} out of {exam.durationMinutes} minutes
              </p>
            </div>

            <div className="bg-slate-900/50 rounded p-4">
              <p className="text-slate-400 text-sm mb-1">Estimated Score</p>
              <p className="text-green-400 font-semibold">
                {submissionData?.estimatedScore}/{submissionData?.totalMarks}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Answer Review */}
        {submissionData?.answeredQuestions > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6"
          >
            <h3 className="text-lg font-bold text-white mb-4">Your Performance</h3>

            <div className="space-y-3">
              {/* Answer Completion */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">Questions Answered</span>
                  <span className="text-indigo-400 font-semibold">
                    {Math.round((submissionData?.answeredQuestions / submissionData?.totalQuestions) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${(submissionData?.answeredQuestions / submissionData?.totalQuestions) * 100}%`
                    }}
                  />
                </div>
              </div>

              {/* Time Efficiency */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">Time Utilization</span>
                  <span className="text-green-400 font-semibold">
                    {Math.round((submissionData?.timeSpent / exam.durationMinutes) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${(submissionData?.timeSpent / exam.durationMinutes) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Important Notes */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6"
        >
          <p className="text-sm text-blue-400 mb-2">
            <strong>📌 Important Notes:</strong>
          </p>
          <ul className="text-sm text-blue-300 space-y-1">
            <li>• Your exam has been submitted and cannot be modified</li>
            <li>• Results will be available within 24-48 hours</li>
            <li>• Check your email for result notifications</li>
            <li>• Contact support if you have any concerns</li>
          </ul>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/student/dashboard')}
            className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
          >
            Back to Dashboard
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/student/exams')}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-colors"
          >
            View All Exams
          </motion.button>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-slate-400 text-sm"
        >
          <p>Thank you for using VoiceSecure Exam Platform</p>
          <p className="mt-1">Reference ID: {submissionData?.examId}</p>
        </motion.div>
      </div>
    </div>
  );
}

export default SubmissionConfirmation;
